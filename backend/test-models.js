import 'dotenv/config';
import axios from 'axios';
async function test() {
  const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY}`);
  console.log(res.data.models.map(m => m.name));
}
test();
