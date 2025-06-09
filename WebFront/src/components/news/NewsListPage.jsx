import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";

import PageWrapper from "../../features/PageWrapper";
import NewsList from "./NewsList";
import useNewsList from "../../hooks/useNewsList";
import { api } from "../../services/apiClient";

function NewsListPage() {
  const navigate = useNavigate();
  const {
    allNews,
    filteredNews,
    currentNews,
    pagination,
    filters,
    handleFilterChange,
    clearFilters,
    archiveNews,
    deleteNews,
    deleteAllNews,
    openLightbox,
    closeLightbox,
    lightboxOpen,
    lightboxIndex,
    lightboxSlides,
    handlePageChange,
  } = useNewsList();

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    api.ping().then((alive) => {
      if (!alive) {
        toast.error("Сервер не отвечает! Пожалуйста, попробуйте позже");
      }
    });
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user") || sessionStorage.getItem("user") || "null";
      const userData = JSON.parse(raw);
      if (userData) {
        setCurrentUser(userData);
        api.setAuthToken(userData.token);
      }
    } catch {
      setCurrentUser(null);
    }
  }, []);

  const handleEdit = (newsItem) => {
    navigate(`/news-creator?edit=${newsItem.newsID}`);
  };

  return (
    <PageWrapper>
      <Helmet>
        <title>Список публикаций</title>
      </Helmet>

      <div id="data-list-form" className="container">
        <h1>Список публикаций</h1>

        <NewsList
          currentUser={currentUser}
          allNews={allNews}
          filteredNews={filteredNews}
          currentNews={currentNews}
          pagination={pagination}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          onArchiveNews={archiveNews}
          onDeleteNews={deleteNews}
          onDeleteAllNews={deleteAllNews}
          onEditNews={handleEdit}
          onPageChange={(page) => handlePageChange(page, filteredNews.length)}
          onOpenLightbox={openLightbox}
          onCloseLightbox={closeLightbox}
          lightboxOpen={lightboxOpen}
          lightboxIndex={lightboxIndex}
          lightboxSlides={lightboxSlides}
        />
      </div>

      <ToastContainer />
    </PageWrapper>
  );
}

export default NewsListPage;
