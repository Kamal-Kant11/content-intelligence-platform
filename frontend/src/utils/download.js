import { api } from '../api/client.js';

// Downloads a file from the API (the auth header is added by the axios client)
// and saves it with the file name the server chose.
export async function downloadFile(path, params = {}) {
  const res = await api.get(path, { params, responseType: 'blob' });
  const header = res.headers['content-disposition'] || '';
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
  const plain = header.match(/filename="([^"]+)"/i);
  const name = utf8 ? decodeURIComponent(utf8[1]) : plain ? plain[1] : 'download';

  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}

// Blob error bodies are not parsed by axios; read the JSON message out of them.
export async function downloadErrorMessage(err, fallback = 'Download failed.') {
  try {
    const text = await err?.response?.data?.text?.();
    return JSON.parse(text).message || fallback;
  } catch {
    return err?.code === 'ERR_NETWORK' ? 'Cannot reach the server. Is the backend running?' : fallback;
  }
}
