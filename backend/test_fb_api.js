require('dotenv').config();
const axios = require('axios');
const pageToken = process.env.FB_PAGE_TOKEN;
const pageId = process.env.FB_PAGE_ID;
const commentId = '18421978168127594'; // We need a valid comment id. Maybe this one is expired, but let's try.

async function run() {
  try {
    const res = await axios.post(`https://graph.facebook.com/v25.0/${pageId}/messages`, {
      recipient: { comment_id: commentId },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [{ title: "Testing Buttons", buttons: [{ type: "postback", title: "Test", payload: "TEST" }] }]
          }
        }
      }
    }, { params: { access_token: pageToken } });
    console.log(res.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
run();
