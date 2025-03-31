import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch('http://127.0.0.1:5000/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      localStorage.removeItem('user');
      toast.success('Вы успешно вышли из системы');
      navigate('/login');
    } catch (error) {
      toast.error('Ошибка при выходе из системы');
    }
  };

  return (
    <button onClick={handleLogout} className="custom_button" id="logout">
      Сменить пользователя
    </button>
  );
}

export default LogoutButton;