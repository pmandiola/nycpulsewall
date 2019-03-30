# Based on https://stackoverflow.com/a/27884633

import os
import logging

import gevent
import gevent.monkey
gevent.monkey.patch_all()

from geventwebsocket.handler import WebSocketHandler
from gevent import pywsgi

import tweepy
from textblob import TextBlob
import json
from datetime import datetime, timedelta
from pytz import timezone

import random
from shapely.geometry import shape, mapping, Point
from shapely.affinity import affine_transform

# Twitter keys from Env Vars
TWITTER_KEY = os.getenv('TWITTER_KEY')
TWITTER_SECRET = os.getenv('TWITTER_SECRET')
TWITTER_TOKEN = os.getenv('TWITTER_TOKEN')
TWITTER_TOKEN_SECRET = os.getenv('TWITTER_TOKEN_SECRET')

# Logging config
logging.basicConfig(filename='/data/tweepy-streaming.log',
                    format='%(asctime)s %(message)s',
                    datefmt='%Y-%m-%d %H:%M:%S')

with open('nyc-borough-processed.geojson') as json_file:
    nyc_boroughs = json.load(json_file)

for boro in nyc_boroughs['features']:
    boro['geometry'] = shape(boro['geometry'])


def random_point_in_polygon(transforms, areas):
    transform = random.choices(transforms, weights=areas)
    x, y = [random.random() for _ in range(2)]
    if x + y > 1:
        p = Point(1 - x, 1 - y)
    else:
        p = Point(x, y)
    return affine_transform(p, transform[0])


def random_point_in_box(box):
    minx, miny, maxx, maxy = box.bounds
    center = box.centroid
    return Point(random.triangular(minx, maxx, center.x),
                 random.triangular(miny, maxy, center.y))


def which_borough(point):
    for boro in nyc_boroughs['features']:
        if boro['geometry'].intersects(point):
            return boro['properties']['boro_name']
    return False


def process_coordinates(tweet):

    boro_list = ['Manhattan', 'Brooklyn', 'Bronx', 'Queens', 'Staten Island']
    nyc_ids = ['27485069891a7938', '94965b2c45386f87']
    tweet['coords_source'] = 'Randomized'

    if tweet['coordinates']:
        # Check if inside NYC
        coords = shape(tweet['coordinates'])
        boro_name = which_borough(coords)
        if boro_name:
            tweet['coords_source'] = 'Origin'
            tweet['coordinates'] = mapping(coords)
            tweet['borough'] = boro_name
        else:
            tweet['coords_source'] = False

    elif tweet['place']['place_type'] == 'poi':
        # Point of interest.
        coords = random_point_in_box(shape(tweet['place']['bounding_box']))
        boro_name = which_borough(coords)
        if boro_name:
            tweet['coordinates'] = mapping(coords)
            tweet['borough'] = boro_name
        else:
            tweet['coords_source'] = False

    elif (tweet['place']['place_type'] == 'neighborhood') & \
            any(tweet['place']['full_name'].endswith(boro)
                for boro in boro_list):
        # Place is a neigborhood in a NYC borough.
        # Full name is [Neigborhood], [City (Borough)]
        boro_name = tweet['place']['full_name'].split(', ')[-1]
        boro = list(filter(lambda x: x['properties']['boro_name'] == boro_name,
                    nyc_boroughs['features']))[0]
        tweet['coordinates'] = mapping(
            random_point_in_polygon(boro['transforms'], boro['areas']))
        tweet['borough'] = boro_name

    elif (tweet['place']['place_type'] == 'city') & \
            (tweet['place']['name'] in boro_list):
        # Place is a NYC borough
        boro = list(filter(
            lambda x: x['properties']['boro_name'] == tweet['place']['name'],
            nyc_boroughs['features']))[0]
        tweet['coordinates'] = mapping(
            random_point_in_polygon(boro['transforms'], boro['areas']))
        tweet['borough'] = tweet['place']['name']

    elif (tweet['place']['place_type'] == 'admin') & \
            (tweet['place']['id'] in nyc_ids):
        # Place is NYC
        b = random.randint(0, 4)
        boro = nyc_boroughs['features'][b]
        tweet['coordinates'] = mapping(
            random_point_in_polygon(boro['transforms'], boro['areas']))
        tweet['borough'] = boro['properties']['boro_name']

    else:
        tweet['coords_source'] = False

    return tweet


