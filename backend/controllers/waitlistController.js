import Waitlist from '../models/Waitlist.js';

export const addToWaitlist = async (req, res) => {
  const { name, email, role } = req.body;
  try {
    const entry = await Waitlist.create({ name, email, role });
    res.status(201).json(entry);
  } catch (error) {
    console.error('Waitlist Error:', error);
    res.status(500).json({ message: 'Server error joining waitlist' });
  }
};
