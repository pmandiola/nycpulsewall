#!/bin/bash
yesterday=$(date -d "yesterday 13:00" "+%Y-%m-%d")
filename=/data/tweets-filtered_$yesterday.csv

echo 'REMOVE!'
# gsutil  rm $filename