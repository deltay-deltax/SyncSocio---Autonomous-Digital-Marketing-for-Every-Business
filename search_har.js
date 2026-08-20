const fs = require('fs');

function searchHar(filePath) {
    console.log('Loading file...');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log('File loaded. Searching...');
    
    let results = [];
    const searchTerms = ['director', 'prompt', 'brief', 'instrn', 'ditector'];
    
    function traverse(obj, path = '') {
        if (typeof obj === 'string') {
            const lowerStr = obj.toLowerCase();
            if (searchTerms.some(term => lowerStr.includes(term))) {
                results.push({ path, value: obj.substring(0, 500) + (obj.length > 500 ? '...' : '') });
            }
        } else if (Array.isArray(obj)) {
            obj.forEach((item, index) => traverse(item, `${path}[${index}]`));
        } else if (obj !== null && typeof obj === 'object') {
            for (const key in obj) {
                const lowerKey = key.toLowerCase();
                if (searchTerms.some(term => lowerKey.includes(term))) {
                    results.push({ path: `${path}.${key}`, keyMatch: true });
                }
                traverse(obj[key], `${path}.${key}`);
            }
        }
    }
    
    traverse(data, 'root');
    console.log(`Found ${results.length} matches.`);
    fs.writeFileSync('har_search_results.json', JSON.stringify(results, null, 2));
    console.log('Results saved to har_search_results.json');
}

searchHar('d:\\Major_Project\\makelocalads.com_full_step.har');
