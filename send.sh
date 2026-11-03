#!/bin/bash
# usage: send.sh MSGFILE URL BANNER OUTLET DEDUPLINE
T=8618148491:AAG_p1JZCgrx-aoNEuJEds5SbF2IEXBwD_A
MSG=$(cat "$1"); URL="$2"
LPO="{\"url\":\"$URL\",\"prefer_large_media\":true,\"show_above_text\":false}"
R=$(curl -s -X POST "https://api.telegram.org/bot$T/sendMessage" -d chat_id="-1003717332318" -d parse_mode=HTML --data-urlencode "text=$MSG" --data-urlencode "link_preview_options=$LPO")
ID=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['result']['message_id'])") || { echo "CHANNEL FAIL $R"; exit 1; }
echo "channel id=$ID"
R2=$(curl -s -X POST "https://api.telegram.org/bot$T/sendMessage" -d chat_id="-1003957818672" -d message_thread_id=4 -d parse_mode=HTML --data-urlencode "text=$MSG" --data-urlencode "link_preview_options=$LPO")
echo "topics: $(echo "$R2" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('ok'),d.get('result',{}).get('message_id'))")"
echo "$5" >> ~/.local/share/scant/.scant-dedup.log
HTMLS_DIR=/tmp/htmls-tmp ~/.local/bin/update-tg-feed.py --id "$ID" --text "$MSG" --task scant --banner "$3" --source-url "$URL" --source-title "$4" 2>&1 | tail -2
