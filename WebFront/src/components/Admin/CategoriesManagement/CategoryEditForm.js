// CategoryEditForm.js
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const CategoryEditForm = ({ category, onSave, onCancel, isCreating }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (!isCreating && category) {
      setFormData({
        name: category.name || '',
        description: category.description || ''
      });
    }
  }, [category, isCreating]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Название категории не может быть пустым');
      return;
    }
    onSave(formData.name, formData.description);
  };

  return (
    <form className="edit-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Название:</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label>Описание:</label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="form-actions">
        <button
          type="submit"
          id="submit"
          className="custom_button_short"
        >
          {isCreating ? 'Создать' : 'Сохранить изменения'}
        </button>
        <button
          type="button"
          className="custom_button_short cancel"
          onClick={onCancel}
        >
          Отмена
        </button>
      </div>
    </form>
  );
};

CategoryEditForm.propTypes = {
  category: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isCreating: PropTypes.bool
};

export default React.memo(CategoryEditForm);