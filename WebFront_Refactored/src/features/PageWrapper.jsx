import { useState, useEffect } from 'react';
import "../styles/PageWrapper.css";
import Sidebar from './Sidebar';

function PageWrapper({ children }) {
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
      if (user) {
        setSidebarVisible(true); // показываем сайдбар после загрузки
      }
    }, 800);
  }, [user]);

  return (
    <div
      className={`app-container
        ${sidebarVisible ? 'sidebar-shown' : ''}
        ${sidebarCollapsed ? 'sidebar-collapsed' : ''}
        ${!user ? 'no-sidebar' : ''}
      `.replace(/\s+/g, ' ').trim()}
    >
      {user && (
        <Sidebar
          currentUser={user}
          onCollapseChange={setSidebarCollapsed}
        />
      )}

      <div className={`preloader ${loading ? 'visible' : 'hidden'}`}>
        <div className="spinner"></div>
      </div>

      <main className="main-content">
        {!loading && children}
      </main>
    </div>
  );
}

export default PageWrapper;
