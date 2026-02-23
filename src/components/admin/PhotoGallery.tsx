'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { adminApi } from '@/lib/api';

interface Doc {
  id:            string;
  file_url:      string;
  file_name:     string;
  doc_type:      string;
  is_main_image: boolean;
  sort_order:    number;
}

interface Props {
  vehicleId: string;
  stockId:   string;
  canEdit:   boolean;
}

// Valid doc_type values the API accepts for non-photo documents
const DOCUMENT_TYPES: { value: string; label: string }[] = [
  { value: 'cr_copy',        label: 'CR Copy'         },
  { value: 'import_doc',     label: 'Import Document' },
  { value: 'repair_invoice', label: 'Repair Invoice'  },
  { value: 'other',          label: 'Other Document'  },
];

function extractStorageError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    return String(e['message'] ?? e['error'] ?? e['statusCode'] ?? JSON.stringify(err));
  }
  return 'Unknown upload error';
}

export default function PhotoGallery({ vehicleId, stockId, canEdit }: Props) {
  const [docs,       setDocs]       = useState<Doc[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [uploading,  setUploading]  = useState(false);
  const [error,      setError]      = useState('');
  const [activeType, setActiveType] = useState<'photo' | 'document'>('photo');
  // For documents: which type to upload
  const [docType,    setDocType]    = useState<string>('cr_copy');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void loadDocs(); }, [vehicleId]);

  async function loadDocs() {
    setLoading(true);
    try {
      const data = await adminApi.getDocuments(vehicleId);
      setDocs(data as unknown as Doc[]);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');

    const supabase = createClient();

    for (const file of Array.from(files)) {
      try {
        // 1. Upload to Supabase Storage
        const ext  = file.name.split('.').pop() ?? 'bin';
        const path = `vehicles/${stockId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('vehicle-media')
          .upload(path, file, { upsert: false });

        if (uploadError) throw uploadError;

        // 2. Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('vehicle-media')
          .getPublicUrl(path);

        // 3. Register in DB via API
        const existingPhotos = docs.filter(d => d.doc_type === 'photo');
        // Use correct doc_type:  'photo' for photos, or the selected docType for documents
        const finalDocType = activeType === 'photo' ? 'photo' : docType;

        await adminApi.addDocument(vehicleId, {
          file_url:      publicUrl,
          file_name:     file.name,
          file_size:     file.size,
          doc_type:      finalDocType,
          is_main_image: activeType === 'photo' && existingPhotos.length === 0,
        } as Parameters<typeof adminApi.addDocument>[1]);

      } catch (err) {
        setError(`Failed to upload "${file.name}": ${extractStorageError(err)}`);
        break; // stop on first error so user sees the message
      }
    }

    await loadDocs();
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSetMain(doc: Doc) {
    try {
      await adminApi.setMainImage(vehicleId, doc.id);
      await loadDocs();
    } catch (err) {
      setError(extractStorageError(err));
    }
  }

  async function handleDelete(doc: Doc) {
    if (!confirm(`Delete "${doc.file_name}"?`)) return;
    try {
      await adminApi.deleteDocument(vehicleId, doc.id);
      await loadDocs();
    } catch (err) {
      setError(extractStorageError(err));
    }
  }

  const photos    = docs.filter(d => d.doc_type === 'photo');
  const documents = docs.filter(d => d.doc_type !== 'photo');
  const displayed = activeType === 'photo' ? photos : documents;

  return (
    <div>
      {/* Tab + upload controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {(['photo', 'document'] as const).map(type => (
          <button key={type} onClick={() => setActiveType(type)} style={{
            padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: activeType === type ? 'rgba(99,102,241,0.15)' : 'transparent',
            border:     activeType === type ? '1px solid rgba(99,102,241,0.3)' : '1px solid #1f2d45',
            color:      activeType === type ? '#818cf8' : '#5c7090',
          }}>
            {type === 'photo' ? `📷 Photos (${photos.length})` : `📄 Documents (${documents.length})`}
          </button>
        ))}

        {canEdit && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Document type selector — only shown when uploading documents */}
            {activeType === 'document' && (
              <select
                value={docType}
                onChange={e => setDocType(e.target.value)}
                style={{
                  background: '#07090f', border: '1px solid #1f2d45', borderRadius: 6,
                  padding: '6px 10px', fontSize: 12, color: '#dde4f0', cursor: 'pointer',
                  appearance: 'none',
                }}
              >
                {DOCUMENT_TYPES.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
              </select>
            )}

            <input
              ref={fileRef}
              type="file"
              multiple={activeType === 'photo'}
              accept={activeType === 'photo' ? 'image/*' : '*'}
              style={{ display: 'none' }}
              onChange={e => void handleUpload(e.target.files)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                padding: '6px 14px', borderRadius: 7,
                fontSize: 12, fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer',
                background: '#6366f1', border: 'none', color: '#fff',
                opacity: uploading ? 0.7 : 1,
              }}
            >
              {uploading ? 'Uploading…' : activeType === 'photo' ? '+ Upload Photos' : '+ Upload Document'}
            </button>
          </div>
        )}
      </div>

      {/* Hint text */}
      {activeType === 'photo' && (
        <div style={{ fontSize: 11, color: '#3d5270', marginBottom: 14, lineHeight: 1.5 }}>
          📸 Upload high-quality exterior &amp; interior photos only. Photos marked as main will appear on the website.
          Documents are kept private and never shown publicly.
        </div>
      )}
      {activeType === 'document' && (
        <div style={{ fontSize: 11, color: '#3d5270', marginBottom: 14, lineHeight: 1.5 }}>
          🔒 Documents are <strong style={{ color: '#5c7090' }}>private</strong> — they are never shown on the public website.
          Select the document type before uploading.
        </div>
      )}

      {error && (
        <div style={{ fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,0.1)', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
          ⚠️ {error}
          <button onClick={() => setError('')} style={{ marginLeft: 10, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>✕</button>
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: '#5c7090' }}>Loading…</div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#111827', borderRadius: 10, fontSize: 13, color: '#5c7090' }}>
          {activeType === 'photo' ? '📷 No photos uploaded yet' : '📄 No documents uploaded yet'}
          {canEdit && <div style={{ marginTop: 8, fontSize: 12 }}>Click Upload to add {activeType === 'photo' ? 'photos' : 'a document'}</div>}
        </div>
      ) : activeType === 'photo' ? (
        /* Photo grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {photos.map(photo => (
            <div key={photo.id} style={{
              position: 'relative', borderRadius: 8, overflow: 'hidden',
              border: photo.is_main_image ? '2px solid #6366f1' : '2px solid #1f2d45',
              background: '#0d1117',
            }}>
              <div style={{ position: 'relative', height: 120 }}>
                <Image src={photo.file_url} alt={photo.file_name} fill style={{ objectFit: 'cover' }} unoptimized />
              </div>

              {photo.is_main_image && (
                <div style={{
                  position: 'absolute', top: 6, left: 6,
                  background: '#6366f1', color: '#fff',
                  fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                }}>
                  MAIN
                </div>
              )}

              {canEdit && (
                <div style={{ display: 'flex', gap: 4, padding: '6px 8px', background: '#0d1117', justifyContent: 'space-between' }}>
                  {!photo.is_main_image && (
                    <button onClick={() => void handleSetMain(photo)} style={{
                      flex: 1, fontSize: 10, fontWeight: 600, background: 'rgba(99,102,241,0.1)',
                      border: '1px solid rgba(99,102,241,0.2)', borderRadius: 4,
                      color: '#818cf8', cursor: 'pointer', padding: '3px 0',
                    }}>
                      Set Main
                    </button>
                  )}
                  <button onClick={() => void handleDelete(photo)} style={{
                    fontSize: 12, background: 'none', border: 'none',
                    color: '#ef4444', cursor: 'pointer', padding: '2px 4px',
                  }}>
                    🗑
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Documents list */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {documents.map(doc => {
            const typeLabel = DOCUMENT_TYPES.find(dt => dt.value === doc.doc_type)?.label ?? doc.doc_type;
            return (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: '#111827', border: '1px solid #1f2d45',
                borderRadius: 8, padding: '10px 14px',
              }}>
                <span style={{ fontSize: 20 }}>📄</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#dde4f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.file_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#5c7090' }}>{typeLabel}</div>
                </div>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{
                  fontSize: 11, color: '#6366f1', textDecoration: 'none', fontWeight: 600,
                }}>
                  View ↗
                </a>
                {canEdit && (
                  <button onClick={() => void handleDelete(doc)} style={{
                    background: 'none', border: 'none', fontSize: 14,
                    color: '#ef4444', cursor: 'pointer', padding: '2px',
                  }}>
                    🗑
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}