import { NextRequest, NextResponse } from 'next/server';
import { createPresignedUploadUrl, isR2Configured } from '@/lib/r2';

export async function POST(req: NextRequest) {
  if (!isR2Configured) {
    return NextResponse.json({ error: 'R2 is not configured' }, { status: 500 });
  }

  const { fileName, contentType } = (await req.json()) as { fileName?: string; contentType?: string };

  if (!fileName) {
    return NextResponse.json({ error: 'No fileName provided' }, { status: 400 });
  }

  const ext = fileName.split('.').pop() || 'webp';
  const key = `${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;

  const { uploadUrl, publicUrl } = await createPresignedUploadUrl(key, contentType || 'application/octet-stream');

  return NextResponse.json({ uploadUrl, publicUrl });
}
