// scratch/trigger_500.js
// Hits the local dev proxy endpoint on port 3001 to capture exact server stack traces.

async function run() {
  const url = 'http://localhost:3001/api/supabase-proxy/auth/v1/token?grant_type=password';
  console.log(`Sending test request to: ${url}`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // Pass standard headers that client.ts sends
        'apikey': 'proxy-managed',
        // Mock a cookie for tenant connection (pointing to local developer values)
        'Cookie': 'tenant_supabase_url=https%3A%2F%2Focdacnolqqiumgzlmprz.supabase.co; tenant_supabase_anon_key=sb_publishable_nEn8YyDUlVyFfYKpDuC7ew_tQuAyOOk'
      },
      body: JSON.stringify({
        email: 'cr@classapp.test',
        password: 'Password123!'
      })
    });
    console.log(`Status: ${res.status} ${res.statusText}`);
    const data = await res.json();
    console.log('Response body:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
