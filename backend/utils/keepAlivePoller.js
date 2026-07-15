export const startKeepAlivePoller = () => {
  const AI_AGENT_URL = process.env.AI_SERVICE_URL || 'https://syncsocio-ai-agents.onrender.com';
  const BACKEND_URL = process.env.BACKEND_URL || 'https://syncsocio-backend-87zk.onrender.com'; // Use env var for actual live backend

  console.log('Starting Keep-Alive Poller to prevent Render servers from sleeping...');

  // Ping every 10 minutes (Render sleeps after 15 minutes of inactivity)
  const PING_INTERVAL = 10 * 60 * 1000;

  const doPing = async () => {
    try {
      console.log('Sending keep-alive ping to AI Agents...');
      const aiRes = await fetch(`${AI_AGENT_URL}/health`);
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
  };

  // 🔑 Fire immediately on startup so the AI agent is pinged right after a deployment,
  // preventing the ~10-minute gap that causes Render to kill it.
  setTimeout(doPing, 15 * 1000); // small delay to let server fully boot first

  // Then continue pinging on the regular interval
  setInterval(doPing, PING_INTERVAL);
};

