import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Palette, Plus } from 'lucide-react';
import AppShell from './AppShell.jsx';
import { api, getErrorMessage } from '../api/client.js';
import { FormField } from '../components/FormField.jsx';
import { ErrorAlert, PageHeader, Spinner } from '../components/ui.jsx';
import { formatDate } from '../utils/format.js';

export default function Brands() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBrands((await api.get('/brands')).data.brands);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load brands.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Give the brand a name.');
    setCreating(true);
    setError('');
    try {
      const res = await api.post('/brands', { name });
      setBrands((b) => [{ ...res.data.brand, sourceCount: 0, activeRuleCount: 0 }, ...b]);
      setName('');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create the brand.'));
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell>
      <PageHeader title="Brands" subtitle="Teach the platform how each brand writes, from its own material." />

      <form onSubmit={onCreate} className="card mt-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <FormField label="New brand" id="brand-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" maxLength={120} />
        </div>
        <button type="submit" className="btn-primary" disabled={creating}>
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create brand
        </button>
      </form>

      {error && (
        <div className="mt-4">
          <ErrorAlert>{error}</ErrorAlert>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : brands.length === 0 ? (
        <div className="card mt-6 px-6 py-12 text-center">
          <Palette className="mx-auto text-indigo-300" />
          <p className="mt-3 text-sm text-slate-400">
            No brands yet. Create one, add brand guidelines or approved content as sources, then select Learn.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {brands.map((b) => (
            <li key={b.id}>
              <Link to={`/brands/${b.id}`} className="card block p-4 transition hover:border-charcoal-600">
                <p className="font-medium text-white">{b.name}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {b.sourceCount} source{b.sourceCount === 1 ? '' : 's'} · {b.activeRuleCount} active rule{b.activeRuleCount === 1 ? '' : 's'} ·{' '}
                  {b.learnedAt ? `learned ${formatDate(b.learnedAt)}` : 'not learned yet'}
                </p>
                {b.voice?.tone?.length > 0 && <p className="mt-2 text-xs capitalize text-indigo-300">{b.voice.tone.join(' · ')}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
