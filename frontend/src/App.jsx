import { Route, Routes } from 'react-router-dom';
import { GuestRoute, ProtectedRoute } from './components/RouteGuards.jsx';
import Home from './pages/Home.jsx';
import Signup from './pages/Signup.jsx';
import Login from './pages/Login.jsx';
import FirstUpload from './pages/FirstUpload.jsx';
import UploadDocument from './pages/UploadDocument.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DocumentView from './pages/DocumentView.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route element={<GuestRoute />}>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<FirstUpload />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<UploadDocument />} />
        <Route path="/documents/:id" element={<DocumentView />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
