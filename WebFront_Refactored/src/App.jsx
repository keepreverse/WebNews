import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./components/auth/LoginPage";
import NewsCreator from "./components/news/NewsCreator";
import NewsList from "./components/news/NewsList";
import AdminPanel from "./components/admin/AdminPanel";
import NotFoundPage from "./pages/NotFoundPage";

import ProtectedRoute from "./routes/ProtectedRoute";
import { ErrorBoundary } from "./utils/ErrorBoundary";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route 
          path="/news-creator" 
          element={
            <ErrorBoundary key="news-creator">
              <NewsCreator />
            </ErrorBoundary>
          } 
        />
        <Route 
          path="/news-list" 
          element={
            <ErrorBoundary key="news-list">
              <NewsList />
            </ErrorBoundary>
          } 
        />
        <Route 
          path="/admin-panel" 
          element={
            <ErrorBoundary key="admin-panel">
              <AdminPanel />
            </ErrorBoundary>
          } 
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
