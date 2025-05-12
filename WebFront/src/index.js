
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import NewsCreator from './NewsCreator';
import NewsList from './NewsList';
import AdminPanel from './AdminPanel';
import ProtectedRoute from './ProtectedRoute';
import { initAuthToken } from './apiClient';
import './styles.css';


initAuthToken();

const root = createRoot(document.getElementById('root'));
root.render(
  <Router>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/news-creator" element={<NewsCreator />} />
        <Route path="/news-list" element={<NewsList />} />
        <Route path="/admin-panel" element={<AdminPanel />} />
      </Route>
    </Routes>
  </Router>
);
