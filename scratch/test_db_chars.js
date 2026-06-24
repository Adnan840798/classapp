async function testAlternateConnectivity() {
  const url = 'https://ocdacnolqqiumgzlmprz.supabase.co/auth/v1/health';
  console.log(`Pinging CLASS2026 health: ${url}`);
  try {
    const res = await fetch(url);
    console.log('Status Code:', res.status);
    const body = await res.text();
    console.log('Response Body:', body);
  } catch (err) {
    console.error('Network request failed:', err.message);
  }
}

testAlternateConnectivity();
