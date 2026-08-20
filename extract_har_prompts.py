import json
import sys

def extract_prompts(har_path):
    with open(har_path, 'r', encoding='utf-8') as f:
        har_data = json.load(f)
        
    entries = har_data['log']['entries']
    
    prompts = []
    
    for entry in entries:
        request = entry['request']
        url = request['url']
        
        # Check postData for JSON payloads
        if 'postData' in request:
            post_data = request['postData']
            if 'text' in post_data:
                try:
                    payload = json.loads(post_data['text'])
                    # Search for prompt-like keys recursively
                    def find_prompts(obj):
                        if isinstance(obj, dict):
                            for k, v in obj.items():
                                if k.lower() in ['prompt', 'user_prompt', 'system_prompt', 'inputs', 'messages', 'content']:
                                    if isinstance(v, str) and len(v) > 20: # arbitrary length to filter out small words
                                        prompts.append((url, k, v))
                                elif isinstance(v, (dict, list)):
                                    find_prompts(v)
                        elif isinstance(obj, list):
                            for item in obj:
                                find_prompts(item)
                                
                    find_prompts(payload)
                except json.JSONDecodeError:
                    pass
                    
        # Check response content
        if 'response' in entry:
            response = entry['response']
            if 'content' in response and 'text' in response['content']:
                try:
                    payload = json.loads(response['content']['text'])
                    def find_prompts_resp(obj):
                        if isinstance(obj, dict):
                            for k, v in obj.items():
                                if k.lower() in ['prompt', 'image_prompt', 'text', 'content']:
                                    if isinstance(v, str) and len(v) > 20:
                                        prompts.append((url + " (Response)", k, v))
                                elif isinstance(v, (dict, list)):
                                    find_prompts_resp(v)
                        elif isinstance(obj, list):
                            for item in obj:
                                find_prompts_resp(item)
                    find_prompts_resp(payload)
                except Exception:
                    pass

    return prompts

if __name__ == '__main__':
    prompts = extract_prompts(sys.argv[1])
    for i, p in enumerate(prompts):
        print(f"--- Prompt {i+1} ---")
        print(f"URL/Source: {p[0]}")
        print(f"Key: {p[1]}")
        print(f"Value: {p[2][:500]}...\n")
