import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../services/apiClient';
import { isAdmin, isModerator } from '../services/authHelpers';
import { translateRole } from '../utils/translatedRoles';
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

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      document.body.classList.toggle("sidebar-collapsed", next);
      return next;
    });
  };
  
  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header" onClick={toggleCollapse}>
        <h1 className="sidebar-logo" aria-label="Toggle sidebar">
          <span className={`logo-full ${collapsed ? 'hidden' : ''}`}>WEBNEWS</span>
          <span className={`logo-short ${collapsed ? 'visible' : ''}`}>WN</span>
        </h1>
      </div>

      <div className="sidebar-body">
        <div className="menu-wrapper">
        <ul className="sidebar-menu">
          <li>
            <NavLink to="/news-creator" className="sidebar-link">
              Конструктор
            </NavLink>
          </li>
          <li>
            <NavLink to="/news-list" className="sidebar-link">
              Публикации
            </NavLink>
          </li>
          {(isAdmin(currentUser) || isModerator(currentUser)) && (
            <li>
              <NavLink to="/admin-panel" className="sidebar-link">
                Управление
              </NavLink>
            </li>
          )}
          <li>
            <button onClick={handleLogout} className={`sidebar-link ${collapsed ? 'collapsed' : ''}`} type="button">
              Выйти
            </button>
          </li>
        </ul>
        </div>

        {currentUser && (
          <div className={`user-info-side${collapsed ? ' collapsed' : ''}`}>
            <p className="user-nickname">{currentUser.nickname}</p>
            <p className="user-login">( {currentUser.login} )</p>
            <p className="user-role">{translateRole(currentUser.role)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
