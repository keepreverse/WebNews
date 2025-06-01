import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import useCategoriesManagement from "../../../hooks/useCategoriesManagement";
import CategoriesManagement from "./CategoriesManagement";

const CategoriesManagementPage = () => {
  const {
    categories,
    pagination,
    filters,
    fetchCategories,
    handleFilterChange,
    clearFilters,
    handlePageChange
  } = useCategoriesManagement();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <>
      <Helmet>
        <title>Категории</title>
      </Helmet>
      <CategoriesManagement
        categories={categories}
        pagination={pagination}
        filters={filters}
        handleFilterChange={handleFilterChange}
        clearFilters={clearFilters}
        handlePageChange={handlePageChange}
      />
    </>
  );
};

export default CategoriesManagementPage;
