
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const accessToken = "EAAcfjOt91ZBUBRbfLh9Ga8kYDhUeSTDWZBKZCb0MFChqnN4dk5W1FCHZBOLKO3A1tfgO7T0H5XojKZC1t2ZC9bH9ae4AZA2b4i3unZAGQTgC0WCi8jifxi4HFhZBCQ9MCB0lHH3WxGD92vIxEemd2pEASHsTVkARBXQMQodjRdMpDueuoydIBjsVPaDAEX3wG";
const igId = "17841473581813349";

async function test() {
  try {
    console.log('Testing Media Fetch...');
    const mediaRes = await axios.get(`https://graph.facebook.com/v25.0/${igId}/media`, {
      params: { fields: 'id,caption,timestamp', limit: 5, access_token: accessToken }
    });
    console.log('Media Success:', mediaRes.data.data.length, 'posts found.');

    console.log('Testing Insights (Reach, days_28)...');
    const insightsRes = await axios.get(`https://graph.facebook.com/v25.0/${igId}/insights`, {
      params: { metric: 'reach', period: 'days_28', access_token: accessToken }
    });
    console.log('Insights Success:', JSON.stringify(insightsRes.data.data, null, 2));

    console.log('Testing User Info...');
    const userRes = await axios.get(`https://graph.facebook.com/v25.0/${igId}`, {
        params: { fields: 'followers_count,media_count', access_token: accessToken }
    });
    console.log('User Info Success:', userRes.data);

  } catch (err) {
    console.error('Test Failed!');
    console.error('Status:', err.response?.status);
    console.error('Data:', JSON.stringify(err.response?.data, null, 2));
    console.error('Message:', err.message);
  }
}

test();
