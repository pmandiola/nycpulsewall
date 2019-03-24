#!/bin/bash
yesterday=$(date -d "yesterday 13:00" "+%Y-%m-%d")
filename=/data/tweets_$yesterday.json
bucket=gs://artifacts.nyc-pulse-wall.appspot.com/tweets/
#table=my_twitter_data.texts_and_dates

gsutil cp $filename $bucket

#bq load --source_format=NEWLINE_DELIMITED_JSON $table $bucket/$filename

rm $filename
sleep 1d