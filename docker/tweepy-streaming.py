#Based on https://stackoverflow.com/a/27884633

import os

import gevent
import gevent.monkey
gevent.monkey.patch_all()

from geventwebsocket.handler import WebSocketHandler
from gevent import pywsgi

import tweepy
from textblob import TextBlob
import json

import random
from shapely.geometry import shape, mapping, Point
from shapely.affinity import affine_transform

TWITTER_KEY = os.getenv('TWITTER_KEY')
TWITTER_SECRET = os.getenv('TWITTER_SECRET')
TWITTER_TOKEN = os.getenv('TWITTER_TOKEN')
TWITTER_TOKEN_SECRET = os.getenv('TWITTER_TOKEN_SECRET')

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
    return Point(random.triangular(minx, maxx, center.x), random.triangular(miny, maxy, center.y))

def which_borough(point):
    for boro in nyc_boroughs['features']:
        if boro['geometry'].intersects(point):
            return boro['properties']['boro_name']
    return False
    
def process_coordinates(tweet):
    
    boro_list = ['Manhattan', 'Brooklyn', 'Bronxs', 'Queens', 'Staten Island']
    nyc_ids = ['27485069891a7938','94965b2c45386f87']
    tweet['coords_source'] = 'Randomized'
        
    if tweet['coordinates']:
        #Check if inside NYC
        coords = shape(tweet['coordinates'])
        boro_name = which_borough(coords)
        if boro_name:
            tweet['coords_source'] = 'Origin'
            tweet['coordinates'] = mapping(coords)
            tweet['borough'] = boro_name
        else: 
            tweet['coords_source'] = False    
            
    elif tweet['place']['place_type'] == 'poi':
        #Point of interest.
        coords = random_point_in_box(shape(tweet['place']['bounding_box']))
        boro_name = which_borough(coords)
        if boro_name:
            tweet['coordinates'] = mapping(coords)
            tweet['borough'] = boro_name
        else: 
            tweet['coords_source'] = False
        
    elif (tweet['place']['place_type'] == 'neighborhood') & any(tweet['place']['full_name'].endswith(boro) for boro in boro_list):
        #Place is a neigborhood in a NYC borough. Full name is [Neigborhood], [City (Borough)]
        boro_name = tweet['place']['full_name'].split(', ')[-1]
        boro = list(filter(lambda x: x['properties']['boro_name'] == boro_name, nyc_boroughs['features']))[0]        
        tweet['coordinates'] = mapping(random_point_in_polygon(boro['transforms'], boro['areas']))
        tweet['borough'] = boro_name
        
    elif (tweet['place']['place_type'] == 'city') & (tweet['place']['name'] in boro_list):
        #Place is a NYC borough
        boro = list(filter(lambda x: x['properties']['boro_name'] == tweet['place']['name'], nyc_boroughs['features']))[0]
        tweet['coordinates'] = mapping(random_point_in_polygon(boro['transforms'], boro['areas']))
        tweet['borough'] = tweet['place']['name']
        
    elif (tweet['place']['place_type'] == 'admin') & (tweet['place']['id'] in nyc_ids):
        #Place is NYC
        b = random.randint(0,4)
        boro = nyc_boroughs['features'][b]
        tweet['coordinates'] = mapping(random_point_in_polygon(boro['transforms'], boro['areas']))
        tweet['borough'] = boro['properties']['boro_name']
        
    else:
        tweet['coords_source'] = False
        
    return tweet


class MyStreamListener(tweepy.StreamListener):
    def __init__(self):
        self.sockets = []
        auth = tweepy.OAuthHandler(TWITTER_KEY, TWITTER_SECRET)
        auth.set_access_token(TWITTER_TOKEN, TWITTER_TOKEN_SECRET)
        self.api = tweepy.API(auth)
        self.stream = tweepy.Stream(self.api.auth, self)

    def add_socket(self, ws):
        self.sockets.append(ws)

        if (not self.stream.running):
            self.start()

    def remove_socket(self, ws):
        self.sockets.remove(ws)

        if (len(self.sockets) == 0):
            self.stop()

    def run(self):
        print("Run")
        try:
            self.stream.filter(locations=[-74.05,40.54,-73.7,40.92])
        except Exception as e:
            print("Exception", str(e))
            self.stream.disconnect()

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
            # the web socket die..
            self.remove_socket(ws)

    def on_data(self, data):

        decoded = json.loads(data)
        
        decoded = process_coordinates(decoded)
        if (decoded['coords_source']):
            print(decoded['text'])

            analysis = TextBlob(decoded['text'])

            decoded['polarity'] = analysis.sentiment[0]

            for ws in self.sockets:
                gevent.spawn(self.send, ws, decoded)
        else:
            print('DISCARDED: {} not in NYC'.format(decoded['place']['full_name']))
        return True

    def on_error(self, status):
        print ("Error", status)

    def on_timeout(self):
        print ("Tweepy timeout.. wait 30 seconds")
        gevent.sleep(30)

stream_listener = MyStreamListener()

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

server = pywsgi.WSGIServer(('', 10001), app, handler_class=WebSocketHandler)
server.serve_forever()
