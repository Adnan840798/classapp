const url = 'https://luvpdldpdjzjimdzzikbg.supabase.co/auth/v1/token?grant_type=password';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1dnBkbHBkanpqaW1kenppa2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NzM3MTYsImV4cCI6MjA5NzU0OTcxNn0.2c1EJsQlslYPcHFeP7ckMNEc8UUA1xg0o6FzcvktlY0';

async function test() {
  console.log('Sending direct request to external tenant Auth...');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey
      },
      body: JSON.stringify({
        email: '2403021@student.ruet.ac.bd',
        password: 'password'
      })
    });
    console.log('Status Code:', res.status);
    console.log('Status Text:', res.statusText);
    const headers = {};
    res.headers.forEach((v, k) => { headers[k] = v; });
    console.log('Headers:', headers);
    const body = await res.text();
    console.log('Body:', body);
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

test();
