const axios = require('axios');
const pageToken = 'EAAcfjOt91ZBUBRDb66ZCLmeHKCqbshvRRVLc8J0cQQ1pFgB44dIGy0ZAk0t5zjU1vGvSFW89orZBefQVlkePFHTFQwMMabGU5VfKjgoqmvy9Q454aQy0aqOvJXGwETtzSv0rFtUtQuvgvjFjH889KmLrO5fAZBRWuatJ1ZBqo98adfhdXxPAdBCTdAICr3bLgmT4gFqvDU';
const pageId = '658322564036441';
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
