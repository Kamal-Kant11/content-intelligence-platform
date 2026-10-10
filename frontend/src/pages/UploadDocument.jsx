import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AppShell from './AppShell.jsx';
import UploadPanel from '../components/UploadPanel.jsx';

export default function UploadDocument() {
  const [uploadedDoc, setUploadedDoc] = useState(null);

  return (
    <AppShell>
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>
      <div className="mx-auto mt-6 max-w-xl">
        <h1 className="text-2xl font-semibold text-white">Upload Document</h1>
        <p className="mt-1.5 text-sm text-slate-400">Add a PDF, DOCX, or TXT file to your private workspace.</p>
        <div className="mt-6">
          <UploadPanel onUploaded={setUploadedDoc} />
          {uploadedDoc && (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link to="/dashboard" className="btn-primary flex-1">
                Go to My Documents
              </Link>
              <Link to={`/documents/${uploadedDoc.id}`} className="btn-secondary flex-1">
                View Document
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
