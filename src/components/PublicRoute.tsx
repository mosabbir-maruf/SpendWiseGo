import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) return null; // or a loading spinner

  // Special handling for /verify-email
  const isVerifyEmail = window.location.pathname === '/verify-email';
  if (isVerifyEmail) {
    const justRegistered = sessionStorage.getItem('justRegistered');
    // If not just registered, redirect to login
    if (!justRegistered) {
      return <Navigate to="/login" replace />;
    }
    // If logged in and Google user, redirect to dashboard
    if (currentUser && currentUser.providerData[0]?.providerId === 'google.com') {
      return <Navigate to="/dashboard" replace />;
    }
    // If logged in and already verified, redirect to dashboard
    if (currentUser && currentUser.emailVerified) {
      return <Navigate to="/dashboard" replace />;
    }
    // Allow access to /verify-email for just-registered users (logged in or not)
    return <>{children}</>;
  }

  // Allow access to /login and /register for everyone (including unverified users)
  const isLogin = window.location.pathname === '/login';
  const isRegister = window.location.pathname === '/register';
  if (isLogin || isRegister) {
    // If already logged in and verified, redirect to dashboard
    if (currentUser && currentUser.emailVerified) {
      return <Navigate to="/dashboard" replace />;
    }
    // Otherwise allow access to login/register pages
    return <>{children}</>;
  }

  // For other pages, redirect unverified users to verify-email
  if (currentUser) {
    if (!currentUser.emailVerified && currentUser.providerData[0]?.providerId !== 'google.com') {
      return <Navigate to="/verify-email" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // Otherwise, render the public page
  return <>{children}</>;
};

export default PublicRoute; 