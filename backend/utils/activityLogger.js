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
    await AgentActivity.create({
      user: userId,
      agentName,
      message,
      status,
      duration,
      timestamp: new Date()
    });
    
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
