// scratch/test_turnstile.js
// Tests the local verify-turnstile endpoint to trace the exact cause of any 500 error.

async function run() {
  const url = 'http://localhost:3001/api/auth/verify-turnstile';
  console.log(`Sending POST to: ${url}`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Host': 'localhost:3001'
      },
      body: JSON.stringify({ token: 'dev-bypass-token' })
    });
    console.log(`Status: ${res.status} ${res.statusText}`);
    const data = await res.json();
    console.log('Response body:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
