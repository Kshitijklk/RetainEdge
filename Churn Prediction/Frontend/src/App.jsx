import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Datasets } from './pages/Datasets';
import { DatasetDetail } from './pages/DatasetDetail';
import { Predictions } from './pages/Predictions';
import { PredictionRun } from './pages/PredictionRun';
import { CustomerDetail } from './pages/CustomerDetail';
import { Profile } from './pages/Profile';
import { HelpSupport } from './pages/HelpSupport';
import { About } from './pages/About';
import { NotFound } from './pages/NotFound';
import { PageLoader } from './components/Spinner';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/datasets" element={<Datasets />} />
              <Route path="/datasets/:id" element={<DatasetDetail />} />
              <Route path="/predictions" element={<Predictions />} />
              <Route path="/predictions/:runId" element={<PredictionRun />} />
              <Route path="/predictions/:runId/customers/:customerId" element={<CustomerDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/help-support" element={<HelpSupport />} />
              <Route path="/about" element={<About />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
