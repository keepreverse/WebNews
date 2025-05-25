import React, { useState } from 'react';
import useCategoriesManagement from '../../../hooks/useCategoriesManagement';
import Pagination from '../Pagination';
import CategoriesFilters from './CategoriesFilters';
import CategoryEditForm from './CategoryEditForm';

const CategoriesManagement = () => {
  const {
    categories,
    pagination,
    filters,
    handlePageChange,
    handleFilterChange,
    createCategory,
    deleteCategory,
    handleDeleteAllCategories,
    updateCategory
  } = useCategoriesManagement();

  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = (name, description) => {
    createCategory(name, description);
    setIsCreating(false);
  };

  return (
    <div className="management-container">
      <CategoriesFilters
        searchFilter={filters.search}
        dateRange={filters.dateRange}
        onSearchChange={(value) => handleFilterChange('search', value)}
        onDateChange={(dates) => handleFilterChange('dateRange', dates)}
        onClear={() => {
          handleFilterChange('search', '');
          handleFilterChange('dateRange', [null, null]);
        }}
        onDeleteAll={handleDeleteAllCategories}
        deleteDisabled={categories.length === 0}
      />

      <div className="filters-container" style={{ padding: '0 0 12px 0' }}>
        <button 
          className="custom_button"
          style={{ margin: '0' }}
          onClick={() => setIsCreating(true)}
        >
          Создать новую категорию
        </button>
      </div>

      {isCreating && (
        <div className="data-item">
          <CategoryEditForm
            onSave={handleCreate}
            onCancel={() => setIsCreating(false)}
            isCreating={true}
          />
        </div>
      )}

      <div className="data-list">
        {categories.map(category => (
          <div key={category.categoryID} className="data-item">
            {editingCategoryId === category.categoryID ? (
              <CategoryEditForm
                category={category}
                onSave={(name, desc) => {
                  updateCategory(category.categoryID, {name, description: desc});
                  setEditingCategoryId(null);
                }}
                onCancel={() => setEditingCategoryId(null)}
              />
            ) : (
              <>
                <div className="user-details">
                  <h2>{category.name}</h2>
                  <p><strong>ID:</strong> {category.categoryID}</p>
                  {category.description && <p><strong>Описание:</strong> {category.description}</p>}
                  <p><strong>Дата создания:</strong> {new Date(category.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="list-actions">
                  <button 
                    className="custom_button_short" 
                    id="edit" 
                    onClick={() => setEditingCategoryId(category.categoryID)}
                  >
                    Редактировать
                  </button>
                  <button 
                    className="custom_button_short" 
                    id="delete" 
                    onClick={() => deleteCategory(category.categoryID)}
                  >
                    Удалить
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <Pagination
        totalPages={pagination.totalPages}
        currentPage={pagination.currentPage}
        paginate={handlePageChange}
        totalItems={pagination.totalItems}
      />
    </div>
  );
};

export default CategoriesManagement;