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
  currentPage,
  usersPerPage,
  usersTotalPages,
  setCurrentPage,
  setEditingUser,
  handleDeleteUser,
  updateUser,
  filters,
  onFilterChange,
  onClearFilters,
  showPasswords,
  toggleAllPasswords,
  usersWithRealPasswords
}) => {
  const currentUsers = useMemo(() => {
    const indexOfLastUser = currentPage * usersPerPage;
    return users.slice(indexOfLastUser - usersPerPage, indexOfLastUser);
  }, [users, currentPage, usersPerPage]);

  const getPasswordDisplay = (user) => {
    if (!showPasswords) return '********';
    const userWithPassword = usersWithRealPasswords.find(u => u.userID === user.userID);
    return userWithPassword?.real_password || userWithPassword?.password || '********';
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
      />

      {usersTotalPages > 1 && (
        <Pagination
          totalPages={usersTotalPages}
          currentPage={currentPage}
          paginate={setCurrentPage}
        />
      )}

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
                    Изменить
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

      {usersTotalPages > 1 && (
        <Pagination
          totalPages={usersTotalPages}
          currentPage={currentPage}
          paginate={setCurrentPage}
        />
      )}
    </>
  );
};

UsersManagement.propTypes = {
  users: PropTypes.array.isRequired,
  uniqueRoles: PropTypes.array.isRequired,
  editingUser: PropTypes.number,
  currentPage: PropTypes.number.isRequired,
  usersPerPage: PropTypes.number.isRequired,
  usersTotalPages: PropTypes.number.isRequired,
  setCurrentPage: PropTypes.func.isRequired,
  setEditingUser: PropTypes.func.isRequired,
  handleDeleteUser: PropTypes.func.isRequired,
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