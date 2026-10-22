import { Navigate, Route, Routes } from 'react-router-dom';
import { GuestRoute, ProtectedRoute } from './components/RouteGuards.jsx';
import Home from './pages/Home.jsx';
import Signup from './pages/Signup.jsx';
import Login from './pages/Login.jsx';
import FirstUpload from './pages/FirstUpload.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewDocument from './pages/NewDocument.jsx';
import DocumentView from './pages/DocumentView.jsx';
import ReviewPage from './pages/ReviewPage.jsx';
import Brands from './pages/Brands.jsx';
import BrandView from './pages/BrandView.jsx';
import Models from './pages/Models.jsx';
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
        <Route path="/documents/new" element={<NewDocument />} />
        <Route path="/upload" element={<Navigate to="/documents/new?tab=file" replace />} />
        <Route path="/documents/:id" element={<DocumentView />} />
        <Route path="/documents/:id/review/:optimizationId" element={<ReviewPage />} />
        <Route path="/brands" element={<Brands />} />
        <Route path="/brands/:id" element={<BrandView />} />
        <Route path="/models" element={<Models />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
