const { createClient } = require('@supabase/supabase-js');

const tenantUrl = 'https://luvpdlpdjzjimdzzikbg.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1dnBkbHBkanpqaW1kenppa2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NzM3MTYsImV4cCI6MjA5NzU0OTcxNn0.2c1EJsQlslYPcHFeP7ckMNEc8UUA1xg0o6FzcvktlY0';

const supabase = createClient(tenantUrl, anonKey);

async function test() {
  console.log('Testing if manage-student Edge Function is deployed on RUETCSE24A...');
  try {
    const { data, error } = await supabase.functions.invoke('manage-student', {
      body: { action: 'check' }
    });
    console.log('Response data:', data);
    console.log('Response error:', error);
  } catch (err) {
    console.error('Invoke threw error:', err);
  }
}

test();
