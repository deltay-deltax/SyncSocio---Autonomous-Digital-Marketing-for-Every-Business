import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const accessToken = "EAAcfjOt91ZBUBRbfLh9Ga8kYDhUeSTDWZBKZCb0MFChqnN4dk5W1FCHZBOLKO3A1tfgO7T0H5XojKZC1t2ZC9bH9ae4AZA2b4i3unZAGQTgC0WCi8jifxi4HFhZBCQ9MCB0lHH3WxGD92vIxEemd2pEASHsTVkARBXQMQodjRdMpDueuoydIBjsVPaDAEX3wG";

async function run() {
  try {
    const res = await axios.get('https://graph.facebook.com/v25.0/me/accounts', {
      params: { fields: 'id,name,access_token', access_token: accessToken }
    });
    console.log('Pages:', JSON.stringify(res.data.data, null, 2));
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

run();
