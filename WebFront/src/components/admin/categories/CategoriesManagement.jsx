import React, { useState, useMemo } from 'react';
import Pagination from '../../../features/Pagination';
import CategoriesFilters from './CategoriesFilters';
import CategoryEditForm from './CategoryEditForm';

const CategoriesManagement = ({
  categories,
  pagination,
  filters,
  handlePageChange,
  handleFilterChange,
  createCategory,
  deleteCategory,
  deleteAllCategories,
  updateCategory
}) => {
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const currentCategories = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.perPage;
    return categories.slice(start, start + pagination.perPage);
  }, [categories, pagination]);

  const handleCreate = (name, description) => {
    createCategory(name, description);
    setIsCreating(false);
  };

  return (
    <div className="management-container">
      <CategoriesFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClear={() => { handleFilterChange('search', ''); handleFilterChange('dateRange', []); }}
        onDeleteAll={deleteAllCategories}
        deleteDisabled={categories.length === 0}
      />

      <div className="filters-container" style={{ padding: '0 0 12px 0' }}>
        <button 
          className="custom_button_long  action-options"
          onClick={() => setIsCreating(true)}
        >
          Новая категория
        </button>
      </div>

      {isCreating && (
        <div className="data-item" style={{margin: '12px'}}>
          <CategoryEditForm
            onSave={handleCreate}
            onCancel={() => setIsCreating(false)}
            isCreating={true}
          />
        </div>
      )}

      <Pagination
        totalPages={pagination.totalPages}
        currentPage={pagination.currentPage}
        paginate={handlePageChange}
        totalItems={pagination.totalItems}
      />

      <div className="data-list">
        {currentCategories.length === 0 ? (
          <p>Категории не найдены</p>
        ) : currentCategories.map(category => (
          <div key={category.categoryID} className="data-item">
            <h2>{category.name}</h2>

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
                  {category?.categoryID && <p><strong>ID:</strong> {category.categoryID}</p>}
                  {category?.name && <p><strong>Название:</strong> {category.name}</p>}
                  {category?.description && <p><strong>Описание:</strong> {category.description}</p>}
                  {category?.create_date && (
                    <p>
                      <strong>Дата создания:</strong>{" "}
                      {new Date(category.create_date).toLocaleDateString("ru-RU", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      {", "}
                      {new Date(category.create_date).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
                <div className="list-actions">
                  <button 
                    className="custom_button_short action-options" 
                    onClick={() => setEditingCategoryId(category.categoryID)}
                  >
                    Редактировать
                  </button>
                  <button 
                    className="custom_button_short action-remove" 
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

export default React.memo(CategoriesManagement);