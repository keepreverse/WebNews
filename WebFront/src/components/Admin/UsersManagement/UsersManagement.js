import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import UsersFilters from './UsersFilters';
import UserEditForm from './UserEditForm';
import Pagination from '../Pagination';
import { translateRole } from '../../../utils/helpers';

const UsersManagement = ({
  users,
  uniqueRoles,
  editingUser,
  pagination,
  onPageChange,
  handleDeleteUser,
  handleDeleteAllUsers,
  setEditingUser,
  updateUser,
  filters,
  onFilterChange,
  onClearFilters,
  showPasswords,
  toggleAllPasswords,
  usersWithRealPasswords
}) => {
  const currentUsers = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.perPage;
    return users.slice(start, start + pagination.perPage);
  }, [users, pagination]);

  const getPasswordDisplay = (user) => {
    if (!showPasswords) return '********';
    
    const userWithPassword = (usersWithRealPasswords || []).find(u => 
      u.userID === user.userID
    );
    
    return userWithPassword?.real_password 
      || userWithPassword?.password 
      || '********';
  };

  return (
    <>
      <UsersFilters
        uniqueRoles={uniqueRoles}
        roleFilter={filters.role}
        dateRange={filters.dateRange}
        showPasswords={showPasswords}
        onRoleChange={(e) => onFilterChange('role', e.target.value)}
        onDateChange={(dates) => onFilterChange('dateRange', dates)}
        onTogglePasswords={toggleAllPasswords}
        onClear={onClearFilters}
        onDeleteAll={handleDeleteAllUsers}
        deleteDisabled={users.length === 0}
      />
      
      <Pagination
        totalPages={pagination.totalPages}
        currentPage={pagination.currentPage}
        paginate={onPageChange}
        totalItems={pagination.totalItems}
      />

      <div className="data-list">
        {currentUsers.length === 0 ? (
          <p>Пользователи не найдены</p>
        ) : currentUsers.map(user => (
          <div key={user.userID} className="data-item">
            <h2>{user.nick || user.login}</h2>

            {editingUser === user.userID ? (
              <UserEditForm
                user={user}
                onSave={updateUser}
                onCancel={() => setEditingUser(null)}
              />
            ) : (
              <>
                <div className="user-details">
                  <p><strong>ID:</strong> {user.userID}</p>
                  <p><strong>Роль:</strong> {translateRole(user.user_role)}</p>
                  <p><strong>Никнейм:</strong> {user.nick || "Не указан"}</p>
                  <p><strong>Логин:</strong> {user.login}</p>
                  <p><strong>Пароль:</strong> {getPasswordDisplay(user)}</p>
                </div>
                <div className="list-actions">
                  <button 
                    className="custom_button_short" 
                    id="edit" 
                    onClick={() => setEditingUser(user.userID)}
                  >
                    Редактировать
                  </button>
                  <button 
                    className="custom_button_short" 
                    id="delete" 
                    onClick={() => handleDeleteUser(user.userID)}
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
        paginate={onPageChange}
        totalItems={pagination.totalItems}
      />
    </>
  );
};

UsersManagement.propTypes = {
  users: PropTypes.array.isRequired,
  uniqueRoles: PropTypes.array.isRequired,
  editingUser: PropTypes.number,
  pagination: PropTypes.shape({
    currentPage: PropTypes.number.isRequired,
    perPage: PropTypes.number.isRequired,
    totalPages: PropTypes.number.isRequired,
    totalItems: PropTypes.number.isRequired
  }).isRequired,
  onPageChange: PropTypes.func.isRequired,
  setEditingUser: PropTypes.func.isRequired,
  handleDeleteUser: PropTypes.func.isRequired,
  handleDeleteAllUsers: PropTypes.func.isRequired,
  updateUser: PropTypes.func.isRequired,
  filters: PropTypes.shape({
    role: PropTypes.string,
    dateRange: PropTypes.array
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
  showPasswords: PropTypes.bool.isRequired,
  toggleAllPasswords: PropTypes.func.isRequired,
  usersWithRealPasswords: PropTypes.array.isRequired
};

export default React.memo(UsersManagement);