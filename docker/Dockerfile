FROM python:3.6

RUN pip install tweepy gevent-websocket textblob shapely

ENV PORT 10001

ADD tweepy-streaming.py /

ADD nyc-borough-processed.geojson /

CMD [ "python", "./tweepy-streaming.py" ]
