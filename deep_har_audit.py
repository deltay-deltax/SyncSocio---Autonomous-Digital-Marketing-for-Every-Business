import json
import re

har_files = [
    'd:/Major_Project/makelocalads.com.har',
    'd:/Major_Project/makelocalads.com_2nd.har',
    'd:/Major_Project/makelocalads.com_3rd.har',
    'd:/Major_Project/makelocalads.com_discovermode.har',
    'd:/Major_Project/makelocalads.com_drivepurchase.har',
    'd:/Major_Project/makelocalads.com_wincomparison.har',
    'd:/Major_Project/makelocalads.com_recent.har',
]

all_briefs = []
all_prompts = []

for har_path in har_files:
    try:
        with open(har_path, 'r', encoding='utf-8', errors='replace') as f:
            har_data = json.load(f)
        fname = har_path.split('/')[-1]

        for entry in har_data['log']['entries']:
            rc = entry['response'].get('content', {}).get('text', '')
            if not rc:
                continue

            # All finalImagePrompts
            positions = [m.start() for m in re.finditer(r'"finalImagePrompt":"', rc)]
            for pos in positions:
                snippet = rc[pos+20:pos+10000]
                end = snippet.find('","source"')
                if end == -1:
                    end = snippet.find('"status"')
                prompt_text = snippet[:end if end > 0 else 6000]
                # clean JSON escapes
                prompt_text = prompt_text.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
                all_prompts.append({'file': fname, 'prompt': prompt_text})

            # All briefs
            positions = [m.start() for m in re.finditer(r'"brief":"', rc)]
            for pos in positions:
                snippet = rc[pos+9:pos+3000]
                end = snippet.find('","')
                brief_text = snippet[:end if end > 0 else 2000]
                brief_text = brief_text.replace('\\n', '\n').replace('\\"', '"')
                all_briefs.append({'file': fname, 'brief': brief_text})

    except Exception as e:
        print(f'Error: {har_path}: {e}')

# Deduplicate
seen_p = set()
unique_prompts = []
for p in all_prompts:
    key = p['prompt'][:100]
    if key not in seen_p:
        seen_p.add(key)
        unique_prompts.append(p)

seen_b = set()
unique_briefs = []
for b in all_briefs:
    key = b['brief'][:100]
    if key not in seen_b:
        seen_b.add(key)
        unique_briefs.append(b)

output = []
output.append(f'Total unique prompts found: {len(unique_prompts)}')
output.append(f'Total unique briefs found: {len(unique_briefs)}')

output.append('\n\n' + '='*80)
output.append('PART 1: ALL UNIQUE BRIEFS (Block 1 / Art Director Instructions)')
output.append('='*80)
for i, b in enumerate(unique_briefs):
    output.append(f'\n--- Brief {i+1} [{b["file"]}] ---')
    output.append(b['brief'][:3000])

output.append('\n\n' + '='*80)
output.append('PART 2: FULL PROMPTS (All 3 Blocks combined) - First 6 unique')
output.append('='*80)
for i, p in enumerate(unique_prompts[:6]):
    output.append(f'\n--- Prompt {i+1} [{p["file"]}] ---')
    output.append(p['prompt'][:6000])

with open('d:/Major_Project/deep_har_analysis.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output))

print(f'Done. {len(unique_prompts)} prompts, {len(unique_briefs)} briefs extracted.')
