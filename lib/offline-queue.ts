"use client";

const DB_NAME = "baby-food-queue";
const STORE = "outbox";
const VERSION = 1;

export interface QueuedFeeding {
  id: string;
  createdAt: number;
  payload: Record<string, FormDataEntryValue | FormDataEntryValue[]>;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(payload: QueuedFeeding["payload"]): Promise<string> {
  const db = await open();
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add({ id, createdAt: Date.now(), payload });
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function listQueued(): Promise<QueuedFeeding[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedFeeding[]);
    req.onerror = () => reject(req.error);
  });
}

export async function remove(id: string): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function flush(
  send: (payload: QueuedFeeding["payload"]) => Promise<void>,
): Promise<{ flushed: number; failed: number }> {
  let flushed = 0;
  let failed = 0;
  const items = await listQueued();
  for (const it of items) {
    try {
      await send(it.payload);
      await remove(it.id);
      flushed++;
    } catch {
      failed++;
    }
  }
  return { flushed, failed };
}
