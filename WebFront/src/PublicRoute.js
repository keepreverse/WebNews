import React from 'react';
import { Navigate } from 'react-router-dom';

const PublicRoute = ({ children }) => {
  const user = localStorage.getItem('user');
  
  if (user) {
    return <Navigate to="/news-creator" replace />;
  }

  return children;
};

export default PublicRoute;