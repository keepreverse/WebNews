import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/apiClient';
import { isAdmin, isModerator } from '../services/authHelpers';
import { translateRole } from '../utils/helpers';
import { toast } from 'react-toastify';
import "../styles/Sidebar.css";

function Sidebar({ currentUser, onCollapseChange }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    onCollapseChange?.(collapsed);
  }, [collapsed, onCollapseChange]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    api.setAuthToken(null);
    navigate('/login', { replace: true });
    setTimeout(() => toast.success('Вы успешно вышли из системы'), 100);
  };

  const toggleCollapse = () => setCollapsed(prev => !prev);

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header" onClick={toggleCollapse}>
        <h1 className="sidebar-logo" aria-label="Toggle sidebar">
          <span className={`logo-full ${collapsed ? 'hidden' : ''}`}>WEBNEWS</span>
          <span className={`logo-short ${collapsed ? 'visible' : ''}`}>WN</span>
        </h1>
      </div>

      <ul className="sidebar-menu">
        <li>
          <Link to="/news-creator" className="sidebar-link">
            Конструктор
          </Link>
        </li>
        <li>
          <Link to="/news-list" className="sidebar-link">
            Публикации
          </Link>
        </li>
        {(isAdmin(currentUser) || isModerator(currentUser)) && (
          <li>
            <Link to="/admin-panel" className="sidebar-link">
              Управление
            </Link>
          </li>
        )}
        <li>
          <button onClick={handleLogout} className="sidebar-link" type="button">
            Выйти
          </button>
        </li>
      </ul>

      {currentUser && !collapsed && (
        <div className="user-info-side">
          <p className="user-nickname">{currentUser.nickname}</p>
          <p className="user-login">( {currentUser.login} )</p>
          <p className="user-role">{translateRole(currentUser.role)}</p>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
