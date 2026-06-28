const axios = require('axios');

async function testMetrics() {
  try {
    const loginRes = await axios.post('http://localhost:5050/api/admin/login', {
      email: 'admin@velocity.com',
      password: 'velocityAdmin123!'
    });
    
    const token = loginRes.data.token;
    console.log('Login successful, got token:', token);

    const metricsRes = await axios.get('http://localhost:5050/api/admin/metrics', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Metrics success:', metricsRes.data.success);
    console.log('Metrics data:', JSON.stringify(metricsRes.data.metrics, null, 2));
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

testMetrics();
