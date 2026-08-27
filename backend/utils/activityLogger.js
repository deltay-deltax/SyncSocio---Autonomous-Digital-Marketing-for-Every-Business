import AgentActivity from '../models/AgentActivity.js';

/**
 * Logs an AI agent activity to the database.
 * @param {string} userId - The ID of the user.
 * @param {string} agentName - The name of the agent (e.g., 'Engine', 'Neural Pulse').
 * @param {string} message - The activity description.
 * @param {string} status - 'active' or 'done'.
 * @param {string} duration - Execution time (e.g., '4.2s').
 */
export const logActivity = async (userId, agentName, message, status = 'done', duration = null) => {
  try {
    const User = (await import('../models/User.js')).default;
    const userObj = await User.findById(userId).select('activeBrandId');
    const brandId = userObj?.activeBrandId;

    let activityUpdated = false;

    if (status === 'done' || status === 'error') {
      // Find the most recent 'active' task for this user and agent
      const existingActivity = await AgentActivity.findOne({
        user: userId,
        agentName,
        status: 'active'
      }).sort({ timestamp: -1 });

      if (existingActivity) {
        existingActivity.status = status;
        existingActivity.message = message;
        if (duration) existingActivity.duration = duration;
        existingActivity.timestamp = new Date(); // Update timestamp to completion time
        await existingActivity.save();
        activityUpdated = true;
      }
    }

    if (!activityUpdated) {
      await AgentActivity.create({
        user: userId,
        brandId,
        agentName,
        message,
        status,
        duration,
        timestamp: new Date()
      });
    }
    
    // Keep only the last 20 activities per user to prevent bloat
    const count = await AgentActivity.countDocuments({ user: userId });
    if (count > 20) {
      const oldest = await AgentActivity.find({ user: userId })
        .sort({ timestamp: 1 })
        .limit(count - 20);
      await AgentActivity.deleteMany({ _id: { $in: oldest.map(a => a._id) } });
    }
  } catch (error) {
    console.error(`[ACTIVITY ] ❌ Failed to log activity for ${userId}:`, error.message);
  }
};
