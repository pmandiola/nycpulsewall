FROM python:3.6

#Install python pakages
RUN pip install tweepy gevent-websocket textblob shapely pytz

#Open port for websocket
ENV PORT 10001

#Add files
ADD tweepy-streaming.py /
ADD nyc-borough-processed.geojson /

#Create directory for data
RUN mkdir /data

CMD [ "python", "./tweepy-streaming.py" ]
