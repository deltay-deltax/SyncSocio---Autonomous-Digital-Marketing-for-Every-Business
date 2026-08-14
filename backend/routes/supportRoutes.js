import express from 'express';
import {
  getUserTickets,
  createTicket,
  addMessageToTicket,
  getAllTickets,
  updateTicketStatus
} from '../controllers/supportController.js';
import { protect } from '../middleware/authMiddleware.js';
import { verifyAdmin } from '../controllers/adminController.js';

const router = express.Router();

// User routes
router.route('/tickets')
  .get(protect, getUserTickets)
  .post(protect, createTicket);

router.route('/tickets/:id/messages')
  .post(protect, addMessageToTicket);

// Admin routes
router.route('/admin/tickets')
  .get(verifyAdmin, getAllTickets);

router.route('/admin/tickets/:id/status')
  .put(verifyAdmin, updateTicketStatus);

// We can also have an admin route to add message to ticket
router.route('/admin/tickets/:id/messages')
  .post(verifyAdmin, addMessageToTicket);

export default router;
