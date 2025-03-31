import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from './PageWrapper';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <PageWrapper>
      <div className="container">
        <h1>Страница не найдена</h1>
        <button 
          onClick={() => navigate('/')} 
          className="custom_button"
          id="return"
        >
          Вернуться на главную
        </button>
      </div>
    </PageWrapper>
  );
};

export default NotFoundPage;