import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LegalConsentModal, { TERMS_VERSION } from './components/LegalConsentModal';
import api from './services/api';

import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import AuthCallbackPage from './pages/auth/AuthCallbackPage';

import DashboardPage from './pages/dashboard/DashboardPage';
import MapView from './pages/dashboard/MapView';
import PostDetailPage from './pages/posts/PostDetailPage';
import CreatePostPage from './pages/posts/CreatePostPage';
import MyPostsPage from './pages/posts/MyPostsPage';
import DonationsPage from './pages/donations/DonationsPage';
import ProfilePage from './pages/profile/ProfilePage';

import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import PostManagementPage from './pages/admin/PostManagementPage';
import AdminPostDetailPage from './pages/admin/AdminPostDetailPage';
import FundAllocationPage from './pages/admin/FundAllocationPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';
import WithdrawalManagementPage from './pages/admin/WithdrawalManagementPage';
import RefundManagementPage from './pages/admin/RefundManagementPage';

const ProtectedRoute: React.FC<{ adminOnly?: boolean }> = ({ adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="loader" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return <Outlet />;
};

const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock background scroll while the mobile sidebar overlay is open,
  // so the page underneath doesn't scroll behind the dimmed backdrop.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <div className="app-layout">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Navbar
        collapsed={sidebarCollapsed}
        onMobileToggle={() => setMobileOpen((open) => !open)}
      />
      <main className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
};

const LegalAcceptanceGate: React.FC = () => {
  const { user, updateUser } = useAuth();
  if (!user || user.role === 'admin' || user.acceptedTermsVersion === TERMS_VERSION) return null;
  return <LegalConsentModal onAccept={async () => {
    const { data } = await api.post('/auth/accept-terms');
    updateUser(data.user);
  }} />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1E2536',
              color: '#F0F2F5',
              border: '1px solid #232A3B',
              fontFamily: 'Inter, sans-serif',
            },
          }}
        />
        <LegalAcceptanceGate />

        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/regions" element={<MapView />} />
              <Route path="/posts/create" element={<CreatePostPage />} />
              <Route path="/posts/:id" element={<PostDetailPage />} />
              <Route path="/my-posts" element={<MyPostsPage />} />
              <Route path="/donations" element={<DonationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              <Route element={<ProtectedRoute adminOnly />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/posts" element={<PostManagementPage />} />
                <Route path="/admin/posts/:id" element={<AdminPostDetailPage />} />
                <Route path="/admin/funds" element={<FundAllocationPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
                <Route path="/admin/withdrawals" element={<WithdrawalManagementPage />} />
                <Route path="/admin/refunds" element={<RefundManagementPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
