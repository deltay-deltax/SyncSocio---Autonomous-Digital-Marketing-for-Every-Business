export const startKeepAlivePoller = () => {
  const AI_AGENT_URL = process.env.AI_SERVICE_URL || 'https://velocity-ai-agents.onrender.com';
  const BACKEND_URL = `https://velocity-backend-87zk.onrender.com`; // Hardcoded for this project

  console.log('Starting Keep-Alive Poller to prevent Render servers from sleeping...');

  // Ping every 14 minutes (Render sleeps after 15 minutes of inactivity)
  const PING_INTERVAL = 14 * 60 * 1000;

  setInterval(async () => {
    try {
      console.log('Sending keep-alive ping to AI Agents...');
      const aiRes = await fetch(`${AI_AGENT_URL}/`);
      if (aiRes.ok) console.log('AI Agent ping successful.');
    } catch (err) {
      console.error('AI Agent ping failed:', err.message);
    }

    try {
      console.log('Sending keep-alive ping to self (Backend)...');
      const backendRes = await fetch(`${BACKEND_URL}/`);
      if (backendRes.ok) console.log('Backend self-ping successful.');
    } catch (err) {
      console.error('Backend self-ping failed:', err.message);
    }
  }, PING_INTERVAL);
};
