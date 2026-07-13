const fs = require('fs');
const path = require('path');
const directoryPath = path.join(__dirname, 'admin', 'src', 'pages');

const processDirectory = (dirPath) => {
    fs.readdirSync(dirPath).forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            // Remove the escaped backslash and dollar sign before {import.meta.env
            // which looks like \${import.meta.env
            const newContent = content.replace(/\\\$\{import\.meta\.env/g, '${import.meta.env');
            if (content !== newContent) {
                fs.writeFileSync(fullPath, newContent, 'utf8');
                console.log('Fixed', fullPath);
            }
        }
    });
};

processDirectory(directoryPath);
console.log('Done fixing escaped template literals in admin.');
