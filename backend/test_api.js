import axios from 'axios';

const run = async () => {
  try {
    // 1. Login
    const loginRes = await axios.post('http://localhost:5050/api/auth/login', {
      email: 'guptaaaditya418031@gmail.com',
      password: 'Aadi@8416'
    });
    const token = loginRes.data.token;
    console.log('Login successful');

    // 2. Recommend Schedule
    const res = await axios.post('http://localhost:5050/api/posts/recommend-schedule', {
      postIds: ["6a379da9a21b6e70f2470909"],
      startDate: "2026-07-05",
      endDate: "2026-07-12",
      platforms: { instagram: true, facebook: false }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Recommend schedule success:', res.data);
  } catch (err) {
    if (err.response) {
      console.error('API Error:', err.response.status, err.response.data);
    } else {
      console.error('Request failed:', err.message);
    }
  }
};

run();
