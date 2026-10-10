import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileUp } from 'lucide-react';
import Backdrop from '../components/Backdrop.jsx';
import Logo from '../components/Logo.jsx';
import UploadPanel from '../components/UploadPanel.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Shown once after signup: upload a first document, or skip.
export default function FirstUpload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showUploader, setShowUploader] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState(null);

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="relative flex min-h-screen flex-col">
      <Backdrop />
      <div className="px-5 py-5">
        <div className="mx-auto max-w-6xl">
          <Logo to="/dashboard" />
        </div>
      </div>
      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="card w-full max-w-xl p-6 sm:p-8"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
            <FileUp size={22} />
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-white">Welcome, {firstName}!</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Your account is ready. Would you like to upload your first document now? You can always do this later from
            your dashboard.
          </p>

          {!showUploader && !uploadedDoc && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" className="btn-primary flex-1" onClick={() => setShowUploader(true)}>
                Upload Your First Document
              </button>
              <button type="button" className="btn-secondary flex-1" onClick={() => navigate('/dashboard')}>
                Skip for Now
              </button>
            </div>
          )}

          {showUploader && (
            <div className="mt-6">
              <UploadPanel onUploaded={(doc) => setUploadedDoc(doc)} />
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                {uploadedDoc ? (
                  <>
                    <Link to="/dashboard" className="btn-primary flex-1">
                      Go to Dashboard
                    </Link>
                    <Link to={`/documents/${uploadedDoc.id}`} className="btn-secondary flex-1">
                      View Document
                    </Link>
                  </>
                ) : (
                  <Link to="/dashboard" className="btn-secondary w-full">
                    Skip for Now
                  </Link>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
