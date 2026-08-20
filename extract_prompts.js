const fs = require('fs');

function extractPrompts(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let prompts = [];

    data.log.entries.forEach((entry, idx) => {
        if (entry.response && entry.response.content && entry.response.content.text) {
            try {
                const innerData = JSON.parse(entry.response.content.text);
                
                let items = [];
                if (Array.isArray(innerData)) {
                    innerData.forEach(item => {
                        if (item.result && item.result.data) {
                            if (item.result.data.items) {
                                items = items.concat(item.result.data.items);
                            } else if (item.result.data.creatives) {
                                items = items.concat(item.result.data.creatives);
                            } else {
                                items.push(item.result.data);
                            }
                        }
                    });
                } else if (innerData.result && innerData.result.data) {
                   if (innerData.result.data.creatives) {
                       items = items.concat(innerData.result.data.creatives);
                   }
                }
                
                items.forEach(item => {
                    if (item && item.prompt) {
                        prompts.push(item.prompt);
                    } else if (item && item.imagePrompt) {
                        prompts.push(item.imagePrompt);
                    } else if (item && item.creatives) {
                        item.creatives.forEach(c => {
                            if (c && c.prompt) prompts.push(c.prompt);
                            if (c && c.imagePrompt) prompts.push(c.imagePrompt);
                        });
                    } else if (item && typeof item === 'object') {
                        // deep search for prompt
                        JSON.stringify(item, (key, value) => {
                            if ((key === 'prompt' || key === 'imagePrompt') && value) {
                                prompts.push(value);
                            }
                            return value;
                        });
                    }
                });
            } catch (e) {
                // not json
            }
        }
    });

    // Remove duplicates
    prompts = [...new Set(prompts.map(p => typeof p === 'string' ? p : JSON.stringify(p, null, 2)))];
    
    fs.writeFileSync('extracted_hack_prompts.json', JSON.stringify(prompts, null, 2));
    console.log(`Extracted ${prompts.length} unique prompts to extracted_hack_prompts.json`);
}

extractPrompts('d:\\Major_Project\\makelocalads.com_hack.har');
