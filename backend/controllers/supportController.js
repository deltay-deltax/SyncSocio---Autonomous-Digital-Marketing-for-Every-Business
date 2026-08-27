import Ticket from '../models/Ticket.js';
import AdminNotification from '../models/AdminNotification.js';
import Notification from '../models/Notification.js';
import { uploadBase64ToCloudinary } from '../utils/cloudinaryUpload.js';

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
    const { subject, message, priority = 'medium', attachments = [] } = req.body;
    
    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }

    let uploadedUrls = [];
    if (attachments && attachments.length > 0) {
      try {
        uploadedUrls = await Promise.all(attachments.map(async (b64) => {
          return await uploadBase64ToCloudinary(b64, 'syncsocio/support');
        }));
      } catch (uploadErr) {
        console.error('Error uploading attachments:', uploadErr);
      }
    }

    const newTicket = new Ticket({
      user: req.user._id,
      subject,
      priority,
      messages: [{
        sender: 'user',
        content: message,
        attachments: uploadedUrls
      }]
    });

    const savedTicket = await newTicket.save();

    // Create an Admin Notification
    try {
      await AdminNotification.create({
        type: 'nexa_escalation',
        title: 'New Support Ticket Raised',
        description: subject,
        metadata: { ticketId: savedTicket._id, userId: req.user._id }
      });
    } catch (notifError) {
      console.error('Failed to create admin notification:', notifError);
    }

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
    const { content, sender, attachments = [] } = req.body;

    const ticket = await Ticket.findById(id).populate('user', 'name email');
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (!req.admin && ticket.user._id.toString() !== req.user?._id?.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this ticket' });
    }

    let uploadedUrls = [];
    if (attachments && attachments.length > 0) {
      try {
        uploadedUrls = await Promise.all(attachments.map(async (b64) => {
          return await uploadBase64ToCloudinary(b64, 'syncsocio/support');
        }));
      } catch (uploadErr) {
        console.error('Error uploading attachments:', uploadErr);
      }
    }

    ticket.messages.push({
      sender,
      content,
      attachments: uploadedUrls
    });

    await ticket.save();

    // Notify user when admin replies
    if (sender === 'admin' && ticket.user?._id) {
      try {
        await Notification.create({
          userId: ticket.user._id,
          type: 'support',
          title: 'Support Team Replied',
          description: `New reply on your ticket: "${ticket.subject}"`,
          metadata: { ticketId: ticket._id }
        });
      } catch (notifError) {
        console.error('Failed to create user notification for admin reply:', notifError);
      }
    }

    // Notify admin when user sends a message on existing ticket
    if (sender === 'user') {
      try {
        await AdminNotification.create({
          type: 'ticket_reply',
          title: 'New Message on Support Ticket',
          description: `User replied on ticket: "${ticket.subject}"`,
          metadata: { ticketId: ticket._id, userId: ticket.user?._id }
        });
      } catch (notifError) {
        console.error('Failed to create admin notification for user reply:', notifError);
      }
    }

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

    // Notify the user based on status change
    if (status === 'resolved') {
      try {
        await Notification.create({
          userId: ticket.user,
          type: 'support',
          title: '✅ Ticket Resolved',
          description: `Your ticket "${ticket.subject}" has been resolved by our support team.`,
          metadata: { ticketId: ticket._id }
        });
      } catch (notifError) {
        console.error('Failed to create user notification:', notifError);
      }
    } else if (status === 'in_progress') {
      try {
        await Notification.create({
          userId: ticket.user,
          type: 'support',
          title: '🔧 Ticket In Progress',
          description: `Our team is now working on your ticket: "${ticket.subject}".`,
          metadata: { ticketId: ticket._id }
        });
      } catch (notifError) {
        console.error('Failed to create in_progress user notification:', notifError);
      }
    }

    res.json(updatedTicket);
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ message: 'Server error updating status' });
  }
};
