import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage';
import NewsCreator from './NewsCreator';
import NewsList from './NewsList';
import './styles.css';

const root = createRoot(document.getElementById('root'));

root.render(
  <Router>
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/news-creator" element={<NewsCreator />} />
      <Route path="/news-list" element={<NewsList />} />
    </Routes>
  </Router>,
);
