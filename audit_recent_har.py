import json
import re

with open('d:/Major_Project/makelocalads.com_recent.har', 'r', encoding='utf-8', errors='replace') as f:
    har_data = json.load(f)

found_prompts = []
found_briefs = []
found_brands = []

for entry in har_data['log']['entries']:
    response_content = entry['response'].get('content', {}).get('text', '')
    if not response_content:
        continue

    # Full finalImagePrompt
    if 'finalImagePrompt' in response_content and len(found_prompts) < 3:
        idx = response_content.find('"finalImagePrompt":"')
        if idx > -1:
            snippet = response_content[idx+20:idx+8000]
            end = snippet.find('","source"')
            found_prompts.append(snippet[:end if end > 0 else 5000])

    # Brief
    if '"brief":"' in response_content and len(found_briefs) < 3:
        idx = response_content.find('"brief":"')
        if idx > -1:
            snippet = response_content[idx+9:idx+3000]
            end = snippet.find('","')
            found_briefs.append(snippet[:end if end > 0 else 2000])

    # Brand colors / brand profile
    if 'brandColors' in response_content or 'primaryColor' in response_content:
        if len(found_brands) < 1:
            idx = response_content.find('"brandColors"') if '"brandColors"' in response_content else response_content.find('"primaryColor"')
            found_brands.append(response_content[max(0,idx-200):idx+500])

print('=== BRIEFS ===')
for i, b in enumerate(found_briefs[:2]):
    print(f'\n--- Brief {i+1} ---')
    print(b[:2000])

print('\n\n=== FULL PROMPTS ===')
for i, p in enumerate(found_prompts[:2]):
    print(f'\n--- Prompt {i+1} ---')
    print(p[:5000])

print('\n\n=== BRAND COLOR BLOCK ===')
for b in found_brands:
    print(b)
