import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import PageWrapper from './PageWrapper';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { api } from './apiClient';
import { decodeJWT } from './utils/jwt';

function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);

  const navigate = useNavigate();

  // Проверяем сохраненную сессию при монтировании компонента
  useEffect(() => {
    const checkExistingSession = () => {
      const userData = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
      if (userData?.token) {
        try {
          const decoded = decodeJWT(userData.token);
          if (decoded && decoded.exp * 1000 > Date.now()) {
            api.setAuthToken(userData.token);
            navigate('/news-creator');
          } else {
            // Токен истек, очищаем
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
          }
        } catch (e) {
          console.error('Invalid token:', e);
          localStorage.removeItem('user');
          sessionStorage.removeItem('user');
        }
      }
    };

    checkExistingSession();
  }, [navigate]);

  const handleAuth = async (e) => {
    e.preventDefault();
    
    try {
      const endpoint = isLoginMode ? 'login' : 'register';
      const body = {
        login: login.trim(),
        password: password.trim(),
        ...(!isLoginMode && { nickname: nickname.trim() })
      };

      // Валидация полей
      if (!body.login || !body.password) {
        throw new Error('Логин и пароль обязательны');
      }
      if (!isLoginMode && !body.nickname) {
        throw new Error('Никнейм обязателен при регистрации');
      }

      // Отправка запроса через ваш apiClient
      const response = await api.post(`/api/auth/${endpoint}`, body);
      console.log('Server response:', response); // Для отладки

      if (isLoginMode) {
        // Проверяем наличие токена в ответе
        if (!response.token) {
          throw new Error('Сервер не вернул токен авторизации');
        }

        // Устанавливаем токен в apiClient
        api.setAuthToken(response.token);

        // Сохраняем данные пользователя
        const userData = {
          id: response.userID,
          login: response.login,
          role: response.user_role,
          nickname: response.nickname,
          token: response.token
        };

        // Очищаем предыдущие данные
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        
        // Сохраняем новые данные
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('user', JSON.stringify(userData));
        
        navigate('/news-creator');
      } else {
        toast.success('Регистрация прошла успешно!');
        setIsLoginMode(true);
      }
    } catch (error) {
      console.error('Auth error:', error);
      
      // Формируем понятное сообщение об ошибке
      let errorMessage = error.message;
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Ошибка соединения с сервером';
      }
      
      toast.error(errorMessage);
      
      // Очищаем данные только при явных ошибках аутентификации (истекший токен)
      if (error.message.includes('Сессия истекла')) {
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        api.setAuthToken(null);
      }
    }
  };

  return (
    <PageWrapper>
    <Helmet>
      <title>{isLoginMode ? 'Авторизация' : 'Регистрация'}</title>
    </Helmet>
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