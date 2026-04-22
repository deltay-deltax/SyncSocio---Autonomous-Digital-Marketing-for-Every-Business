import Notification from '../models/Notification.js';

/**
 * Create a new notification for a user
 * @param {string} userId - ID of the user
 * @param {string} type - success | insight | agent | comment | scheduled | alert | billing
 * @param {string} title - Short title of the notification
 * @param {string} description - Detailed description
 * @param {object} metadata - Optional extra data
 */
export const createNotification = async (userId, type, title, description, metadata = {}) => {
  try {
    const notification = new Notification({
      userId,
      type,
      title,
      description,
      metadata
    });
    await notification.save();
    return notification;
  } catch (err) {
    console.error('Error creating notification:', err);
  }
};
