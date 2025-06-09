import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import UsersFilters from './UsersFilters';
import UserEditForm from './UserEditForm';
import Pagination from '../../../features/Pagination';
import { translateRole } from '../../../utils/translatedRoles';

const UsersManagement = ({
  users,
  uniqueRoles,
  editingUser,
  pagination,
  handlePageChange,
  handleFilterChange,
  deleteUser,
  deleteAllUsers,
  setEditingUser,
  updateUser,
  filters,
  onClearFilters,
  usersWithRealPasswords,
  showPasswords,
  toggleAllPasswords,
}) => {
  const getPasswordDisplay = (user) => {
    if (!showPasswords) return '********';

    const userWithPassword = (usersWithRealPasswords || []).find(u =>
      u.userID === user.userID
    );

    return userWithPassword?.real_password
      || userWithPassword?.password
      || '********';
  };

  const currentUsers = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.perPage;
    return users.slice(start, start + pagination.perPage);
  }, [users, pagination]);

  return (
    <>
      <UsersFilters
        uniqueRoles={uniqueRoles}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClear={onClearFilters}
        onDeleteAll={deleteAllUsers}
        deleteDisabled={users.length === 0}
        showPasswords={showPasswords}
        toggleAllPasswords={toggleAllPasswords}
      />

      <Pagination
        totalPages={pagination.totalPages}
        currentPage={pagination.currentPage}
        paginate={handlePageChange}
        totalItems={pagination.totalItems}
      />

      <div className="data-list">
        {currentUsers.length === 0 ? (
          <p>Пользователи не найдены</p>
        ) : currentUsers.map(user => (
          <div key={user.userID} className="data-item">
            <h2>{user.nick}</h2>

            {editingUser === user.userID ? (
              <UserEditForm
                user={user}
                onSave={updateUser}
                onCancel={() => setEditingUser(null)}
              />
            ) : (
              <>
                <div className="user-details">
                  {user?.userID && <p><strong>ID:</strong> {user.userID}</p>}
                  {user?.nick && <p><strong>Никнейм:</strong> {user.nick}</p>}
                  {user?.login && <p><strong>Логин:</strong> {user.login}</p>}
                  {user && (
                    <p>
                      <strong>Пароль:</strong> {getPasswordDisplay(user)}
                    </p>
                  )}
                  {user?.user_role && (
                    <p><strong>Роль:</strong> {translateRole(user.user_role)}</p>
                  )}
                  {user.registration_date && (
                    <p>
                      <strong>Дата регистрации:</strong>{' '}
                      {new Date(user.registration_date).toLocaleDateString('ru-RU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                      {', '}
                      {new Date(user.registration_date).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
                <div className="list-actions">
                  <button
                    className="custom_button_short action-options"
                    onClick={() => setEditingUser(user.userID)}
                  >
                    Редактировать
                  </button>
                  <button
                    className="custom_button_short action-remove"
                    onClick={() => deleteUser(user.userID)}
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
    </>
  );
};

UsersManagement.propTypes = {
  users: PropTypes.array.isRequired,
  uniqueRoles: PropTypes.array.isRequired,
  editingUser: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  pagination: PropTypes.shape({
    totalPages: PropTypes.number,
    currentPage: PropTypes.number,
    totalItems: PropTypes.number,
    perPage: PropTypes.number,
  }).isRequired,
  handlePageChange: PropTypes.func.isRequired,
  handleFilterChange: PropTypes.func.isRequired,
  setEditingUser: PropTypes.func.isRequired,
  deleteUser: PropTypes.func.isRequired,
  deleteAllUsers: PropTypes.func.isRequired,
  updateUser: PropTypes.func.isRequired,
  filters: PropTypes.shape({
    role: PropTypes.string,
    dateRange: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
  }).isRequired,
  onClearFilters: PropTypes.func.isRequired,
  usersWithRealPasswords: PropTypes.array.isRequired,
  showPasswords: PropTypes.bool.isRequired,
  toggleAllPasswords: PropTypes.func.isRequired,
};

export default React.memo(UsersManagement);