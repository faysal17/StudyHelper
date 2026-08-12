// One-time migration: moves scanned-note images still hosted on Supabase
// Storage into Cloudflare R2, and repoints notes.image_url at the new URL.
//
// Usage: node --env-file=.env.local scripts/migrate-notes-to-r2.mjs
//
// Safe to re-run: notes already migrated no longer match the
// '/scanned-notes/' filter, so they're skipped on subsequent runs.

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const testEmail = process.env.TEST_USER_EMAIL;
const testPassword = process.env.TEST_USER_PASSWORD;

const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2Bucket = process.env.R2_BUCKET_NAME;
const r2PublicUrl = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '').replace(/\/$/, '');

if (!supabaseUrl || !supabaseAnonKey || !testEmail || !testPassword) {
  console.error('Missing Supabase or TEST_USER_* env vars. Run via: node --env-file=.env.local scripts/migrate-notes-to-r2.mjs');
  process.exit(1);
}
if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2Bucket || !r2PublicUrl) {
  console.error('Missing R2_* / NEXT_PUBLIC_R2_PUBLIC_URL env vars.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
});

async function main() {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  if (signInError) throw signInError;

  const { data: notes, error } = await supabase
    .from('notes')
    .select('id, image_url')
    .ilike('image_url', '%/scanned-notes/%');
  if (error) throw error;

  console.log(`Found ${notes.length} note(s) still hosted on Supabase Storage.`);

  let migrated = 0;
  let failed = 0;

  for (const note of notes) {
    try {
      const res = await fetch(note.image_url);
      if (!res.ok) {
        console.error(`  [skip] ${note.id}: fetch failed (${res.status}) for ${note.image_url}`);
        failed++;
        continue;
      }

      const contentType = res.headers.get('content-type') || 'image/webp';
      const buffer = Buffer.from(await res.arrayBuffer());
      const ext = note.image_url.split('.').pop().split('?')[0] || 'webp';
      const key = `migrated_${note.id}.${ext}`;

      await r2.send(
        new PutObjectCommand({ Bucket: r2Bucket, Key: key, Body: buffer, ContentType: contentType })
      );

      const newUrl = `${r2PublicUrl}/${key}`;
      const { error: updateError } = await supabase
        .from('notes')
        .update({ image_url: newUrl })
        .eq('id', note.id);

      if (updateError) {
        console.error(`  [skip] ${note.id}: DB update failed - ${updateError.message}`);
        failed++;
        continue;
      }

      console.log(`  [ok] ${note.id}: ${note.image_url} -> ${newUrl}`);
      migrated++;
    } catch (err) {
      console.error(`  [skip] ${note.id}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Migrated: ${migrated}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
