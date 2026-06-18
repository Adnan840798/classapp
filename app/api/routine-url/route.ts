import { getSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { resolveSupabaseUrl } from '@/lib/utils/resolveUrl';

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from('class_routine')
    .select('image_url')
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const resolvedUrl = data?.image_url 
    ? await resolveSupabaseUrl(data.image_url) 
    : null;

  return NextResponse.json({ image_url: resolvedUrl });
}
export const dynamic = 'force-dynamic';
