import Ticket from '../models/Ticket.js';

// Get user's tickets
export const getUserTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'Server error fetching tickets' });
  }
};

// Create a new ticket
export const createTicket = async (req, res) => {
  try {
    const { subject, message, priority = 'medium' } = req.body;
    
    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }

    const newTicket = new Ticket({
      user: req.user._id,
      subject,
      priority,
      messages: [{
        sender: 'user',
        content: message
      }]
    });

    const savedTicket = await newTicket.save();
    res.status(201).json(savedTicket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ message: 'Server error creating ticket' });
  }
};

// Add a message to a ticket
export const addMessageToTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, sender } = req.body;

    const ticket = await Ticket.findById(id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (!req.admin && ticket.user.toString() !== req.user?._id?.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this ticket' });
    }

    ticket.messages.push({
      sender,
      content
    });

    await ticket.save();
    res.json(ticket);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ message: 'Server error adding message' });
  }
};

// Admin: Get all tickets
export const getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({}).populate('user', 'name email').sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    res.status(500).json({ message: 'Server error fetching tickets' });
  }
};

// Admin: Update ticket status
export const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.status = status;
    const updatedTicket = await ticket.save();
    res.json(updatedTicket);
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ message: 'Server error updating status' });
  }
};
