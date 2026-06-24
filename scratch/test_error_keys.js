const http = require('http');
const { createClient } = require('@supabase/supabase-js');

const payloads = [
  { error: 'connection_failed', error_description: 'Failed to connect description' },
  { msg: 'Failed to connect msg' },
  { message: 'Failed to connect message' },
  { error: 'Failed to connect error only' },
];

let currentIndex = 0;

const server = http.createServer((req, res) => {
  res.writeHead(502, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payloads[currentIndex]));
});

server.listen(4001, async () => {
  const supabase = createClient('http://localhost:4001', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIn0.dummyKey');

  for (let i = 0; i < payloads.length; i++) {
    currentIndex = i;
    const { error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password'
    });
    console.log(`Payload: ${JSON.stringify(payloads[i])}`);
    console.log(`Parsed Message: "${error ? error.message : 'no error'}"`);
    console.log('----------------');
  }

  server.close();
});
