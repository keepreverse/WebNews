import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import useNewsModeration from "../../../hooks/useNewsModeration";
import NewsModeration from "./NewsModeration";

const NewsModerationPage = () => {
  const {
    allNews,
    pendingNews,
    pagination,
    handleModerate,
    handleArchive,
    filters,
    onFilterChange,
    onClearFilters,
    fetchPendingNews,
    handlePageChange
  } = useNewsModeration();

  useEffect(() => {
    fetchPendingNews();
  }, [fetchPendingNews]);

  return (
    <>
      <Helmet>
        <title>Модерация новостей</title>
      </Helmet>
      <NewsModeration
        allNews={allNews}
        pendingNews={pendingNews}
        pagination={pagination}
        handleModerate={handleModerate}
        handleArchive={handleArchive}
        filters={filters}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
        handlePageChange={handlePageChange}
      />
    </>
  );
};

export default NewsModerationPage;