class NYCStreamListener(tweepy.StreamListener):
    def __init__(self):
        self.retry_attempt = 0
        self.sockets = []
        self.filtered_keys = ['created_at',
                              'id_str',
                              'text',
                              'coordinates',
                              'place',
                              'entities',
                              'lang',
                              'source',
                              'polarity',
                              'borough',
                              'coords_source']
        self.date_fmt = '%a %b %d %H:%M:%S %z %Y'
        auth = tweepy.OAuthHandler(TWITTER_KEY, TWITTER_SECRET)
        auth.set_access_token(TWITTER_TOKEN, TWITTER_TOKEN_SECRET)
        self.api = tweepy.API(auth)
        self.stream = tweepy.Stream(self.api.auth, self)
        self.start()

    def initialize_socket(self, ws, days):

        now = datetime.now()
        for d in range(days, -1, -1):
            date = datetime.strftime(now - timedelta(d), '%Y-%m-%d')
            fileName = 'tweets_' + date + '.json'

            if(os.path.isfile('/data/' + fileName)):
                print('Sending ' + fileName)
                with open('/data/' + fileName, 'r') as tf:

                    for line in tf:
                        decoded = json.loads(line)

                        # Don't send tweets before current time only the first day
                        created_at = datetime.strptime(decoded['created_at'], self.date_fmt)
                        if (days == d) & (created_at.time() > now.time()):
                            continue
                        
                        # Filter tweet data to send only what we need
                        filtered = {key: decoded.get(key, None)
                                    for key in self.filtered_keys}
                        filtered['historical'] = True

                        # Send tweet to socket
                        ws.send(json.dumps(filtered))
        
        self.add_socket(ws)

    def add_socket(self, ws):
        print('Websocket added')
        self.sockets.append(ws)

    def remove_socket(self, ws):
        self.sockets.remove(ws)

    def run(self):
        print("Run")
        try:
            self.stream.filter(locations=[-74.05, 40.54, -73.7, 40.92])
        except Exception as e:
            logging.warning('Stream error: ' + str(e), exc_info=True)
            self.stream.disconnect()
            gevent.sleep(5)
            self.start()

    def start(self):
        print("Start")
        gevent.spawn(self.run)

    def stop(self):
        print("Stop")
        self.stream.disconnect()

    def send(self, ws, data):
        try:
            ws.send(json.dumps(data))
        except Exception as e:
            print("Exception", str(e))
            # the web socket died..
            self.remove_socket(ws)

    def on_data(self, data):

        try:
            decoded = json.loads(data)
        except Exception as e:
            logging.warning('Decoding error: ' + str(e), exc_info=True)
            return True

        try:
            # Process coordinates
            decoded = process_coordinates(decoded)
        except Exception as e:
            logging.warning('Process coords error: ' + str(e),
                            exc_info=True)
            return True

        if (decoded['coords_source']):
            print(decoded['text'])

            try:
                # Sentiment analysis
                analysis = TextBlob(decoded['text'])
                decoded['polarity'] = analysis.sentiment[0]
            except Exception as e:
                logging.warning('Sentiment analysis error: ' + str(e),
                                exc_info=True)
                return True

            try:
                # Transform created_at to local time
                created_at = datetime.strptime(decoded['created_at'], self.date_fmt)
                created_at = created_at.astimezone(timezone('US/Eastern'))
                decoded['created_at'] = created_at.strftime(self.date_fmt)
            except Exception as e:
                logging.warning('Datetime error: ' + str(e),
                                exc_info=True)
                return True

            try:
                # Filter tweet data to send only what we need
                filtered = {key: decoded.get(key, None)
                            for key in self.filtered_keys}
            except Exception as e:
                logging.warning('Dict filter error: ' + str(e), exc_info=True)
                return True

            try:
                # Send tweet to connected sockets
                for ws in self.sockets:
                    gevent.spawn(self.send, ws, filtered)
            except Exception as e:
                logging.warning('Send data error: ' + str(e), exc_info=True)
                return True

            try:
                # Save tweet to file
                fileName = 'tweets_' + created_at.strftime('%Y-%m-%d') \
                             + '.json'
                with open('/data/' + fileName, 'a+') as tf:
                    json.dump(decoded, tf)
                    tf.write('\n')
            except Exception as e:
                logging.warning('Save file error: ' + str(e), exc_info=True)
                return True
        else:
            if decoded['place']:
                print('DISCARDED: {} not in NYC'.format(
                        decoded['place']['full_name']))
            else:
                print('DISCARDED: place is empty')
        return True

    def on_connect(self):
        # reset retries
        self.retry_attempt = 0

    def on_error(self, status_code):
        print("Error", str(status_code))
        if status_code == 420:
            s = 60
        else:
            s = 5

        # Wait exponentially longer
        logging.warning('Error {}: waiting {} seconds to reconnect'.format(
            str(status_code), s*2**self.retry_attempt))
        gevent.sleep(s*2**self.retry_attempt)

        return True

    def on_timeout(self):
        print("Tweepy timeout.. wait 30 seconds")
        gevent.sleep(30)


stream_listener = NYCStreamListener()


def app(environ, start_response):

    if (type(environ) is dict) and ('wsgi.websocket' in environ):
        ws = environ['wsgi.websocket']
        days = min(int(environ['QUERY_STRING']) if environ['QUERY_STRING'] else 1, 7)
        stream_listener.initialize_socket(ws, days)
        while not ws.closed:
            gevent.sleep(0.1)
        else:
            stream_listener.remove_socket(ws)
    else:
        start_response('200 OK', [('Content-Type', 'text/html')])
        return [b"<b>alive!</b>"]


server = pywsgi.WSGIServer(('', 10001), app, handler_class=WebSocketHandler)
server.serve_forever()
