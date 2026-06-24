const http = require('http');
const { createClient } = require('@supabase/supabase-js');

const server = http.createServer((req, res) => {
  res.writeHead(400, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: 'connection_failed',
    error_description: 'Connection to database server failed: getaddrinfo ENOTFOUND luvpdldpdjzjimdzzikbg.supabase.co'
  }));
});

server.listen(4002, async () => {
  console.log('Mock server listening on port 4002...');
  const supabase = createClient('http://localhost:4002', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIn0.dummyKey');

  const { error } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password'
  });

  console.log('--- Result for 400 ---');
  console.log('Error Name:', error ? error.name : 'no error');
  console.log('Error Status:', error ? error.status : 'no error');
  console.log('Error Message:', error ? error.message : 'no error');

  server.close();
});
