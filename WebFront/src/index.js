/*
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import NewsCreator from './NewsCreator';
import NewsList from './NewsList';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import NotFoundPage from './NotFoundPage';
import './styles.css';

// Создаем корневой элемент
const container = document.getElementById('root');
const root = createRoot(container);

// Компонент для проверки аутентификации
const AuthWrapper = ({ children }) => {
  const user = localStorage.getItem('user');
  return user ? children : <Navigate to="/login" replace />;
};
root.render(
  <React.StrictMode>
    <Router>
      <Routes>

      <Route 
          path="/" 
          element={
            localStorage.getItem('user') 
              ? <Navigate to="/news-creator" replace /> 
              : <Navigate to="/login" replace />
          } 
        />

        <Route path="/login" element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } />

        <Route path="/news-creator" element={
          <ProtectedRoute>
            <NewsCreator />
          </ProtectedRoute>
        } />

        <Route path="/news-list" element={
          <ProtectedRoute>
            <NewsList />
          </ProtectedRoute>
        } />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
*/


import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import NewsCreator from './NewsCreator';
import NewsList from './NewsList';
import AdminPanel from './AdminPanel';
import './styles.css';

const root = createRoot(document.getElementById('root'));

root.render(
  <Router>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/news-creator" element={<NewsCreator />} />
      <Route path="/news-list" element={<NewsList />} />
      <Route path="/admin-panel" element={<AdminPanel />} />
    </Routes>
  </Router>
);
