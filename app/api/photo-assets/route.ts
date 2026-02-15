import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth-server';
import { buildStoragePath, isAllowedImageMimeType, MAX_IMAGE_SIZE_BYTES, MEDIA_BUCKET } from '@/lib/media';
import { getSupabaseServiceClient } from '@/lib/supabase';

async function signAssetUrl(storagePath: string) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(storagePath, 60 * 30);
  if (error) return null;
  return data.signedUrl;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'You must be signed in to use this feature.' }, { status: 401 });
  const userId = auth.userId;

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('media_assets')
    .select('id,filename,storage_bucket,storage_path,mime_type,file_size_bytes,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const assets = await Promise.all(
    (data ?? []).map(async (asset) => ({
      ...asset,
      signedUrl: await signAssetUrl(asset.storage_path),
    })),
  );

  return NextResponse.json({ assets });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'You must be signed in to use this feature.' }, { status: 401 });
  const userId = auth.userId;

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Image file is required.' }, { status: 400 });
  }

  if (!isAllowedImageMimeType(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type. Use JPG, PNG, or WEBP.' }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  const [{ count: imageCount }, { data: limits }] = await Promise.all([
    supabase.from('media_assets').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('user_usage_limits').select('max_images').eq('user_id', userId).maybeSingle(),
  ]);

  const maxImages = limits?.max_images ?? 100;
  if ((imageCount ?? 0) >= maxImages) {
    return NextResponse.json(
      { error: `You reached your free-tier image limit (${maxImages}). Delete old images or upgrade your plan.` },
      { status: 429 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const storagePath = buildStoragePath(userId, file.name, 'uploads');

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, Buffer.from(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: asset, error: insertError } = await supabase
    .from('media_assets')
    .insert({
      user_id: userId,
      filename: file.name,
      storage_bucket: MEDIA_BUCKET,
      storage_path: storagePath,
      mime_type: file.type,
      file_size_bytes: file.size,
    })
    .select('id,filename,storage_bucket,storage_path,mime_type,file_size_bytes,created_at')
    .single();

  if (insertError || !asset) {
    return NextResponse.json({ error: insertError?.message ?? 'Failed to create media row.' }, { status: 500 });
  }

  const signedUrl = await signAssetUrl(asset.storage_path);

  return NextResponse.json({ asset: { ...asset, signedUrl } }, { status: 201 });
}
