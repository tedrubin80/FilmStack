import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { useAuthStore } from '@/store/authStore';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PlatformAdminGuard } from '@/components/auth/PlatformAdminGuard';
import { Layout } from '@/components/layout/Layout';

// Loading fallback component
const PageLoader = () => (
  <div className="flex h-screen items-center justify-center" style={{ background: 'oklch(0.09 0 0)' }}>
    <div className="text-center">
      <div
        className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2"
        style={{ borderColor: 'oklch(0.20 0 0)', borderTopColor: 'oklch(0.72 0.165 68)' }}
      />
      <p style={{ color: 'oklch(0.70 0.008 80)', fontFamily: "'Barlow', system-ui, sans-serif" }}>Loading...</p>
    </div>
  </div>
);

// Lazy load pages for better code splitting
// Public Pages
const SimpleHomePage = lazy(() => import('@/pages/SimpleHomePage').then(m => ({ default: m.SimpleHomePage })));

// Auth Pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));

// Dashboard Pages
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const FestivalsPage = lazy(() => import('@/pages/festivals/FestivalsPage').then(m => ({ default: m.FestivalsPage })));
const FestivalDetailPage = lazy(() => import('@/pages/festivals/FestivalDetailPage').then(m => ({ default: m.FestivalDetailPage })));
const CreateFestivalPage = lazy(() => import('@/pages/festivals/CreateFestivalPage').then(m => ({ default: m.CreateFestivalPage })));
const EditFestivalPage = lazy(() => import('@/pages/festivals/EditFestivalPage').then(m => ({ default: m.EditFestivalPage })));
const FestivalJudgesPage = lazy(() => import('@/pages/festivals/FestivalJudgesPage').then(m => ({ default: m.FestivalJudgesPage })));
const FestivalFilmsManagePage = lazy(() => import('@/pages/festivals/FestivalFilmsManagePage').then(m => ({ default: m.FestivalFilmsManagePage })));
const FestivalSubmitPage = lazy(() => import('@/pages/festivals/FestivalSubmitPage').then(m => ({ default: m.FestivalSubmitPage })));
const FestivalJudgingPage = lazy(() => import('@/pages/festivals/FestivalJudgingPage').then(m => ({ default: m.FestivalJudgingPage })));
const FestivalAwardsPage = lazy(() => import('@/pages/festivals/FestivalAwardsPage').then(m => ({ default: m.FestivalAwardsPage })));
const FilmsPage = lazy(() => import('@/pages/films/FilmsPage').then(m => ({ default: m.FilmsPage })));
const FilmDetailPage = lazy(() => import('@/pages/films/FilmDetailPage').then(m => ({ default: m.FilmDetailPage })));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const EmailsSettingsPage = lazy(() => import('@/pages/settings/EmailsSettingsPage').then(m => ({ default: m.EmailsSettingsPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const TenantsPage = lazy(() => import('@/pages/admin/TenantsPage'));
const TenantDetailsPage = lazy(() => import('@/pages/admin/TenantDetailsPage'));

function App() {
  const { user, isLoading } = useAuthStore();

  // Don't show loading for unauthenticated users
  if (isLoading && user !== null) {
    return <PageLoader />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            user ? <Navigate to="/dashboard" replace /> : <SimpleHomePage />
          }
        />
        <Route
          path="/login"
          element={
            user ? <Navigate to="/dashboard" replace /> : <LoginPage />
          }
        />
        <Route
          path="/register"
          element={
            user ? <Navigate to="/dashboard" replace /> : <RegisterPage />
          }
        />

        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <AuthGuard>
              <Layout>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/dashboard" element={<DashboardPage />} />

                    {/* Festivals */}
                    <Route path="/festivals" element={<FestivalsPage />} />
                    <Route path="/festivals/create" element={<CreateFestivalPage />} />
                    <Route path="/festivals/:id/edit" element={<EditFestivalPage />} />
                    <Route path="/festivals/:id/judges" element={<FestivalJudgesPage />} />
                    <Route path="/festivals/:id/judging/:judgeId" element={<FestivalJudgingPage />} />
                    <Route path="/festivals/:id/films" element={<FestivalFilmsManagePage />} />
                    <Route path="/festivals/:id/submit" element={<FestivalSubmitPage />} />
                    <Route path="/festivals/:id/awards" element={<FestivalAwardsPage />} />
                    <Route path="/festivals/:id" element={<FestivalDetailPage />} />

                    {/* Films */}
                    <Route path="/films" element={<FilmsPage />} />
                    <Route path="/films/:id" element={<FilmDetailPage />} />

                    {/* Settings */}
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/settings/emails" element={<EmailsSettingsPage />} />

                    {/* Platform admin */}
                    <Route path="/admin" element={<PlatformAdminGuard><AdminDashboard /></PlatformAdminGuard>} />
                    <Route path="/admin/tenants" element={<PlatformAdminGuard><TenantsPage /></PlatformAdminGuard>} />
                    <Route path="/admin/tenants/:id" element={<PlatformAdminGuard><TenantDetailsPage /></PlatformAdminGuard>} />

                    {/* 404 */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </Layout>
            </AuthGuard>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default App;