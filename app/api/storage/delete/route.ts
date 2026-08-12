import { NextRequest, NextResponse } from 'next/server';
import { deleteFromR2, extractR2Key, isR2Configured } from '@/lib/r2';

export async function POST(req: NextRequest) {
  if (!isR2Configured) {
    return NextResponse.json({ error: 'R2 is not configured' }, { status: 500 });
  }

  const { urls } = (await req.json()) as { urls?: string[] };

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: 'No urls provided' }, { status: 400 });
  }

  const keys = urls.map(extractR2Key).filter((key): key is string => Boolean(key));

  await deleteFromR2(keys);

  return NextResponse.json({ deleted: keys.length });
}
