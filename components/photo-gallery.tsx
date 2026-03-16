'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { captureClientError, trackEvent } from '@/lib/client-telemetry';
import { getAccessToken, getCurrentUser } from '@/lib/auth-client';

type Asset = {
  id: string;
  filename: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
  signedUrl: string | null;
};

type PhotoEdit = {
  id: string;
  prompt: string;
  model: string;
  created_at: string;
  source_asset_id: string;
  edited_asset_id: string;
  beforeUrl: string | null;
  afterUrl: string | null;
  editedAsset: Asset;
};

const DEFAULT_PROMPT = 'Make this image cinematic and improve lighting';

export function PhotoGallery() {
  const [userId, setUserId] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEdit, setLastEdit] = useState<PhotoEdit | null>(null);

  const selectedAsset = useMemo(() => assets.find((asset) => asset.id === selectedAssetId) ?? null, [assets, selectedAssetId]);

  async function authHeader() {
    const token = await getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : null;
  }

  async function loadAssets() {
    const headers = await authHeader();
    if (!headers) {
      setError('Please log in to load gallery assets.');
      return;
    }
    setError(null);

    const response = await fetch('/api/photo-assets', { headers });

    const json = (await response.json()) as { assets?: Asset[]; error?: string };
    if (!response.ok) {
      setError(json.error ?? 'Failed to load assets.');
      await captureClientError('gallery_load_failed', json.error ?? 'unknown');
      return;
    }

    const loadedAssets = json.assets ?? [];
    setAssets(loadedAssets);
    if (!selectedAssetId && loadedAssets[0]?.id) setSelectedAssetId(loadedAssets[0].id);
  }

  useEffect(() => {
    getCurrentUser().then((user) => {
      setUserId(user?.id ?? null);
      if (!user) {
        setError('You are logged out. Open Login in Settings to continue.');
      }
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    loadAssets().catch((err) => {
      setError('Failed to load gallery assets.');
      captureClientError('gallery_initial_load_failed', err);
    });
  }, [userId]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const headers = await authHeader();
      if (!headers) {
        setError('Please log in to upload images.');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/photo-assets', {
        method: 'POST',
        headers,
        body: formData,
      });

      const json = (await response.json()) as { asset?: Asset; error?: string };

      if (!response.ok || !json.asset) {
        setError(json.error ?? 'Upload failed.');
        await captureClientError('gallery_upload_failed', json.error ?? 'unknown');
        return;
      }

      setAssets((current) => [json.asset!, ...current]);
      setSelectedAssetId(json.asset.id);
      await trackEvent('image_uploaded', { userId, assetId: json.asset.id });
    } catch {
      setError('Upload request failed.');
      await captureClientError('gallery_upload_request_failed', 'request_failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleEdit() {
    if (!selectedAsset) return setError('Select an image first.');
    if (!prompt.trim()) return setError('Edit prompt is required.');

    setEditing(true);
    setError(null);

    try {
      const headers = await authHeader();
      if (!headers) {
        setError('Please log in to edit images.');
        return;
      }

      const response = await fetch('/api/photo-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ assetId: selectedAsset.id, prompt }),
      });

      const json = (await response.json()) as { edit?: PhotoEdit; error?: string };
      if (!response.ok || !json.edit) {
        setError(json.error ?? 'Failed to apply edit.');
        await captureClientError('gallery_edit_failed', json.error ?? 'unknown');
        return;
      }

      setLastEdit(json.edit);
      setAssets((current) => [json.edit!.editedAsset, ...current]);
      setSelectedAssetId(json.edit.editedAsset.id);
      await trackEvent('image_edited', { userId, sourceAssetId: json.edit.source_asset_id, editedAssetId: json.edit.editedAsset.id });
    } catch {
      setError('Edit request failed.');
      await captureClientError('gallery_edit_request_failed', 'request_failed');
    } finally {
      setEditing(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => loadAssets()} className="rounded-md bg-white/15 px-3 py-2 text-sm">Refresh Gallery</button>
        <label className="cursor-pointer rounded-md bg-blue-600 px-3 py-2 text-center text-sm">
          {uploading ? 'Uploading...' : 'Upload Image'}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload} disabled={uploading || !userId} />
        </label>
      </div>

      {error ? <p className="rounded border border-red-400/40 bg-red-500/10 p-2 text-xs text-red-200">{error}</p> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {assets.map((asset) => (
          <button
            key={asset.id}
            onClick={() => setSelectedAssetId(asset.id)}
            className={`rounded-lg border p-2 text-left ${selectedAssetId === asset.id ? 'border-blue-400 bg-blue-500/10' : 'border-white/20 bg-black/20'}`}
          >
            {asset.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.signedUrl} alt={asset.filename} className="mb-2 h-24 w-full rounded object-cover" />
            ) : (
              <div className="mb-2 h-24 w-full rounded bg-slate-800" />
            )}
            <p className="truncate text-xs font-medium">{asset.filename}</p>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-white/20 bg-black/20 p-3">
        <h3 className="mb-2 text-sm font-semibold">Image Detail</h3>
        {selectedAsset ? (
          <div className="space-y-3">
            {selectedAsset.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedAsset.signedUrl} alt={selectedAsset.filename} className="max-h-64 w-full rounded object-contain" />
            ) : (
              <div className="h-64 rounded bg-slate-800" />
            )}
            <p className="text-xs text-slate-300">
              {selectedAsset.filename} • {(selectedAsset.file_size_bytes / 1024 / 1024).toFixed(2)} MB • {selectedAsset.mime_type}
            </p>
            <div className="flex gap-2">
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="remove background, brighten face, cinematic color..."
                className="w-full rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm"
              />
              <button onClick={handleEdit} disabled={editing || !userId} className="rounded-md bg-violet-600 px-3 py-2 text-sm disabled:bg-violet-900">
                {editing ? 'Editing...' : 'Edit with GPT'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-300">Upload or select an image to view details.</p>
        )}
      </div>

      {lastEdit ? (
        <div className="rounded-lg border border-white/20 bg-black/20 p-3">
          <h3 className="mb-2 text-sm font-semibold">Before / After</h3>
          <p className="mb-2 text-xs text-slate-300">{lastEdit.prompt}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs uppercase text-slate-300">Before</p>
              {lastEdit.beforeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lastEdit.beforeUrl} alt="Before edit" className="h-48 w-full rounded object-cover" />
              ) : (
                <div className="h-48 rounded bg-slate-800" />
              )}
            </div>
            <div>
              <p className="mb-1 text-xs uppercase text-slate-300">After</p>
              {lastEdit.afterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lastEdit.afterUrl} alt="After edit" className="h-48 w-full rounded object-cover" />
              ) : (
                <div className="h-48 rounded bg-slate-800" />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
