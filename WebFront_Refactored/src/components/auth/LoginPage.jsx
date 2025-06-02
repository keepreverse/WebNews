import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { api } from "../../services/apiClient";
import { getAuthToken, isTokenValid } from "../../services/authHelpers";
import PageWrapper from "../../features/PageWrapper";

const LoginPage = () => {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (token && isTokenValid(token)) {
      api.setAuthToken(token);
      navigate("/news-creator");
    }
  }, [navigate]);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLoginMode ? "/auth/login" : "/auth/register";
      const payload = {
        login: login.trim(),
        password: password.trim(),
        ...(isLoginMode ? {} : { nickname: nickname.trim() }),
      };

      if (!payload.login || !payload.password) {
        throw new Error("Логин и пароль обязательны");
      }
      if (!isLoginMode && !payload.nickname) {
        throw new Error("Никнейм обязателен при регистрации");
      }

      const response = await api.post(endpoint, payload);

      if (isLoginMode) {
        if (!response.token) {
          throw new Error("Сервер не вернул токен");
        }

        const userData = {
          id: response.userID,
          login: response.login,
          role: response.user_role,
          nickname: response.nickname,
          token: response.token,
        };

        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem("user", JSON.stringify(userData));
        api.setAuthToken(response.token);

        toast.success("Успешный вход");
        navigate("/news-creator");
      } else {
        toast.success("Регистрация прошла успешна!");
        setIsLoginMode(true);
      }
    } catch (err) {
    }
  };

  return (
    <PageWrapper>
      <Helmet>
        <title>{isLoginMode ? "Авторизация" : "Регистрация"}</title>
      </Helmet>
      <div id="auth-form" className="container">
        <h1>{isLoginMode ? "Авторизация" : "Регистрация"}</h1>
        <div className="content">
          <form onSubmit={handleAuth}>
            {!isLoginMode && (
              <input
                type="text"
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
              name="login"
              className="inpt"
              placeholder="Введите логин"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
            />
            <input
              type="password"
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
            <button type="submit" className="custom_button">
              {isLoginMode ? "Войти" : "Зарегистрироваться"}
            </button>
          </form>
          <button
            className="toggle-mode-btn"
            onClick={() => setIsLoginMode(!isLoginMode)}
            type="button"
          >
            {isLoginMode 
              ? "Нет аккаунта? Зарегистрироваться" 
              : "Уже есть аккаунт? Войти"}
          </button>
          <ToastContainer position="top-right" autoClose={3000} />
        </div>
      </div>
    </PageWrapper>
  );
};

export default LoginPage;
