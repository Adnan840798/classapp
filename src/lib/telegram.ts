/**
 * Telegram Bot API helper.
 * Called from server-side API routes and server actions only.
 * Never import this in client components.
 */

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

interface SendMessageResult {
  success: boolean;
  error?: string;
}

/**
 * Escapes special characters for Telegram HTML mode.
 */
export function escapeHTML(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sends a formatted HTML message to the class Telegram channel.
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

  // Format message with HTML tags
  const message = `📢 <b>${escapeHTML(title)}</b>\n\n${escapeHTML(body)}`;

  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE}${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          text: message,
          parse_mode: 'HTML',
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
 * Sends a file (image or document) with HTML formatted caption to the Telegram channel.
 *
 * For images  → uses sendPhoto  (inline preview in the channel).
 * For PDFs    → uses sendDocument (file download button).
 *
 * @param file     - The original File object (from FormData)
 * @param caption  - Short caption shown beneath the file in Telegram (will be escaped inside)
 */
export async function sendTelegramFile(
  file: File,
  caption: string
): Promise<SendMessageResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;

  if (!botToken || !channelId) {
    console.warn('Telegram credentials not configured. Skipping Telegram file post.');
    return { success: false, error: 'Telegram not configured' };
  }

  const isImage = file.type.startsWith('image/');
  const endpoint = isImage ? 'sendPhoto' : 'sendDocument';
  const fieldName = isImage ? 'photo' : 'document';

  try {
    const form = new FormData();
    form.set('chat_id', channelId);
    
    // Telegram caption limit is 1024 chars; truncate safely
    form.set('caption', caption.slice(0, 1020));
    form.set('parse_mode', 'HTML');
    
    // Append the file under the correct field name for the API endpoint
    form.set(fieldName, file, file.name);

    const response = await fetch(
      `${TELEGRAM_API_BASE}${botToken}/${endpoint}`,
      {
        method: 'POST',
        body: form,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error(`Telegram ${endpoint} error:`, error);
      return { success: false, error: error.description ?? 'Telegram API error' };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send Telegram file:', error);
    return { success: false, error: 'Network error sending Telegram file' };
  }
}
