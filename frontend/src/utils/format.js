export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt'];

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fileTypeLabel(fileName = '') {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext ? ext.toUpperCase() : 'FILE';
}

export function validateFile(file) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) return 'Unsupported file type. Please choose a PDF, DOCX, or TXT file.';
  if (file.size === 0) return 'This file is empty.';
  if (file.size > MAX_FILE_SIZE) return `File is too large (${formatBytes(file.size)}). Maximum size is 10 MB.`;
  return null;
}
