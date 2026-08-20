import json
import os

har_file = r'd:\Major_Project\makelocalads.com_full_step.har'

def extract_from_json(data, results):
    if isinstance(data, dict):
        for k, v in data.items():
            if isinstance(k, str) and ('brief' in k.lower() or 'prompt' in k.lower()):
                if isinstance(v, str) and len(v) > 10:
                    results.append({'key': k, 'value': v})
            
            if isinstance(v, (dict, list)):
                extract_from_json(v, results)
            elif isinstance(v, str):
                if v.startswith('{') or v.startswith('['):
                    try:
                        parsed = json.loads(v)
                        extract_from_json(parsed, results)
                    except:
                        pass
    elif isinstance(data, list):
        for item in data:
            extract_from_json(item, results)

results = []
try:
    with open(har_file, 'r', encoding='utf-8', errors='replace') as f:
        data = json.load(f)
        
    for entry in data.get('log', {}).get('entries', []):
        # Check request post data
        post_data = entry.get('request', {}).get('postData', {}).get('text', '')
        if post_data:
            try:
                parsed = json.loads(post_data)
                extract_from_json(parsed, results)
            except:
                pass
                
        # Check response content
        content = entry.get('response', {}).get('content', {}).get('text', '')
        if content:
            try:
                parsed = json.loads(content)
                extract_from_json(parsed, results)
            except:
                pass

    unique_results = []
    seen = set()
    for r in results:
        if r['value'] not in seen:
            seen.add(r['value'])
            unique_results.append(r)

    print(f'Found {len(unique_results)} unique prompts/briefs.')
    
    with open('extracted_prompts.md', 'w', encoding='utf-8') as f:
        f.write('# Extracted Prompts and Briefs\n\n')
        for idx, r in enumerate(unique_results):
            f.write(f'### {idx+1}. Key: `{r["key"]}`\n\n')
            f.write(f'```text\n{r["value"]}\n```\n\n')
            f.write('---\n\n')
except Exception as e:
    print('Error:', e)
