import json

def print_all(har_path, label, target_len):
    har = json.load(open(har_path, 'r', encoding='utf-8'))
    entries = har.get('log', {}).get('entries', [])
    for entry in entries:
        url = entry.get('request', {}).get('url', '')
        if 'creatives.feed' in url:
            txt = entry.get('response', {}).get('content', {}).get('text', '')
            if txt and len(txt) == target_len:
                data = json.loads(txt)
                items = data[0]['result']['data']['items']
                print('\n\n' + '#'*70)
                print('  ' + label + '  (' + str(len(items)) + ' items)')
                print('#'*70)
                for i, item in enumerate(items):
                    cv = item.get('currentVersion') or {}
                    fp = (cv.get('finalImagePrompt') or '')
                    asset_url = item.get('assetUrl') or 'NONE'
                    meta = cv.get('metadata') or {}
                    model = meta.get('model') or 'UNKNOWN'
                    print('\n--- ITEM ' + str(i+1) + ' ---')
                    print('model: ' + model)
                    print('assetUrl: ' + str(asset_url)[:100])
                    print('finalImagePrompt (' + str(len(fp)) + ' chars):')
                    print(fp[:1500])
                    if len(fp) > 1500:
                        print('...[truncated, ' + str(len(fp)) + ' total]')
                return

print_all(
    r'd:\Major_Project\makelocalads.com_ecom_product.har',
    'PRODUCT: Goli Ashwa Gummies',
    475385
)
print_all(
    r'd:\Major_Project\makelocalads.com_ecom_fashion.har',
    'FASHION',
    529936
)
