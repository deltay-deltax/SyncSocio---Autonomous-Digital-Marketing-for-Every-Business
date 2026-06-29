import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
import axios from 'axios';

const token = jwt.sign(
  { email: process.env.ADMIN_EMAIL || 'admin@velocity.com', role: 'admin' },
  process.env.JWT_SECRET || 'fallback_secret',
  { expiresIn: '12h' }
);

axios.get('http://localhost:5050/api/admin/analytics/revenue', {
  headers: { Authorization: `Bearer ${token}` }
}).then(res => {
  console.log("SUCCESS");
  console.log(res.data);
}).catch(err => {
  console.log("ERROR");
  console.log(err.response ? err.response.data : err.message);
});
