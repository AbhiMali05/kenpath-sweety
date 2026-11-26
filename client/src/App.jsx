import { Navigate, Route, Routes } from 'react-router-dom';
import useAuth from './features/auth/useAuth.js';
import AppShell from './components/layout/AppShell.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import RegisterPage from './features/auth/RegisterPage.jsx';
import ReadingsPage from './features/readings/ReadingsPage.jsx';
import ReportsPage from './features/reports/ReportsPage.jsx';
import NotFoundPage from './routes/NotFoundPage.jsx';
import LoadingState from './components/common/LoadingState.jsx';
import './App.css';

function EntryRedirect() {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingState message="Checking your session…" />;
  return <Navigate to={status === 'authenticated' ? '/readings' : '/login'} replace />;
}

function PublicOnly({ children }) {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingState message="Checking your session…" />;
  return status === 'authenticated' ? <Navigate to="/readings" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EntryRedirect />} />
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/readings" element={<ReadingsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
