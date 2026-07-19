import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'oklch(0.09 0 0)' }}>
        <div
          className="h-12 w-12 animate-spin rounded-full border-2"
          style={{ borderColor: 'oklch(0.20 0 0)', borderTopColor: 'oklch(0.72 0.165 68)' }}
        />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};