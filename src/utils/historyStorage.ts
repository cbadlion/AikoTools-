import { HistoryItem, ProcessResult } from '../types';

const DB_NAME = 'aikotools_history_v1';
const STORE_NAME = 'results';
const DB_VERSION = 1;
const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hour = 3600000 ms

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generate a tiny lightweight thumbnail (dataURL) from a Blob for ultra-fast history list rendering
 */
async function generateThumbnail(blob: Blob): Promise<string | undefined> {
  try {
    if (blob.type.startsWith('image/')) {
      // Fast path: use native off-thread createImageBitmap if supported
      if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
        try {
          const bmp = await createImageBitmap(blob);
          const maxDim = 80;
          let w = bmp.width || 80;
          let h = bmp.height || 80;
          if (w > h) {
            h = Math.max(1, Math.round((h * maxDim) / w));
            w = maxDim;
          } else {
            w = Math.max(1, Math.round((w * maxDim) / h));
            h = maxDim;
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(bmp, 0, 0, w, h);
            bmp.close();
            return canvas.toDataURL('image/webp', 0.5);
          }
          bmp.close();
        } catch {
          // Fallback to Image DOM path
        }
      }

      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = url;
      });

      const maxDim = 80;
      let w = img.naturalWidth || 80;
      let h = img.naturalHeight || 80;
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, w);
      canvas.height = Math.max(1, h);
      const ctx = canvas.getContext('2d');
      let dataUrl: string | undefined;
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        dataUrl = canvas.toDataURL('image/webp', 0.5);
      }
      URL.revokeObjectURL(url);
      return dataUrl;
    }
  } catch {
    // Ignore thumbnail error
  }
  return undefined;
}

export async function saveToHistory(
  result: ProcessResult,
  toolName: string
): Promise<HistoryItem> {
  const now = Date.now();
  const id = `item_${now}_${Math.random().toString(36).substr(2, 6)}`;
  const expiresAt = now + ONE_HOUR_MS;

  const previewThumbnail = await generateThumbnail(result.blob);

  const item: HistoryItem = {
    id,
    createdAt: now,
    expiresAt,
    fileName: result.fileName,
    originalFileName: result.fileName,
    format: result.format,
    originalSize: result.originalSize,
    newSize: result.newSize,
    width: result.width,
    height: result.height,
    toolName,
    url: result.url || URL.createObjectURL(result.blob),
    blob: result.blob,
    previewThumbnail
  };

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const req = store.put({
        id: item.id,
        createdAt: item.createdAt,
        expiresAt: item.expiresAt,
        fileName: item.fileName,
        originalFileName: item.originalFileName,
        format: item.format,
        originalSize: item.originalSize,
        newSize: item.newSize,
        width: item.width,
        height: item.height,
        toolName: item.toolName,
        blob: item.blob,
        previewThumbnail: item.previewThumbnail
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aikotools:history_updated'));
    }
  } catch (err) {
    console.warn('Could not persist to IndexedDB:', err);
  }

  return item;
}

export async function getHistory(): Promise<HistoryItem[]> {
  const now = Date.now();
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result || [];
        const validItems: HistoryItem[] = [];
        const expiredIds: string[] = [];

        for (const r of results) {
          if (r.expiresAt && r.expiresAt <= now) {
            expiredIds.push(r.id);
          } else {
            validItems.push({
              ...r,
              url: r.blob ? URL.createObjectURL(r.blob) : (r.url || '')
            });
          }
        }

        // Delete expired records
        if (expiredIds.length > 0) {
          for (const id of expiredIds) {
            store.delete(id);
          }
        }

        // Sort latest first
        validItems.sort((a, b) => b.createdAt - a.createdAt);
        resolve(validItems);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function cleanExpiredHistory(): Promise<void> {
  const now = Date.now();
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const req = store.getAll();
    req.onsuccess = () => {
      const results = req.result || [];
      let deleted = false;
      for (const r of results) {
        if (r.expiresAt && r.expiresAt <= now) {
          store.delete(r.id);
          deleted = true;
        }
      }
      if (deleted && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('aikotools:history_updated'));
      }
    };
  } catch {
    // Ignore error
  }
}

export async function deleteHistoryItem(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aikotools:history_updated'));
    }
  } catch (err) {
    console.error('Error deleting history item:', err);
  }
}

export async function clearAllHistory(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aikotools:history_updated'));
    }
  } catch (err) {
    console.error('Error clearing history:', err);
  }
}

export function formatTimeRemaining(expiresAt: number): string {
  const diffMs = expiresAt - Date.now();
  if (diffMs <= 0) return 'Expirado';

  const mins = Math.floor(diffMs / (1000 * 60));
  const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}
