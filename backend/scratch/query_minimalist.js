import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const accessToken = "EAAcfjOt91ZBUBRbfLh9Ga8kYDhUeSTDWZBKZCb0MFChqnN4dk5W1FCHZBOLKO3A1tfgO7T0H5XojKZC1t2ZC9bH9ae4AZA2b4i3unZAGQTgC0WCi8jifxi4HFhZBCQ9MCB0lHH3WxGD92vIxEemd2pEASHsTVkARBXQMQodjRdMpDueuoydIBjsVPaDAEX3wG";
const igId = "17841460826242115";

async function run() {
  try {
    const res = await axios.get(`https://graph.facebook.com/v25.0/${igId}`, {
      params: { fields: 'id,username,name', access_token: accessToken }
    });
    console.log('Minimalist Business Account Info:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

run();
