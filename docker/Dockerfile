FROM google/cloud-sdk:slim

#Install python pakages
RUN pip install tweepy gevent-websocket textblob shapely pytz

#Install nginx
RUN apt-get update && apt-get install -y nginx

#Add files
ADD tweepy-streaming.py /
ADD nyc-borough-processed.geojson /

#Create directory for data
RUN mkdir /data

# Change nginx configuration
RUN rm -v /etc/nginx/nginx.conf
ADD nginx.conf /etc/nginx/

#Open ports
ENV PORT 10001
ENV PORT 90

CMD service nginx start && python ./tweepy-streaming.py
