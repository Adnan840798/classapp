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
          body { background-color: #f8fafc; color: #334155; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
          .wrapper { width: 100%; background-color: #f8fafc; padding: 48px 24px; box-sizing: border-box; }
          .container { max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); }
          .logo { margin-bottom: 32px; }
          .logo-text { font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.04em; }
          .logo-accent { color: #10b981; }
          h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; letter-spacing: -0.02em; }
          p { font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px 0; }
          .btn-container { margin: 32px 0; }
          .btn { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); }
          .link-fallback { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 24px; word-break: break-all; }
          .link-fallback a { color: #059669; font-size: 13px; text-decoration: none; font-family: monospace; }
          .footer { padding-top: 24px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="logo"><span class="logo-text">Class<span class="logo-accent">App</span></span></div>
            <h1>Reset your password</h1>
            <p>Hello ${userName},</p>
            <p>We received a request to reset the password for your ClassApp account. Click the button below to secure a new password:</p>
            <div class="btn-container">
              <a href="${resetLink}" class="btn" target="_blank">Reset Password</a>
            </div>
            <p>If the button doesn't work, copy and paste this URL into your browser:</p>
            <div class="link-fallback"><a href="${resetLink}" target="_blank">${resetLink}</a></div>
            <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">If you did not request this password reset, you can safely ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 32px 0 24px 0;">
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

export function getOtpResetHtml(otpCode: string, userName: string = 'User') {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Password Reset Code</title>
        <style>
          body { background-color: #f8fafc; color: #334155; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
          .wrapper { width: 100%; background-color: #f8fafc; padding: 48px 24px; box-sizing: border-box; }
          .container { max-width: 480px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); }
          .logo { text-align: center; margin-bottom: 28px; }
          .logo-text { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.04em; }
          .logo-accent { color: #10b981; }
          h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; text-align: center; letter-spacing: -0.02em; }
          .subtitle { font-size: 14px; color: #64748b; text-align: center; margin: 0 0 32px 0; }
          .otp-box { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px 24px; text-align: center; margin: 0 0 28px 0; }
          .otp-label { font-size: 11px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 16px 0; }
          .otp-code { font-size: 40px; font-weight: 900; color: #0f172a; letter-spacing: 0.2em; line-height: 1; margin: 0 0 16px 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-variant-numeric: tabular-nums; user-select: all; -webkit-user-select: all; -moz-user-select: all; cursor: pointer; }
          .otp-expiry { font-size: 12px; color: #d97706; font-weight: 600; margin: 0; display: inline-flex; align-items: center; gap: 4px; }
          p { font-size: 14px; color: #475569; line-height: 1.65; margin: 0 0 20px 0; }
          .warning { background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 16px; font-size: 12px; color: #b45309; line-height: 1.6; margin-bottom: 32px; }
          .footer { padding-top: 24px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="logo"><span class="logo-text">Class<span class="logo-accent">App</span></span></div>
            <h1>Reset verification code</h1>
            <p class="subtitle">Hello ${userName}, here is your one-time verification code</p>

            <div class="otp-box">
              <p class="otp-label">Your reset code</p>
              <div class="otp-code">${otpCode}</div>
              <p style="font-size: 11px; color: #94a3b8; margin: 0 0 16px 0;">💡 Tap or double-click the code to select & copy</p>
              <p class="otp-expiry">⏱ Expires in 5 minutes</p>
            </div>

            <p>Enter this code in ClassApp along with your new password to complete the reset. For your security, this code can only be used once, and requesting a new code automatically invalidates previous ones.</p>

            <div class="warning">
              <strong> Security Reminder:</strong> Never share this code with anyone. ClassApp support staff will never ask for this code. 
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
