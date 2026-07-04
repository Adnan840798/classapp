import { createClient } from '@supabase/supabase-js';

const tenantAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1dnBkbHBkanpqaW1kenppa2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NzM3MTYsImV4cCI6MjA5NzU0OTcxNn0.2c1EJsQlslYPcHFeP7ckMNEc8UUA1xg0o6FzcvktlY0';

const supabase = createClient(
  'https://luvpdlpdjzjimdzzikbg.supabase.co',
  tenantAnonKey
);

const tablesToCheck = [
  'smtp_config',
  'brevo_config',
  'email_config',
  'mail_config',
  'tenant_config',
  'telegram_config'
];

async function main() {
  for (const table of tablesToCheck) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      if (error.code === '42P01') {
        console.log(`Table '${table}' does NOT exist.`);
      } else {
        console.log(`Table '${table}' exists but returned error:`, error.message, 'code:', error.code);
      }
    } else {
      console.log(`Table '${table}' exists and was successfully queried!`);
    }
  }
}

main();
