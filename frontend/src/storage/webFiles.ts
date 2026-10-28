interface WebFileRecord {
  id: string;
  blob: Blob;
  name: string;
  updatedAt: number;
}

const DATABASE_NAME = 'lify-web-files';
const STORE_NAME = 'files';
const objectUrls = new Map<string, string>();
let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        databasePromise = null;
        reject(request.error ?? new Error('Could not open browser file storage.'));
      };
    });
  }
  return databasePromise;
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Browser file storage transaction aborted.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Browser file storage transaction failed.'));
  });
}

export function createWebFileId(prefix: string): string {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${suffix}`;
}

export async function saveWebFile(id: string, blob: Blob, name: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).put({ id, blob, name, updatedAt: Date.now() } satisfies WebFileRecord);
  await transactionDone(transaction);
}

export async function getWebFile(id: string): Promise<WebFileRecord | null> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const request = transaction.objectStore(STORE_NAME).get(id) as IDBRequest<WebFileRecord | undefined>;
  const record = await new Promise<WebFileRecord | null>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error ?? new Error('Could not read browser file storage.'));
  });
  await transactionDone(transaction);
  return record;
}

export async function deleteWebFile(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).delete(id);
  await transactionDone(transaction);
  const objectUrl = objectUrls.get(id);
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrls.delete(id);
}

export async function listWebFiles(prefix: string): Promise<WebFileRecord[]> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const request = transaction.objectStore(STORE_NAME).getAll() as IDBRequest<WebFileRecord[]>;
  const records = await new Promise<WebFileRecord[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result.filter((record) => record.id.startsWith(prefix)));
    request.onerror = () => reject(request.error ?? new Error('Could not list browser file storage.'));
  });
  await transactionDone(transaction);
  return records;
}

export async function getWebFileUrl(id: string): Promise<string | null> {
  const cached = objectUrls.get(id);
  if (cached) return cached;
  const record = await getWebFile(id);
  if (!record) return null;
  const objectUrl = URL.createObjectURL(record.blob);
  objectUrls.set(id, objectUrl);
  return objectUrl;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function pickWebFiles(accept: string, multiple = false): Promise<File[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.onchange = () => resolve(Array.from(input.files ?? []));
    input.oncancel = () => resolve([]);
    input.onerror = () => reject(new Error('Could not open the browser file picker.'));
    input.click();
  });
}
