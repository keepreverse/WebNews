import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from './PageWrapper';
import './styles.css';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Логика аутентификации

    // Если аутентификация успешна:
    setError('Аутентификация успешна');

    // Переход на другую страницу (NewsCreator)
    navigate('/news-creator');
  };

  return (
    <PageWrapper>
      <title>Авторизация</title>
      <div id="auth-form" className="container">
        <h1>Авторизация</h1>
        <div className="content">
          <form onSubmit={handleSubmit}>
            <label htmlFor="username">Логин:</label>
            <input
              type="text"
              id="username"
              name="username"
              className="inpt"
              placeholder="Введите логин"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <label htmlFor="password">Пароль:</label>
            <input
              type="password"
              id="password"
              name="password"
              className="inpt"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="checkbox"
              id="remember"
              className="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="remember">Запомнить меня</label>
            <button type="submit"  className="custom_button" id="login">
                Войти
            </button>
          </form>
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    </PageWrapper>
  );
}

export default LoginPage;