import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth-server';
import { buildStoragePath, MEDIA_BUCKET } from '@/lib/media';
import { getEnv } from '@/lib/env';
import { getSupabaseServiceClient } from '@/lib/supabase';

async function signedUrl(storagePath: string) {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(storagePath, 60 * 30);
  return data?.signedUrl ?? null;
}

function extFromMimeType(mimeType: string) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'You must be signed in to use this feature.' }, { status: 401 });
  const userId = auth.userId;

  const body = (await request.json()) as { assetId?: string; prompt?: string };

  if (!body.assetId || !body.prompt?.trim()) {
    return NextResponse.json({ error: 'assetId and prompt are required.' }, { status: 400 });
  }

  const prompt = body.prompt.trim();
  const supabase = getSupabaseServiceClient();

  const { data: sourceAsset, error: sourceAssetError } = await supabase
    .from('media_assets')
    .select('id,user_id,filename,storage_path,mime_type,file_size_bytes')
    .eq('id', body.assetId)
    .eq('user_id', userId)
    .single();

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

  if (sourceAssetError || !sourceAsset) {
    return NextResponse.json({ error: 'Source asset not found.' }, { status: 404 });
  }

  const { data: downloadedImage, error: downloadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .download(sourceAsset.storage_path);

  if (downloadError || !downloadedImage) {
    return NextResponse.json({ error: downloadError?.message ?? 'Failed to load source image.' }, { status: 500 });
  }

  const env = getEnv();
  let editedBytes: Buffer;
  let editedMimeType = sourceAsset.mime_type;

  if (!env.OPENAI_API_KEY) {
    editedBytes = Buffer.from(await downloadedImage.arrayBuffer());
  } else {
    const imageFile = new File([await downloadedImage.arrayBuffer()], sourceAsset.filename, {
      type: sourceAsset.mime_type,
    });

    const form = new FormData();
    form.append('model', env.OPENAI_IMAGE_MODEL);
    form.append('prompt', prompt);
    form.append('image', imageFile);
    form.append('size', '1024x1024');

    const modelResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: form,
    });

    if (!modelResponse.ok) {
      return NextResponse.json({ error: 'Failed to generate edited image.' }, { status: 502 });
    }

    const modelJson = (await modelResponse.json()) as {
      data?: Array<{ b64_json?: string }>;
    };

    const b64Image = modelJson.data?.[0]?.b64_json;
    if (!b64Image) {
      return NextResponse.json({ error: 'Model did not return image data.' }, { status: 502 });
    }

    editedBytes = Buffer.from(b64Image, 'base64');
    editedMimeType = 'image/png';
  }

  const editedFilename = `${sourceAsset.filename.replace(/\.[a-zA-Z0-9]+$/, '')}-edited-${Date.now()}.${extFromMimeType(editedMimeType)}`;
  const editedStoragePath = buildStoragePath(userId, editedFilename, 'edits');

  const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(editedStoragePath, editedBytes, {
    contentType: editedMimeType,
    upsert: false,
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: editedAsset, error: editedInsertError } = await supabase
    .from('media_assets')
    .insert({
      user_id: userId,
      filename: editedFilename,
      storage_bucket: MEDIA_BUCKET,
      storage_path: editedStoragePath,
      mime_type: editedMimeType,
      file_size_bytes: editedBytes.byteLength,
    })
    .select('id,filename,storage_path,mime_type,file_size_bytes,created_at')
    .single();

  if (editedInsertError || !editedAsset) {
    return NextResponse.json({ error: editedInsertError?.message ?? 'Failed to save edited asset metadata.' }, { status: 500 });
  }

  const { data: editRow, error: photoEditError } = await supabase
    .from('photo_edits')
    .insert({
      user_id: userId,
      source_asset_id: sourceAsset.id,
      edited_asset_id: editedAsset.id,
      prompt,
      model: env.OPENAI_IMAGE_MODEL,
      status: 'completed',
    })
    .select('id,prompt,model,created_at,source_asset_id,edited_asset_id')
    .single();

  if (photoEditError || !editRow) {
    return NextResponse.json({ error: photoEditError?.message ?? 'Failed to save edit lineage.' }, { status: 500 });
  }

  return NextResponse.json({
    edit: {
      ...editRow,
      beforeUrl: await signedUrl(sourceAsset.storage_path),
      afterUrl: await signedUrl(editedAsset.storage_path),
      editedAsset,
    },
  });
}
