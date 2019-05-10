# Based on https://stackoverflow.com/a/27884633

import os
import logging

import gevent
import gevent.monkey
gevent.monkey.patch_all()

from geventwebsocket.handler import WebSocketHandler
from gevent import pywsgi

import tweepy
from textblob import TextBlob, Word

from gensim.utils import simple_preprocess
import spacy
from nltk.corpus import stopwords

import json
import csv

from datetime import datetime, timedelta
from pytz import timezone

import random
from shapely.geometry import shape, mapping, Point, Polygon
from shapely.affinity import affine_transform


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


def process_coordinates(tweet, bbox):

    boro_list = ['Manhattan', 'Brooklyn', 'Queens']

    tweet['coords_source'] = 'Randomized'

    if tweet['coordinates']:

        coords = shape(tweet['coordinates'])
        tweet['coords_source'] = 'Origin'

    elif (tweet['place']['place_type'] == 'poi') or \
        (tweet['place']['place_type'] == 'neighborhood'):

        coords = random_point_in_box(shape(tweet['place']['bounding_box']))
        tweet['coords_source'] = 'Place'

    elif (tweet['place']['place_type'] == 'city') & \
            (tweet['place']['name'] in boro_list):

        boro = list(filter(
            lambda x: x['properties']['boro_name'] == tweet['place']['name'],
            nyc_boroughs['features']))[0]
        coords = random_point_in_polygon(boro['transforms'], boro['areas'])

    else:
        transforms = [transform for feature in nyc_boroughs['features'] for transform in feature['transforms']]
        areas = [area for feature in nyc_boroughs['features'] for area in feature['areas']]
        coords = random_point_in_polygon(transforms, areas)

    if bbox.contains(coords):
        tweet['coordinates'] = mapping(coords)
    else:
        tweet['coords_source'] = False

    return tweet


def get_lemma(tweet):
    
    text = tweet['text'] if not tweet['truncated'] else tweet['extended_tweet']['full_text']
    entities = tweet['entities'] if not tweet['truncated'] else tweet['extended_tweet']['entities']
    
    hashtags = ['#'+x['text'].lower() for x in entities['hashtags']]
    user_mentions = ['@'+x['screen_name'].lower() for x in entities['user_mentions']]
    urls = [x['url'].lower() for x in entities['urls']]
    
    if 'media' in entities:
        media = [x['url'].lower() for x in entities['media']]
        all_entities = hashtags + user_mentions + urls + media
    else:
        all_entities = hashtags + user_mentions + urls
    
    #Remove entities
    clean_text = ' '.join([x for x in text.split() if x.lower() not in all_entities])
    
    #Preprocess
    clean_text = simple_preprocess(clean_text)
    
    #Remove stop words
    clean_text = [word for word in clean_text if word not in stop_words]

    # Parse the sentence using the loaded 'en' model object `nlp`. Extract the lemma for each token and join
    clean_text = nlp(' '.join(clean_text))
    clean_text = {token.lemma_ for token in clean_text if token.pos_ in allowed_postags}
    
    #Remove stop words again
    clean_text = [word for word in clean_text if word not in stop_words]
    
    return clean_text


