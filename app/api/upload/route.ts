import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, isR2Configured } from '@/lib/r2';

export async function POST(req: NextRequest) {
  if (!isR2Configured) {
    return NextResponse.json({ error: 'R2 is not configured' }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const fileExt = file.name.split('.').pop() || 'webp';
  const key = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const publicUrl = await uploadToR2(key, buffer, file.type || 'image/webp');

  return NextResponse.json({ url: publicUrl });
}
