import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { isPlatformAdmin } from '@/utils/platformAdmin';

export const PlatformAdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();

  if (!isPlatformAdmin(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
