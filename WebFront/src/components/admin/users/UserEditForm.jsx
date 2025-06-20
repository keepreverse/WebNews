import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const UserEditForm = ({ user, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    login: '',
    nick: '',
    user_role: 'Publisher'
  });

  useEffect(() => {
    if (user) {
      setFormData({
        login: user.login || '',
        nick: user.nick || '',
        user_role: user.user_role || 'Publisher'
      });
    }
  }, [user]);

const handleSubmit = (e) => {
  e.preventDefault();
  
  if (!formData.login.trim() || !formData.nick.trim()) {
    alert('Логин и никнейм не могут быть пустыми');
    return;
  }
  onSave(user.userID, formData);
};

  return (
    <form className="edit-form" onSubmit={handleSubmit}>

      <div className="form-group">
        <label>Никнейм:</label>
        <input
          type="text"
          value={formData.nick}
          onChange={(e) => setFormData({ ...formData, nick: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label>Логин:</label>
        <input
          type="text"
          value={formData.login}
          onChange={(e) => setFormData({ ...formData, login: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label>Роль:</label>
        <select
          value={formData.user_role}
          onChange={(e) => setFormData({ ...formData, user_role: e.target.value })}
        >
          {Object.entries({
            Administrator: 'Администратор',
            Moderator: 'Модератор',
            Publisher: 'Публикатор'
          }).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="custom_button_short action-confirm"
        >
          Сохранить
        </button>
        <button
          type="button"
          className="custom_button_short"
          onClick={onCancel}
        >
          Отмена
        </button>
      </div>
    </form>
  );
};

UserEditForm.propTypes = {
  user: PropTypes.shape({
    userID: PropTypes.number.isRequired,
    login: PropTypes.string,
    nick: PropTypes.string,
    user_role: PropTypes.string
  }).isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default React.memo(UserEditForm);