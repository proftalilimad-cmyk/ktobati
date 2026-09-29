/**
 * Minimal IndexedDB blob store for uploaded covers & book files.
 * Blobs persist across reloads; object URLs are cached in memory for rendering.
 */
const DB_NAME = 'maktaba-assets';
const STORE = 'blobs';
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;
const urlCache = new Map<string, string>();

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function putAsset(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  // refresh cached URL
  const old = urlCache.get(id);
  if (old) URL.revokeObjectURL(old);
  urlCache.set(id, URL.createObjectURL(blob));
}

export async function getAssetBlob(id: string): Promise<Blob | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAsset(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  const old = urlCache.get(id);
  if (old) URL.revokeObjectURL(old);
  urlCache.delete(id);
}

/** Synchronous cached object URL (empty string if not yet loaded). */
export function assetUrl(id?: string): string {
  if (!id) return '';
  return urlCache.get(id) ?? '';
}

/** Preload all referenced asset ids into the URL cache. */
export async function preloadAssets(ids: string[]): Promise<void> {
  await Promise.all(
    ids.filter(Boolean).map(async (id) => {
      if (urlCache.has(id)) return;
      const blob = await getAssetBlob(id);
      if (blob) urlCache.set(id, URL.createObjectURL(blob));
    }),
  );
}

export function fileFormat(name: string): string {
  const ext = name.split('.').pop()?.toUpperCase() ?? '';
  return ext;
}
