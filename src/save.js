// Guardado en el navegador (localStorage).
const KEY = 'market-pablo-save-v1';

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function readSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function deleteSave() {
  try { localStorage.removeItem(KEY); } catch { /* sin almacenamiento */ }
}
