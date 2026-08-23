const fs = require('fs');

function searchForTemplates(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let findings = [];

    data.log.entries.forEach((entry, idx) => {
        if (entry.response && entry.response.content && entry.response.content.text) {
            const text = entry.response.content.text;
            // Check if it's a JS file or JSON containing a prompt template
            if (text.includes('Instructions by the director')) {
                // Find context around it
                const regex = /.{0,100}Instructions by the director.{0,200}/g;
                let matches;
                while ((matches = regex.exec(text)) !== null) {
                    findings.push({
                        url: entry.request.url,
                        match: matches[0]
                    });
                }
            }
        }
    });

    // unique findings
    findings = findings.filter((v,i,a)=>a.findIndex(t=>(t.match === v.match))===i);

    fs.writeFileSync('prompt_templates_search.json', JSON.stringify(findings, null, 2));
    console.log(`Found ${findings.length} unique contexts.`);
}

searchForTemplates('d:\\Major_Project\\makelocalads.com_full_step.har');
