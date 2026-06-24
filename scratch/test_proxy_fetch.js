async function testProxyPostWithCookie() {
  const url = 'https://classapp0.vercel.app/api/supabase-proxy/auth/v1/token?grant_type=password';
  console.log('Sending POST with new tenant cookie to deployed proxy:', url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Inject the cookie pointing to the new database luvpdldpdjzjimdzzikbg
        'Cookie': 'tenant_supabase_url=https://luvpdldpdjzjimdzzikbg.supabase.co; tenant_supabase_anon_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhc2VlInJlZiI6Imx1dnBkbHBkandqaW1kenppa2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NzM3MTYsImV4cCI6MjA5NzU0OTcxNn0.dummy'
      },
      body: JSON.stringify({ email: '2403021@student.ruet.ac.bd', password: 'password' })
    });
    console.log('Status Code:', res.status);
    const text = await res.text();
    console.log('Response Body:', text);
  } catch (err) {
    console.error('Fetch failed:', err.message);
  }
}

testProxyPostWithCookie();
