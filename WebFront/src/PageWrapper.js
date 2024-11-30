import React, { useState, useEffect } from 'react';
import './PageWrapper.css';

function PageWrapper({ children }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 800);
  }, []);

  return (
    <div>
      <div className={`preloader ${loading ? 'visible' : 'hidden'}`}>
        <div className="spinner"></div>
      </div>
      {!loading && children}
    </div>
  );
}

export default PageWrapper;