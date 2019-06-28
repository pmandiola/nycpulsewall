FROM python:3.6

#Install nginx
RUN apt-get update && apt-get -y install nginx

#Install python pakages
RUN pip install tweepy \
    gevent-websocket \
    textblob \
    shapely \
    pytz \
    gensim \
    spacy \
    nltk

#Download nltk stopwords and spacy en lang
RUN python -m nltk.downloader stopwords && \
    python -m spacy download en

#Add files
ADD tweepy-streaming.py /
ADD nyc-zoomed-processed.geojson /

#Create directory for data
RUN mkdir /data

# Change nginx configuration
RUN rm -v /etc/nginx/nginx.conf
ADD nginx.conf /etc/nginx/

#Open ports
ENV PORT 10001
ENV PORT 90

#Start nginx and run python script
CMD service nginx start && python ./tweepy-streaming.py
