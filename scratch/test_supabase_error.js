const http = require('http');
const { createClient } = require('@supabase/supabase-js');

// 1. Start a mock server on port 4000 that returns 502
const server = http.createServer((req, res) => {
  res.writeHead(502, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: 'Connection to database server failed: getaddrinfo ENOTFOUND luvpdldpdjzjimdzzikbg.supabase.co'
  }));
});

server.listen(4000, async () => {
  console.log('Mock server listening on port 4000...');
  
  // 2. Initialize Supabase client pointing to the mock server
  const supabase = createClient('http://localhost:4000', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIn0.dummyKey');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password'
    });
    
    console.log('--- Result ---');
    console.log('Data:', data);
    console.log('Error:', error);
    if (error) {
      console.log('Error is instanceof Error:', error instanceof Error);
      console.log('Error Keys:', Object.keys(error));
      console.log('Error Message:', error.message);
      console.log('Error Stringified:', JSON.stringify(error));
      console.log('Error toString():', error.toString());
    }
  } catch (err) {
    console.error('Exception thrown:', err);
  } finally {
    server.close();
  }
});
