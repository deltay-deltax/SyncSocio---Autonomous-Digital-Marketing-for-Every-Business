const http = require('http');
http.get('http://localhost:5050/api/site/settings', (res) => {
  let rawData = '';
  res.on('data', (chunk) => { rawData += chunk; });
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(rawData);
      console.log(JSON.stringify(parsedData.settings.creativeShowcaseGallery, null, 2));
    } catch (e) {
      console.error(e.message);
    }
  });
}).on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});
