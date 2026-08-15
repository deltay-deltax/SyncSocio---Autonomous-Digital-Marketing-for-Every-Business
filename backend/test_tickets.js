import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();
const token = jwt.sign(
  { email: 'admin@syncsocio.com', role: 'admin' },
  process.env.JWT_SECRET || 'fallback_secret',
  { expiresIn: '1d' }
);

async function test() {
  try {
    const res = await fetch('http://localhost:5050/api/support/admin/tickets', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Data length:", Array.isArray(data) ? data.length : typeof data);
    if (!Array.isArray(data)) console.log("Data:", data);
  } catch (err) {
    console.error(err);
  }
}
test();
