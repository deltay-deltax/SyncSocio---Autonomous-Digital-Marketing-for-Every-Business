import json
import re

HAR_FILES = {
    "fashion": r"d:\Major_Project\makelocalads.com_ecom_fashion.har",
    "product": r"d:\Major_Project\makelocalads.com_ecom_product.har",
    "new_ecomm": r"d:\Major_Project\makelocalads.com_new_ecomm_mode.har",
}

def load_har(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def find_prompts(data, path=""):
    """Recursively find any key named 'prompt' in JSON data."""
    results = []
    if isinstance(data, dict):
        for k, v in data.items():
            if k.lower() == "prompt":
                results.append((path + "." + k, v))
            else:
                results.extend(find_prompts(v, path + "." + k))
    elif isinstance(data, list):
        for i, item in enumerate(data):
            results.extend(find_prompts(item, path + f"[{i}]"))
    return results

def get_try_parse(text):
    try:
        return json.loads(text)
    except:
        return None

for label, file_path in HAR_FILES.items():
    print(f"\n\n{'='*70}")
    print(f"  FILE: {label}  ({file_path.split(chr(92))[-1]})")
    print(f"{'='*70}")
    har = load_har(file_path)
    entries = har.get("log", {}).get("entries", [])
    
    for entry in entries:
        req = entry.get("request", {})
        url = req.get("url", "")
        method = req.get("method", "")
        
        # Filter for relevant endpoints
        relevant = (
            "amazon-listing" in url or
            "amazonListing" in url or
            "fal" in url or
            "openai" in url or
            "generate-images" in url or
            "image-ideas" in url
        )
        if not relevant:
            continue
        
        print(f"\n--- {method} {url[:100]} ---")
        
        # Request payload
        post_data = req.get("postData", {}).get("text", "")
        if post_data:
            parsed = get_try_parse(post_data)
            if parsed:
                print("REQUEST PAYLOAD:")
                dumped = json.dumps(parsed, indent=2)
                print(dumped[:3000])
                if len(dumped) > 3000:
                    print(f"... [truncated, {len(dumped)} chars total]")
            else:
                print("REQUEST PAYLOAD (raw):", post_data[:500])
        
        # Response body
        res_text = entry.get("response", {}).get("content", {}).get("text", "")
        if res_text:
            parsed_res = get_try_parse(res_text)
            if parsed_res:
                # Search for prompts deep in the response
                prompts_found = find_prompts(parsed_res)
                if prompts_found:
                    print("PROMPT FIELDS IN RESPONSE:")
                    for ppath, pval in prompts_found:
                        print(f"  [{ppath}]")
                        print(f"  {str(pval)[:800]}")
                else:
                    # Print a truncated version of the response
                    print("RESPONSE (truncated):")
                    print(json.dumps(parsed_res, indent=2)[:1500])
            else:
                # Could be a streaming response
                if "prompt" in res_text.lower():
                    lines = res_text.split("\n")
                    for line in lines:
                        if "prompt" in line.lower():
                            print("STREAMING LINE WITH PROMPT:", line[:500])
                else:
                    print("RESPONSE (raw, first 500):", res_text[:500])
