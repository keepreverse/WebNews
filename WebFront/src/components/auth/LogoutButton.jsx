import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { api } from '../../services/apiClient';

function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    api.setAuthToken(null);

    navigate('/login', { replace: true });

    setTimeout(() => {
      toast.success('Вы успешно вышли из системы');
    }, 100);
  };

  return (
    <button onClick={handleLogout} className="custom_button">
      Сменить пользователя
    </button>
  );
}

export default LogoutButton;
