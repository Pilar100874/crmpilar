// Simple IndexedDB wrapper for offline data caching and sync queue

const DB_NAME = 'pilar_offline';
const DB_VERSION = 2;

interface OfflineAction {
  id: string;
  table: string;
  operation: 'update' | 'insert';
  data: Record<string, unknown>;
  matchColumn?: string;
  matchValue?: string;
  createdAt: string;
}

export interface OfflinePhoto {
  id: string;
  taskExecutionId: string;
  base64Data: string;
  fileName: string;
  bucket: string;
  fieldName: string; // photo_completion_url, photo_after_url, photo_before_url
  createdAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('photoQueue')) {
        db.createObjectStore('photoQueue', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheData(key: string, data: unknown): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('cache', 'readwrite');
  tx.objectStore('cache').put({ key, data, updatedAt: new Date().toISOString() });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  const db = await openDB();
  const tx = db.transaction('cache', 'readonly');
  const req = tx.objectStore('cache').get(key);
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result?.data ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function addToSyncQueue(action: OfflineAction): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  tx.objectStore('syncQueue').put(action);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSyncQueue(): Promise<OfflineAction[]> {
  const db = await openDB();
  const tx = db.transaction('syncQueue', 'readonly');
  const req = tx.objectStore('syncQueue').getAll();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeFromSyncQueue(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  tx.objectStore('syncQueue').delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearSyncQueue(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  tx.objectStore('syncQueue').clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Photo queue functions
export async function addToPhotoQueue(photo: OfflinePhoto): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('photoQueue', 'readwrite');
  tx.objectStore('photoQueue').put(photo);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPhotoQueue(): Promise<OfflinePhoto[]> {
  const db = await openDB();
  const tx = db.transaction('photoQueue', 'readonly');
  const req = tx.objectStore('photoQueue').getAll();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeFromPhotoQueue(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('photoQueue', 'readwrite');
  tx.objectStore('photoQueue').delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function base64ToBlob(base64: string): Blob {
  const parts = base64.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const byteString = atob(parts[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}
