import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from './apiClient';
import { isAdmin, isModerator } from './authHelpers';

function Sidebar({ currentUser }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout', {});
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
      api.setAuthToken(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Меню</h3>
      </div>
      <ul className="sidebar-menu">
        <li>
          <Link to="/news-creator" className="sidebar-link">
            Создать новость
          </Link>
        </li>
        <li>
          <Link to="/news-list" className="sidebar-link">
            Список новостей
          </Link>
        </li>
        
        {(isAdmin(currentUser) || isModerator(currentUser)) && (
          <li>
            <Link to="/admin-panel" className="sidebar-link">
              Админ-панель
            </Link>
          </li>
        )}
        
        <li>
          <button onClick={handleLogout} className="sidebar-link logout-btn">
            Выйти
          </button>
        </li>
      </ul>
      
      {currentUser && (
        <div className="user-info-side">
          <p>{currentUser.nickname}</p>
          <p>{currentUser.role}</p>
        </div>
      )}
    </div>
  );
}

export default Sidebar;