import json

for fname, label in [('makelocalads.com_ecom_product.har', 'PRODUCT'), ('makelocalads.com_ecom_fashion.har', 'FASHION')]:
    har = json.load(open(f'd:\\Major_Project\\{fname}', 'r', encoding='utf-8'))
    entries = har.get('log', {}).get('entries', [])
    for entry in entries:
        url = entry.get('request', {}).get('url', '')
        if 'creatives.feed' in url:
            txt = entry.get('response', {}).get('content', {}).get('text', '')
            if txt:
                data = json.loads(txt)
                rd = data[0]['result']['data']
                n = len(rd.get('items', []))
                print(label, 'len=', len(txt), 'items=', n)
