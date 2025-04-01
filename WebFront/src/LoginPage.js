import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from './PageWrapper';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles.css';

function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: login,
          password: password
        }),
        credentials: 'include' // Для работы с куками, если будете использовать
      });

      const data = await response.json();

      if (response.ok) {
        // Сохраняем данные пользователя
        localStorage.setItem('user', JSON.stringify({
          id: data.userID,
          role: data.userRole,
          login: login
        }));

        // Если выбрано "Запомнить меня"
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberMe');
        }

        toast.success('Авторизация успешна!');
        navigate('/news-creator');
      } else {
        toast.error(data.DESCRIPTION || 'Ошибка авторизации');
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper>
      <title>Авторизация</title>
      <div id="auth-form" className="container">
        <h1>Авторизация</h1>
        <div className="content">
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              id="login"
              name="login"
              className="inpt"
              placeholder="Введите логин"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
            />
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
            <div className="checkbox-container">
              <input
                type="checkbox"
                id="remember"
                className="checkbox-input"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember" className="checkbox-label">
                Оставаться в системе
              </label>
            </div>
            <button 
              type="submit" 
              className="custom_button" 
              id="login"
              disabled={isLoading}
            >
              {isLoading ? 'Загрузка...' : 'Войти'}
            </button>
          </form>
          <ToastContainer position="top-right" autoClose={3000} />
        </div>
      </div>
    </PageWrapper>
  );
}

export default LoginPage;