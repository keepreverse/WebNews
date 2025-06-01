import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import useTrashManagement from "../../../hooks/useTrashManagement";
import TrashManagement from "./TrashManagement";

const TrashManagementPage = () => {
  const {
    trashedNews,
    pagination,
    filters,
    fetchTrashedNews,
    handleFilterChange,
    clearFilters,
    handlePageChange,
    handleRestore,
    handlePermanentDelete
  } = useTrashManagement();

  useEffect(() => {
    fetchTrashedNews();
  }, [fetchTrashedNews]);

  return (
    <>
      <Helmet>
        <title>Корзина</title>
      </Helmet>
      <TrashManagement
        trashedNews={trashedNews}
        pagination={pagination}
        filters={filters}
        handleFilterChange={handleFilterChange}
        clearFilters={clearFilters}
        handlePageChange={handlePageChange}
        handleRestore={handleRestore}
        handlePermanentDelete={handlePermanentDelete}
      />
    </>
  );
};

export default TrashManagementPage;
