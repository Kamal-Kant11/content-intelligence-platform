import { useCallback, useEffect, useState } from 'react';
import { api, getErrorMessage } from '../api/client.js';

// Loads one document; setDoc replaces it with the copy returned by later API calls.
// State is keyed by id, so switching documents never shows the previous one.
export function useDocument(id) {
  const [state, setState] = useState({ id: null, doc: null, error: '' });

  useEffect(() => {
    let active = true;
    api
      .get(`/documents/${id}`)
      .then((res) => active && setState({ id, doc: res.data.document, error: '' }))
      .catch((err) => active && setState({ id, doc: null, error: getErrorMessage(err, 'Could not load this document.') }));
    return () => {
      active = false;
    };
  }, [id]);

  const setDoc = useCallback((doc) => setState({ id, doc, error: '' }), [id]);
  const current = state.id === id ? state : { doc: null, error: '' };
  return { doc: current.doc, setDoc, loadError: current.error };
}
