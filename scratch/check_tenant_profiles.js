const { createClient } = require('@supabase/supabase-js');

const tenantUrl = 'https://luvpdlpdjzjimdzzikbg.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1dnBkbHBkanpqaW1kenppa2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NzM3MTYsImV4cCI6MjA5NzU0OTcxNn0.2c1EJsQlslYPcHFeP7ckMNEc8UUA1xg0o6FzcvktlY0';

const supabase = createClient(tenantUrl, anonKey);

async function check() {
  console.log('Querying profiles table in RUETCSE24A...');
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error('Error fetching profiles:', error.message);
  } else {
    console.log('Profiles in RUETCSE24A:', data);
  }
}

check();
