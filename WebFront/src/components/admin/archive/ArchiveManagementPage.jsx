import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import useArchiveManagement from "../../../hooks/useArchiveManagement";
import ArchiveManagement from "./ArchiveManagement";

const ArchiveManagementPage = () => {
  const {
    archive,
    allArchive,
    pagination,
    filters,
    fetchArchivedNews,
    onFilterChange,
    onClearFilters,
    restoreNews,
    restoreEditNews,
    deleteArchiveNews,
    deleteArchive,
    handlePageChange,
  } = useArchiveManagement();

  useEffect(() => {
    fetchArchivedNews();
  }, [fetchArchivedNews]);

  return (
    <>
      <Helmet>
        <title>Архив</title>
      </Helmet>
      <ArchiveManagement
        archive={archive}
        allArchive={allArchive}
        pagination={pagination}
        filters={filters}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
        restoreNews={restoreNews}
        restoreEditNews={restoreEditNews}
        deleteArchiveNews={deleteArchiveNews}
        deleteArchive={deleteArchive}
        handlePageChange={handlePageChange}
      />
    </>
  );
};

export default ArchiveManagementPage;
