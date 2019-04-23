FROM google/cloud-sdk:slim

#Install nginx & cron
RUN apt-get update && apt-get install -y python3 python3-pip nginx cron

#Install python pakages
RUN pip3 install numpy tweepy gevent-websocket textblob shapely pytz

#Add files
ADD tweepy-streaming.py /
ADD nyc-borough-processed.geojson /
ADD save-tweet-files.sh /
ADD tweets-crontab /etc/cron.d/

#Create directory for data
RUN mkdir /data

# Change nginx configuration
RUN rm -v /etc/nginx/nginx.conf
ADD nginx.conf /etc/nginx/

# Apply cron job
RUN crontab /etc/cron.d/tweets-crontab

#Open ports
ENV PORT 10001
ENV PORT 90

#Start nginx and run python script
CMD service nginx start && python3 ./tweepy-streaming.py
