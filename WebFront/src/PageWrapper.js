import { useState, useEffect } from 'react';
import './PageWrapper.css';
import Sidebar from './Sidebar';


function PageWrapper({ children }) {
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');


  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 800);
  }, []);

  return (
    <div className="app-container">
      {user && <Sidebar currentUser={user} />}
      <div className={`preloader ${loading ? 'visible' : 'hidden'}`}>
        <div className="spinner"></div>
      </div>
      <main className={`main-content ${!user ? 'no-sidebar' : ''}`}>
        {!loading && children}
      </main>
    </div>
  );
}

export default PageWrapper;