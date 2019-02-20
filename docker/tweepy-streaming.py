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

TWITTER_KEY = os.getenv('TWITTER_KEY')
TWITTER_SECRET = os.getenv('TWITTER_SECRET')
TWITTER_TOKEN = os.getenv('TWITTER_TOKEN')
TWITTER_TOKEN_SECRET = os.getenv('TWITTER_TOKEN_SECRET')

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

        print(decoded["text"])

        analysis = TextBlob(decoded['text'])

        decoded['polarity'] = analysis.sentiment[0]

        for ws in self.sockets:
            gevent.spawn(self.send, ws, decoded)
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
