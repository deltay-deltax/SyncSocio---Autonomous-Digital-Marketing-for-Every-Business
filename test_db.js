import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ticket from './backend/models/Ticket.js';

dotenv.config({ path: './backend/.env' });

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const tickets = await Ticket.find({});
  console.log('TICKETS:', tickets.length);
  mongoose.connection.close();
}
test();
