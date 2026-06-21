import { getSupabaseServerClient } from '@/lib/supabase/server';

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
 * Helper to get Telegram configuration dynamically.
 * Queries `telegram_config` table from the active tenant database.
 * Falls back to environment variables if the database config is missing or incomplete.
 */
async function getTelegramConfig(): Promise<{
  botToken: string | null;
  channelId: string | null;
  isEnabled: boolean;
}> {
  let botToken: string | null = null;
  let channelId: string | null = null;
  let isEnabled = false;
  let dbConfigured = false;

  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from('telegram_config')
      .select('bot_token, channel_id, is_enabled')
      .maybeSingle();

    if (!error && data) {
      dbConfigured = true;
      botToken = data.bot_token;
      channelId = data.channel_id;
      isEnabled = data.is_enabled;
    }
  } catch (err) {
    console.warn('Failed to query telegram_config from database, falling back to environment variables:', err);
  }

  // Fallback to process.env if DB not configured or tokens are unset
  if (!dbConfigured || !botToken || !channelId) {
    botToken = process.env.TELEGRAM_BOT_TOKEN || null;
    channelId = process.env.TELEGRAM_CHANNEL_ID || null;
    // For environment variables, we default to enabled if both are present
    isEnabled = !!(botToken && channelId);
  }

  return { botToken, channelId, isEnabled };
}

/**
 * Sends a formatted HTML message to the class Telegram channel.
 */
export async function sendTelegramMessage(
  title: string,
  body: string
): Promise<SendMessageResult> {
  const { botToken, channelId, isEnabled } = await getTelegramConfig();

  if (!isEnabled || !botToken || !channelId) {
    console.warn('Telegram not configured or disabled. Skipping Telegram post.');
    return { success: false, error: 'Telegram not configured or disabled' };
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
  const { botToken, channelId, isEnabled } = await getTelegramConfig();

  if (!isEnabled || !botToken || !channelId) {
    console.warn('Telegram not configured or disabled. Skipping Telegram file post.');
    return { success: false, error: 'Telegram not configured or disabled' };
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

