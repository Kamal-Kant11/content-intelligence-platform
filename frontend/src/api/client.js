import axios from 'axios';

// The login token is an HTTP-only cookie set by the backend; the browser sends it automatically.
export const api = axios.create({ baseURL: '/api', withCredentials: true });

export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the backend running?';
  if (err?.code === 'ECONNABORTED') return 'The request took too long. Please try again.';
  return fallback;
}

// Downloads the approved version of a document as TXT or DOCX.
export async function downloadExport(documentId, format) {
  let res;
  try {
    res = await api.get(`/documents/${documentId}/export`, { params: { format }, responseType: 'blob' });
  } catch (err) {
    // Error bodies arrive as a Blob here; turn them back into { message } for getErrorMessage.
    if (err.response?.data instanceof Blob) {
      try {
        err.response.data = JSON.parse(await err.response.data.text());
      } catch {
        /* keep the generic message */
      }
    }
    throw err;
  }
  const filename = /filename="?([^";]+)"?/.exec(res.headers['content-disposition'] || '')?.[1] || `document-approved.${format}`;
  const url = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
