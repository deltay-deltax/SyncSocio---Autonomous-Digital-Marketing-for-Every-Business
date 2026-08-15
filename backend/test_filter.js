import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const token = jwt.sign(
  { email: 'admin@syncsocio.com', role: 'admin' },
  process.env.JWT_SECRET || 'fallback_secret',
  { expiresIn: '1d' }
);

async function test() {
  const res = await fetch('http://localhost:5050/api/support/admin/tickets', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const tickets = await res.json();
  const search = "";
  const filteredTickets = tickets.filter(t => {
    const searchLower = search.toLowerCase();
    return (t.subject?.toLowerCase() || '').includes(searchLower) ||
           (t.user?.email?.toLowerCase() || '').includes(searchLower) ||
           (t.user?.name?.toLowerCase() || '').includes(searchLower);
  });
  console.log("Original length:", tickets.length);
  console.log("Filtered length:", filteredTickets.length);
}
test();
