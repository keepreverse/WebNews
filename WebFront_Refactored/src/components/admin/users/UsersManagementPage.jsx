import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import useUsersManagement from "../../../hooks/useUsersManagement";
import UsersManagement from "./UsersManagement";

const UsersManagementPage = () => {
  const {
    users,
    uniqueRoles,
    pagination,
    showPasswords,
    editingUser,
    setEditingUser,
    deleteUser,
    deleteAllUsers,
    updateUser,
    toggleAllPasswords,
    usersWithRealPasswords,
    filters,
    handleFilterChange,
    clearFilters,
    fetchUsers,
    handlePageChange
  } = useUsersManagement();

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <>
      <Helmet>
        <title>Пользователи</title>
      </Helmet>
      <UsersManagement
        users={users}
        uniqueRoles={uniqueRoles}
        pagination={pagination}
        showPasswords={showPasswords}
        editingUser={editingUser}
        setEditingUser={setEditingUser}
        deleteUser={deleteUser}
        deleteAllUsers={deleteAllUsers}
        updateUser={updateUser}
        toggleAllPasswords={toggleAllPasswords}
        usersWithRealPasswords={usersWithRealPasswords}
        filters={filters}
        handleFilterChange={handleFilterChange}
        clearFilters={clearFilters}
        handlePageChange={handlePageChange}
      />
    </>
  );
};

export default UsersManagementPage;
