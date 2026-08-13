import { NextRequest, NextResponse } from 'next/server';
import { createPresignedUploadUrl, isR2Configured, ALLOWED_UPLOAD_CONTENT_TYPES, MAX_UPLOAD_BYTES } from '@/lib/r2';
import { authenticateRequest } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  if (!isR2Configured) {
    return NextResponse.json({ error: 'R2 is not configured' }, { status: 500 });
  }

  const auth = await authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'You must be signed in to upload files.' }, { status: 401 });
  }

  const { contentType, fileSize } = (await req.json()) as {
    contentType?: string;
    fileSize?: number;
  };

  const extension = contentType ? ALLOWED_UPLOAD_CONTENT_TYPES[contentType] : undefined;
  if (!extension) {
    return NextResponse.json({ error: 'Unsupported file type.' }, { status: 400 });
  }

  if (typeof fileSize !== 'number' || !Number.isFinite(fileSize) || fileSize <= 0) {
    return NextResponse.json({ error: 'A valid fileSize is required.' }, { status: 400 });
  }
  if (fileSize > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Files must be ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))}MB or smaller.` },
      { status: 400 }
    );
  }

  const key = `${Date.now()}_${Math.random().toString(36).substring(2)}.${extension}`;

  const { uploadUrl, publicUrl } = await createPresignedUploadUrl(key, contentType!, fileSize);

  return NextResponse.json({ uploadUrl, publicUrl });
}