class NYCStreamListener(tweepy.StreamListener):
    def __init__(self, locations):

        self.locations = locations
        self.bbox = Polygon([(locations[0], locations[1]),
                             (locations[0], locations[3]),
                             (locations[2], locations[3]),
                             (locations[2], locations[1])
                             ])

        self.retry_attempt = 0
        self.sockets = []

        self.date_fmt = '%a %b %d %H:%M:%S %z %Y'
        self.reload_spacy = True

        auth = tweepy.OAuthHandler(TWITTER_KEY, TWITTER_SECRET)
        auth.set_access_token(TWITTER_TOKEN, TWITTER_TOKEN_SECRET)
        self.api = tweepy.API(auth)
        self.stream = tweepy.Stream(self.api.auth, self)
        self.start()

    def add_socket(self, ws):
        print('Websocket added')
        self.sockets.append(ws)

    def remove_socket(self, ws):
        if ws in self.sockets:
            self.sockets.remove(ws)

    def run(self):
        print("Run")
        try:
            self.stream.filter(locations=self.locations)
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
            decoded = process_coordinates(decoded, self.bbox)
        except Exception as e:
            logging.warning('Process coords error: ' + str(e),
                            exc_info=True)
            return True

        if (decoded['coords_source']):

            full_text = decoded['text'] if not decoded['truncated'] else decoded['extended_tweet']['full_text']

            try:
                # Sentiment analysis
                analysis = TextBlob(full_text)
                decoded['polarity'] = analysis.sentiment[0]
            except Exception as e:
                logging.warning('Sentiment analysis error: ' + str(e),
                                exc_info=True)
                return True

            try:
                # Lemmatization
                lemma = get_lemma(decoded)
                decoded['lemma'] = lemma
            except Exception as e:
                logging.warning('Lemmatization error: ' + str(e),
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
                filter_keys = ['created_at',
                                 'id_str',
                                 'polarity',
                                 'borough',
                                 'coords_source',
                                 'lemma']

                smallTweet =  {key: decoded.get(key, None) for key in filter_keys}

                smallTweet['hashtags'] = ['#'+x['text'].lower() for x in decoded['entities']['hashtags']]
                smallTweet['user_mentions'] = ['@'+x['screen_name'] for x in decoded['entities']['user_mentions']]
                smallTweet['longitude'] = decoded['coordinates']['coordinates'][0]
                smallTweet['latitude'] = decoded['coordinates']['coordinates'][1]
                smallTweet['text'] = decoded['text']
                
            except Exception as e:
                logging.warning('Dict filter error: ' + str(e), exc_info=True)
                return True

            try:
                # Send tweet to connected sockets
                for ws in self.sockets:
                    gevent.spawn(self.send, ws, smallTweet)
            except Exception as e:
                logging.warning('Send data error: ' + str(e), exc_info=True)
                return True

            try:
                # Save full tweet to json file
                # fileName = 'tweets_' + created_at.strftime('%Y-%m-%d') \
                #              + '.json'
                # with open('/data/' + fileName, 'a+') as tf:
                #     json.dump(decoded, tf)
                #     tf.write('\n')
                
                # Save filtered tweet to csv file
                fileName = 'tweets-filtered_' + created_at.strftime('%Y-%m-%d') \
                             + '.csv'
                file_exists = os.path.isfile('/data/' + fileName)
                with open('/data/' + fileName, 'a+') as tf:
                    w = csv.DictWriter(tf, fieldnames=smallTweet.keys())

                    if not file_exists:
                        w.writeheader()

                    w.writerow(smallTweet)   

            except Exception as e:
                logging.warning('Save file error: ' + str(e), exc_info=True)
                return True

            # Reload spacy once a day to avoid memory issue
            if self.reload_spacy and (datetime.now(timezone('US/Eastern')).hour == 3):
                print("Reloading spacy!")
                nlp = spacy.load('en', disable=['parser', 'ner'])
                self.reload_spacy = False
            elif (not self.reload_spacy) and (datetime.now(timezone('US/Eastern')).hour == 0):
                self.reload_spacy = True

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


def app(environ, start_response):

    if (type(environ) is dict) and ('wsgi.websocket' in environ):
        ws = environ['wsgi.websocket']
        stream_listener.add_socket(ws)
        while not ws.closed:
            gevent.sleep(0.1)
        else:
            stream_listener.remove_socket(ws)
    else:
        start_response('200 OK', [('Content-Type', 'text/html')])
        return [b"<b>alive!</b>"]


if __name__ == '__main__':

    # Twitter keys from Env Vars
    TWITTER_KEY = os.getenv('TWITTER_KEY')
    TWITTER_SECRET = os.getenv('TWITTER_SECRET')
    TWITTER_TOKEN = os.getenv('TWITTER_TOKEN')
    TWITTER_TOKEN_SECRET = os.getenv('TWITTER_TOKEN_SECRET')

    # Logging config
    logging.basicConfig(filename='/data/tweepy-streaming.log',
                        format='%(asctime)s %(message)s',
                        datefmt='%Y-%m-%d %H:%M:%S')

    # Load geofile
    with open('nyc-zoomed-processed.geojson') as json_file:
        nyc_boroughs = json.load(json_file)

    for boro in nyc_boroughs['features']:
        boro['geometry'] = shape(boro['geometry'])

    # Load ntlk stopwords
    stop_words = stopwords.words('english')
    stop_words.extend(['com', 'from', 'subject', 're', 'edu', 'use',
                    'not', 'would', 'say', 'could', '_', 'be', 'know',
                    'good', 'go', 'get', 'do', 'done', 'try', 'many',
                    'some', 'nice', 'thank', 'think', 'see', 'rather',
                    'easy', 'easily', 'lot', 'lack', 'make', 'want',
                    'seem', 'run', 'need', 'even', 'right', 'line',
                    'even', 'also', 'may', 'take', 'come',
                    'new', 'york', 'ny', 'nyc', 'amp'])

    # Load spacy en lang
    nlp = spacy.load('en', disable=['parser', 'ner'])
    allowed_postags=['NOUN', 'ADJ', 'VERB', 'ADV']
    
    # Start server
    stream_listener = NYCStreamListener(locations=[-74.02, 40.68, -73.93, 40.78])
    server = pywsgi.WSGIServer(('', 10001), app, handler_class=WebSocketHandler)
    server.serve_forever()
