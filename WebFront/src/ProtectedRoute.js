import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { checkAuth } from './authHelpers';

function ProtectedRoute() {
  const isAuthenticated = checkAuth();
  
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export default ProtectedRoute;