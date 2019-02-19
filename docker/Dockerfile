FROM python:3.6

RUN pip install tweepy gevent-websocket textblob

ENV PORT 10001

ADD tweepy-streaming.py /

CMD [ "python", "./tweepy-streaming.py" ]
