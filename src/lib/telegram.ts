/**
 * Telegram Bot API helper.
 * Called from server-side API routes only.
 * Never import this in client components.
 */

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

interface SendMessageResult {
  success: boolean;
  error?: string;
}

/**
 * Sends a formatted message to the class Telegram channel.
 */
export async function sendTelegramMessage(
  title: string,
  body: string
): Promise<SendMessageResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;

  if (!botToken || !channelId) {
    console.warn('Telegram credentials not configured. Skipping Telegram post.');
    return { success: false, error: 'Telegram not configured' };
  }

  // Format message with Markdown
  const message = `📢 *${escapeMarkdown(title)}*\n\n${escapeMarkdown(body)}`;

  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE}${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          text: message,
          parse_mode: 'MarkdownV2',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Telegram API error:', error);
      return { success: false, error: error.description ?? 'Telegram API error' };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return { success: false, error: 'Network error sending Telegram message' };
  }
}

/**
 * Escapes special characters for Telegram MarkdownV2.
 * The hyphen (-) must be at the END of the character class to be treated as a
 * literal hyphen and not as a range operator.
 */
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}
