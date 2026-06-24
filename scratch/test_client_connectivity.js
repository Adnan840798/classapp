async function testClientConnectivity() {
  const url = 'https://luvpdlpdjzjimdzzikbg.supabase.co/auth/v1/health';
  console.log(`Pinging client health endpoint with 5s timeout: ${url}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    console.log('Status Code:', res.status);
    const body = await res.text();
    console.log('Response Body:', body);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('Request timed out (5s)');
    } else {
      console.error('Network request failed:', err);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

testClientConnectivity();
