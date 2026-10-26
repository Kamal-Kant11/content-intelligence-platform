import { Route, Routes } from 'react-router-dom';
import { GuestRoute, ProtectedRoute } from './components/RouteGuards.jsx';
import AppLayout from './components/AppLayout.jsx';
import Home from './pages/Home.jsx';
import Signup from './pages/Signup.jsx';
import Login from './pages/Login.jsx';
import Portal from './pages/Portal.jsx';
import NewContent from './pages/NewContent.jsx';
import History from './pages/History.jsx';
import DocumentResults from './pages/DocumentResults.jsx';
import Compare from './pages/Compare.jsx';
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
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Portal />} />
          <Route path="/new" element={<NewContent />} />
          <Route path="/documents" element={<History />} />
          <Route path="/documents/:id" element={<DocumentResults />} />
          <Route path="/documents/:id/compare" element={<Compare />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
