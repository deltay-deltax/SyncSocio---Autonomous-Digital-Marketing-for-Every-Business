import json
with open('d:/Major_Project/makelocalads.com_discovermode.har', 'r', encoding='utf-8') as f:
    har = json.load(f)
with open('d:/Major_Project/har_post_data.txt', 'w', encoding='utf-8') as out:
    for entry in har['log']['entries']:
        req = entry['request']
        if 'postData' in req and req['postData'].get('text'):
            if 'makelocalads' in req['url']:
                out.write(f"URL: {req['url']}\n")
                out.write(f"Payload: {req['postData']['text'][:2000]}\n")
                out.write('-'*40 + '\n')
