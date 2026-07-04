export async function sendEmail({
  to,
  subject,
  htmlContent,
}: {
  to: string;
  subject: string;
  htmlContent: string;
}) {
  let apiKey = process.env.BREVO_API_KEY;
  let senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@classapp.com';
  let senderName = process.env.BREVO_SENDER_NAME || 'ClassApp Support';

  try {
    const { getSupabaseServerClient } = await import('@/lib/supabase/server');
    const supabase = await getSupabaseServerClient();
    const { data: dbConfig } = await supabase
      .from('brevo_config')
      .select('api_key, sender_email, sender_name, is_enabled')
      .eq('id', 1)
      .maybeSingle();

    if (dbConfig && dbConfig.is_enabled && dbConfig.api_key) {
      apiKey = dbConfig.api_key;
      senderEmail = dbConfig.sender_email || senderEmail;
      senderName = dbConfig.sender_name || senderName;
    }
  } catch (err) {
    console.warn('[sendEmail] Could not load tenant-specific brevo_config, using env fallback:', err);
  }

  if (!apiKey) {
    console.error('BREVO_API_KEY is not defined in environment variables or database.');
    throw new Error('Email sending is not configured.');
  }

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

export function getPasswordResetHtml(resetLink: string, userName: string = 'User') {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { background-color: #0f172a; color: #f8fafc; font-family: 'Inter', -apple-system, sans-serif; margin: 0; padding: 0; }
          .wrapper { width: 100%; background-color: #0f172a; padding: 40px 20px; box-sizing: border-box; }
          .container { max-width: 520px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 40px; }
          .logo { text-align: center; margin-bottom: 30px; }
          .logo-text { font-size: 24px; font-weight: 800; color: #f8fafc; letter-spacing: -0.05em; }
          .logo-accent { color: #10b981; }
          h1 { font-size: 22px; font-weight: 800; color: #f8fafc; margin: 0 0 12px 0; }
          p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #0f172a !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; }
          .link-fallback { background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; margin-bottom: 24px; word-break: break-all; }
          .link-fallback a { color: #10b981; font-size: 12px; text-decoration: none; }
          .footer { padding-top: 20px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="logo"><span class="logo-text">Class<span class="logo-accent">App</span></span></div>
            <h1>Reset your password?</h1>
            <p>Hello ${userName},</p>
            <p>We received a request to reset the password for your ClassApp account. Click the button below to set a new password:</p>
            <div class="btn-container">
              <a href="${resetLink}" class="btn" target="_blank">Reset Password</a>
            </div>
            <p>If the button above does not work, copy and paste this URL into your browser:</p>
            <div class="link-fallback"><a href="${resetLink}" target="_blank">${resetLink}</a></div>
            <p style="font-size: 12px; margin-bottom: 0;">If you did not request this, you can safely ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #334155; margin: 30px 0 20px 0;">
            <div class="footer">This email was sent automatically by ClassApp.<br>&copy; ${new Date().getFullYear()} ClassApp. All rights reserved.</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getOtpResetHtml(otpCode: string, userName: string = 'User') {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Password Reset Code</title>
        <style>
          body { background-color: #0f172a; color: #f8fafc; font-family: 'Inter', -apple-system, sans-serif; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
          .wrapper { width: 100%; background-color: #0f172a; padding: 40px 20px; box-sizing: border-box; }
          .container { max-width: 480px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); }
          .logo { text-align: center; margin-bottom: 28px; }
          .logo-text { font-size: 22px; font-weight: 800; color: #f8fafc; letter-spacing: -0.05em; }
          .logo-accent { color: #10b981; }
          h1 { font-size: 20px; font-weight: 800; color: #f8fafc; margin: 0 0 8px 0; text-align: center; letter-spacing: -0.02em; }
          .subtitle { font-size: 13px; color: #94a3b8; text-align: center; margin: 0 0 28px 0; }
          .otp-box { background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.08)); border: 2px solid rgba(16,185,129,0.35); border-radius: 16px; padding: 28px 20px; text-align: center; margin: 0 0 24px 0; }
          .otp-label { font-size: 11px; font-weight: 700; color: #10b981; text-transform: uppercase; letter-spacing: 0.12em; margin: 0 0 12px 0; }
          .otp-code { font-size: 48px; font-weight: 900; color: #f8fafc; letter-spacing: 0.22em; line-height: 1; margin: 0 0 14px 0; font-variant-numeric: tabular-nums; }
          .otp-expiry { font-size: 12px; color: #f59e0b; font-weight: 600; margin: 0; }
          p { font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0 0 16px 0; }
          .warning { background-color: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.2); border-radius: 10px; padding: 12px 14px; font-size: 12px; color: #fca5a5; line-height: 1.5; margin-bottom: 24px; }
          .footer { padding-top: 20px; border-top: 1px solid #334155; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="logo"><span class="logo-text">Class<span class="logo-accent">App</span></span></div>
            <h1>Password Reset Code</h1>
            <p class="subtitle">Hello ${userName}, here is your one-time reset code</p>

            <div class="otp-box">
              <p class="otp-label">Your verification code</p>
              <p class="otp-code">${otpCode}</p>
              <p class="otp-expiry">⏱ Expires in 5 minutes</p>
            </div>

            <p>Enter this code in the ClassApp reset screen along with your new password. Only the most recently requested code is valid — previous codes are automatically invalidated.</p>

            <div class="warning">
              🔒 Never share this code with anyone. ClassApp staff will never ask for it. If you did not request a password reset, ignore this email — your account remains secure.
            </div>

            <div class="footer">
              This email was sent automatically by ClassApp.<br>
              &copy; ${new Date().getFullYear()} ClassApp. All rights reserved.
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
