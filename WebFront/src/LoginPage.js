import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from './PageWrapper';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles.css';

function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);

  const navigate = useNavigate();
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLoginMode ? 'login' : 'register';
      const body = {
        login: login.trim(),
        password: password.trim(),
        ...(!isLoginMode && { nickname: nickname.trim() })
      };
  
      const response = await fetch(`http://127.0.0.1:5000/api/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.DESCRIPTION || 'Ошибка сервера');
      }
  
      const data = await response.json();
      // В handleAuth после успешного входа
      if (isLoginMode) {
        const userData = {
          id: data.userID,
          login: login.trim(),
          role: data.userRole,
          nickname: data.nickname
        };
        
        // Сохраняем в куки и localStorage
        document.cookie = `user=${JSON.stringify(userData)}; path=/; max-age=${rememberMe ? 86400 : 3600}`;
        localStorage.setItem('user', JSON.stringify(userData));
        
        navigate('/news-creator');
      } else {
        toast.success('Регистрация прошла успешна! Теперь можно войти в учетную запись');
        setIsLoginMode(true);
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Ошибка соединения');
    }
  };

  return (
    <PageWrapper>
      <title>{isLoginMode ? 'Авторизация' : 'Регистрация'}</title>
      <div id="auth-form" className="container">
        <h1>{isLoginMode ? 'Авторизация' : 'Регистрация'}</h1>
        <div className="content">
          <form onSubmit={handleAuth}>
            {!isLoginMode && (
              <input
                type="text"
                id="nickname"
                name="nickname"
                className="inpt"
                placeholder="Введите никнейм"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
              />
            )}
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
            {isLoginMode && (
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
            )}
            <button 
              type="submit" 
              className="custom_button" 
              id="auth"
            >
              {isLoginMode ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </form>
          <button 
            className="toggle-mode-btn"
            onClick={() => setIsLoginMode(!isLoginMode)}
          >
            {isLoginMode ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>
          <ToastContainer position="top-right" autoClose={3000} />
        </div>
      </div>
    </PageWrapper>
  );
}

export default LoginPage;