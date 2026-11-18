import { validateNotebook } from './notebook.mjs';
import { mergeNotebook } from './notebook-merge.mjs';

let dbPromise;
function database() {
  if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('weighing-lab-notebook', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('workspace');
      request.result.createObjectStore('photos');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { dbPromise = null; reject(request.error); };
    request.onblocked = () => { dbPromise = null; reject(new Error('別の画面を閉じて再読み込みしてください。')); };
  });
  return dbPromise;
}

export async function readNotebook() {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction('workspace').objectStore('workspace').get('notes');
    request.onsuccess = () => {
      try { resolve(validateNotebook(request.result || { schema: 1, notes: [] })); }
      catch (error) { reject(error); }
    };
    request.onerror = () => reject(request.error);
  });
}

// Notes, new photo blobs, and removed photo cleanup commit together.
export async function writeNotebook(notes, newPhotos = new Map(), baseNotes) {
  validateNotebook({ schema: 1, notes });
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['workspace', 'photos'], 'readwrite');
    let saved, failure;
    const workspace = tx.objectStore('workspace');
    const request = workspace.get('notes');
    request.onsuccess = () => {
      try {
        const remote = validateNotebook(request.result || { schema: 1, notes: [] });
        saved = validateNotebook({ schema: 1, notes: baseNotes === undefined ? notes : mergeNotebook(baseNotes, notes, remote.notes) });
        workspace.put(saved, 'notes');
        const refs = new Set(saved.notes.flatMap(n => n.steps.flatMap(s => s.photos.map(p => p.id))));
        const store = tx.objectStore('photos');
        for (const [id, file] of newPhotos) if (refs.has(id)) store.put(file, id);
        const cursor = store.openCursor();
        cursor.onsuccess = () => {
          const item = cursor.result;
          if (item) { if (!refs.has(item.key)) item.delete(); item.continue(); }
        };
      } catch (error) { failure = error; tx.abort(); }
    };
    tx.oncomplete = () => resolve(saved);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(failure || tx.error || new Error('保存が中断されました。'));
  });
}

export async function readPhoto(id) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction('photos').objectStore('photos').get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function photoDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function exportNotebook(notes, pending) {
  const photos = {};
  for (const p of notes.flatMap(n => n.steps.flatMap(s => s.photos))) {
    const blob = pending.get(p.id) || await readPhoto(p.id);
    if (!blob) throw new Error(`写真「${p.name}」を読み込めません。バックアップを中断しました。`);
    photos[p.id] = await photoDataURL(blob);
  }
  return JSON.stringify({ schema: 1, notes, photos });
}

export async function importNotebook(text) {
  const data = validateNotebook(JSON.parse(text));
  const photos = new Map();
  for (const p of data.notes.flatMap(n => n.steps.flatMap(s => s.photos))) {
    const url = data.photos?.[p.id];
    if (typeof url !== 'string' || !url.startsWith(`data:${p.type};base64,`) || url.length > 28 * 1024 * 1024) throw new Error('写真データが不足または不正です。');
    const blob = await (await fetch(url)).blob();
    if (blob.size !== p.size) throw new Error('写真のサイズが一致しません。');
    photos.set(p.id, blob);
  }
  // Restore as new notes, retaining the existing notebook.
  for (const note of data.notes) {
    note.id = crypto.randomUUID();
    note.name = `${note.name}（復元）`;
    for (const step of note.steps) for (const photo of step.photos) {
      const newId = crypto.randomUUID();
      photos.set(newId, photos.get(photo.id));
      photos.delete(photo.id);
      photo.id = newId;
    }
  }
  return { notes: data.notes, photos };
}
