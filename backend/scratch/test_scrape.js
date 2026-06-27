// test_scrape.js
import fetch from 'node-fetch'; // wait, let's see if node-fetch is installed, or use standard dynamic import / global fetch

async function run() {
  const url = 'https://aws.amazon.com/';
  console.log('Sending request to FastAPI for url:', url);
  try {
    const res = await fetch('http://127.0.0.1:8000/scrape-single-product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    console.log('Response status:', res.status);
    const data = await res.json();
    console.log('Response data keys:', Object.keys(data));
    console.log('Product Name:', data.name);
    console.log('Provider:', data.serviceProvider);
    console.log('Image length:', data.imageBase64 ? data.imageBase64.length : 0);
  } catch (err) {
    console.error('Error during fetch:', err);
  }
}

run();
