import { NextRequest, NextResponse } from 'next/server';
import { deleteFromR2, extractR2Key, isR2Configured } from '@/lib/r2';
import { authenticateRequest } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  if (!isR2Configured) {
    return NextResponse.json({ error: 'R2 is not configured' }, { status: 500 });
  }

  const auth = await authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'You must be signed in to delete files.' }, { status: 401 });
  }

  const { urls } = (await req.json()) as { urls?: string[] };

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: 'No urls provided' }, { status: 400 });
  }

  // Only delete R2 objects the caller actually owns. Both queries are made
  // with the caller's own JWT, so RLS (auth.uid() = user_id) restricts each
  // one to rows they own — a URL that isn't referenced by one of their own
  // notes or newspaper PDFs is silently dropped from the deletion set.
  const [notesResult, pdfsResult] = await Promise.all([
    auth.supabase.from('notes').select('image_url').in('image_url', urls),
    auth.supabase.from('newspaper_pdfs').select('pdf_url').in('pdf_url', urls),
  ]);

  const ownedUrls = new Set<string>([
    ...(notesResult.data || []).map((row) => row.image_url as string),
    ...(pdfsResult.data || []).map((row) => row.pdf_url as string),
  ]);

  const keys = urls
    .filter((url) => ownedUrls.has(url))
    .map(extractR2Key)
    .filter((key): key is string => Boolean(key));

  await deleteFromR2(keys);

  return NextResponse.json({ deleted: keys.length });
}
