import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import { getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * POST /api/telegram
 * Internal route to post an announcement to the Telegram channel.
 * Called by server actions after creating an announcement.
 * Sets telegram_posted = true on success to prevent duplicate posts.
 */
export async function POST(request: NextRequest) {
  try {
    const { title, body, announcementId } = await request.json();

    if (!title || !body) {
      return NextResponse.json(
        { error: 'title and body are required.' },
        { status: 400 }
      );
    }

    const result = await sendTelegramMessage(title, body);

    // Mark announcement as telegram_posted in DB
    if (result.success && announcementId) {
      const supabase = await getSupabaseServerClient();
      await supabase
        .from('announcements')
        .update({ telegram_posted: true })
        .eq('id', announcementId)
        .eq('telegram_posted', false); // idempotent guard
    }

    if (!result.success) {
      // Non-fatal: log but don't fail the request
      console.warn('Telegram post failed (non-fatal):', result.error);
    }

    return NextResponse.json({ success: result.success, error: result.error });
  } catch (error) {
    console.error('Telegram route error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
