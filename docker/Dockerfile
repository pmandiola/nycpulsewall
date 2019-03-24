FROM python:3.6

#Install cron
RUN apt-get update && apt-get -y install cron

#Install python pakages
RUN pip install tweepy gevent-websocket textblob shapely pytz

#Open port for websocket
ENV PORT 10001

#Add files
ADD tweepy-streaming.py /
ADD nyc-borough-processed.geojson /
ADD save-tweets-file.sh /
ADD tweets-crontab /etc/cron.d/

#Create directory for data
RUN mkdir /data

# Apply cron job
RUN crontab /etc/cron.d/tweets-crontab

CMD [ "python", "./tweepy-streaming.py" ]
