import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const email = 'student@classapp.test';

async function sendEmail({ to, subject, htmlContent }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not defined in environment variables.');
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@classapp.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'ClassApp Support';

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email: to }],
      subject: subject,
      htmlContent: htmlContent,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Brevo Email Send Error:', errText);
    throw new Error(`Failed to send email via Brevo: ${response.statusText}`);
  }

  return await response.json();
}

async function test() {
  try {
    const tenantUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('Tenant URL:', tenantUrl);
    console.log('Service Role Key defined:', !!serviceRoleKey);

    const adminClient = createClient(tenantUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('Generating link for:', email);
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${siteUrl}/reset-password?type=recovery`,
      },
    });

    if (linkError) {
      console.error('generateLink error:', linkError);
      return;
    }

    console.log('Link data generated successfully:', linkData);
    const resetLink = linkData?.properties?.action_link;
    console.log('Action Link:', resetLink);

    if (!resetLink) {
      console.error('Action link is missing!');
      return;
    }

    console.log('Sending email...');
    const emailResult = await sendEmail({
      to: email,
      subject: 'Reset your ClassApp password',
      htmlContent: `<p>Hello, please reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
    });
    console.log('Email sent result:', emailResult);
  } catch (err) {
    console.error('Error during test:', err);
  }
}

test();
