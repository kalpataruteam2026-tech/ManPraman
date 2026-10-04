import { supabase, isSupabaseConfigured } from './client';
import type { Evidence, EvidenceKind } from '../domain/types';

/**
 * Computes a cryptographic SHA-256 digest in hex from a File, Blob, or ArrayBuffer.
 * Uses Web Crypto API (supported natively in modern browsers and node).
 */
export async function computeSha256(data: File | Blob | ArrayBuffer): Promise<string> {
  let buffer: ArrayBuffer;
  if (data instanceof ArrayBuffer) {
    buffer = data;
  } else {
    buffer = await data.arrayBuffer();
  }
  
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback simple hex hasher if crypto.subtle is unavailable
  let hash = 0;
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    hash = ((hash << 5) - hash) + bytes[i];
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Reads a File or Blob as a base64 Data URL.
 */
export function readFileAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a unique Evidence ID.
 */
export function generateEvidenceId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 7);
  return `ev_${timestamp}_${randomPart}`;
}

export interface UploadEvidenceParams {
  sessionId: string;
  kind: EvidenceKind;
  caption?: string;
  testId?: string;
  requirementId?: string;
  notes?: string;
  orderIndex?: number;
}

/**
 * Uploads an image to Supabase Storage and returns a fully populated Evidence record.
 * Keeps the original image completely unaltered.
 * Gracefully falls back to local storage (Dexie / Data URL) if offline or Supabase is unconfigured.
 */
export async function uploadEvidenceToStorage(
  file: File,
  params: UploadEvidenceParams
): Promise<Evidence> {
  const evidenceId = generateEvidenceId();
  const sha256 = await computeSha256(file);
  const dataUrl = await readFileAsDataUrl(file);
  const now = new Date().toISOString();

  let storagePath: string | undefined;
  let storageUrl: string | undefined;

  // If Supabase Storage is configured, upload the raw file to the 'evidence-photos' bucket
  if (isSupabaseConfigured() && supabase) {
    try {
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${params.sessionId}/${evidenceId}_${sanitizedFileName}`;

      const detectedMime = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('evidence-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: detectedMime,
        });

      if (!uploadError && uploadData) {
        storagePath = uploadData.path;
        const { data: urlData } = supabase.storage
          .from('evidence-photos')
          .getPublicUrl(storagePath);
        if (urlData?.publicUrl) {
          storageUrl = urlData.publicUrl;
        }
      } else if (uploadError) {
        console.warn('[Supabase Storage] Upload notice:', uploadError.message);
      }
    } catch (err) {
      console.warn('[Supabase Storage] Notice during upload:', err);
    }
  }

  const finalMime = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

  const evidenceItem: Evidence = {
    id: evidenceId,
    sessionId: params.sessionId,
    testId: params.testId,
    requirementId: params.requirementId,
    kind: params.kind,
    caption: params.caption || file.name.replace(/\.[^/.]+$/, ''),
    notes: params.notes,
    fileName: file.name,
    fileSize: file.size,
    mimeType: finalMime,
    dataUrl: dataUrl, // ALWAYS keep base64 Data URL so local viewing and PDF generation always work 100% offline!
    storagePath: storagePath || undefined,
    storageUrl: storageUrl || undefined,
    sha256,
    orderIndex: params.orderIndex ?? 0,
    createdAt: now,
  };

  return evidenceItem;
}

/**
 * Replaces an existing evidence file with a new one while maintaining the same metadata.
 * Computes new SHA-256 and updates Supabase Storage and Data URL.
 */
export async function replaceEvidenceFileInStorage(
  existing: Evidence,
  newFile: File
): Promise<Evidence> {
  const sha256 = await computeSha256(newFile);
  const dataUrl = await readFileAsDataUrl(newFile);

  let storagePath = existing.storagePath;
  let storageUrl = existing.storageUrl;

  if (isSupabaseConfigured() && supabase) {
    try {
      const sanitizedFileName = newFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${existing.sessionId}/${existing.id}_${sanitizedFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('evidence-photos')
        .upload(filePath, newFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: newFile.type || 'image/jpeg',
        });

      if (!uploadError && uploadData) {
        storagePath = uploadData.path;
        const { data: urlData } = supabase.storage
          .from('evidence-photos')
          .getPublicUrl(storagePath);
        if (urlData?.publicUrl) {
          storageUrl = urlData.publicUrl;
        }
      }
    } catch (err) {
      console.warn('[Supabase Storage] Replace error:', err);
    }
  }

  const updated: Evidence = {
    ...existing,
    fileName: newFile.name,
    fileSize: newFile.size,
    mimeType: newFile.type || 'image/jpeg',
    dataUrl: dataUrl,
    storagePath: storagePath || undefined,
    storageUrl: storageUrl || undefined,
    sha256,
  };

  return updated;
}
