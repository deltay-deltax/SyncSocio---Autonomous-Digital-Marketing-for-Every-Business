const fs = require('fs');

function analyzeRequests(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let interestingRequests = [];

    data.log.entries.forEach((entry, idx) => {
        const req = entry.request;
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            if (req.postData && req.postData.text) {
                // Ignore analytics/telemetry
                if (req.url.includes('google-analytics') || 
                    req.url.includes('mixpanel') || 
                    req.url.includes('clarity') ||
                    req.url.includes('posthog') ||
                    req.url.includes('b.makelocalads.com')) {
                    return;
                }

                try {
                    const parsed = JSON.parse(req.postData.text);
                    interestingRequests.push({
                        url: req.url,
                        method: req.method,
                        payload: parsed
                    });
                } catch (e) {
                    // if it's not JSON, skip or just log length
                }
            }
        }
    });

    fs.writeFileSync('extracted_requests_clean.json', JSON.stringify(interestingRequests, null, 2));
    console.log(`Extracted ${interestingRequests.length} clean JSON requests to extracted_requests_clean.json`);
}

analyzeRequests('d:\\Major_Project\\makelocalads.com_full_step.har');
