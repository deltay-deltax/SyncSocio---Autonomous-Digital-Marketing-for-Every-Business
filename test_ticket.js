import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ticket from './backend/models/Ticket.js';

dotenv.config({ path: './backend/.env' });

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');
  
  try {
    const newTicket = new Ticket({
      user: new mongoose.Types.ObjectId(), // dummy
      subject: 'Test Subject',
      priority: 'medium',
      messages: [{
        sender: 'user',
        content: 'Test Message'
      }]
    });
    
    await newTicket.save();
    console.log('Saved successfully');
  } catch (err) {
    console.error('Save error:', err);
  }
  
  mongoose.connection.close();
}
test();
