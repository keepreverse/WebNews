import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import useTrashManagement from '../../../hooks/useTrashManagement';
import TrashManagement from './TrashManagement';

const TrashManagementPage = () => {
  const {
    trash,
    pagination,
    filters,
    fetchDeletedNews,
    handleFilterChange,
    restoreNews,
    restoreEditNews,
    purgeSingleNews,
    purgeTrash,
    handlePageChange
  } = useTrashManagement();

  useEffect(() => {
    fetchDeletedNews();
  }, [fetchDeletedNews]);

  return (
    <>
      <Helmet>
        <title>Корзина</title>
      </Helmet>
      <TrashManagement
        trash={trash}
        pagination={pagination}
        filters={filters}
        handleFilterChange={handleFilterChange}
        restoreNews={restoreNews}
        restoreEditNews={restoreEditNews}
        purgeSingleNews={purgeSingleNews}
        purgeTrash={purgeTrash}
        handlePageChange={handlePageChange}
      />
    </>
  );
};

export default TrashManagementPage;
