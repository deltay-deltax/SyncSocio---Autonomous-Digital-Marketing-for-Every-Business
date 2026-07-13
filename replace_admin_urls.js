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
            
            // Replace single quote strings
            content = content.replace(/'http:\/\/localhost:5050(.*?)'/g, "`\\${import.meta.env.VITE_API_URL || 'http://localhost:5050'}$1`");
            // Replace double quote strings
            content = content.replace(/"http:\/\/localhost:5050(.*?)"/g, "`\\${import.meta.env.VITE_API_URL || 'http://localhost:5050'}$1`");
            // Replace inside template literals
            content = content.replace(/`http:\/\/localhost:5050(.*?)`/g, "`\\${import.meta.env.VITE_API_URL || 'http://localhost:5050'}$1`");
            
            fs.writeFileSync(fullPath, content, 'utf8');
        }
    });
};

processDirectory(directoryPath);
console.log('Replaced all hardcoded localhost:5050 URLs');
