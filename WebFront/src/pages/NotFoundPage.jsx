import React from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <Helmet>
        <title>Страница не найдена</title>
      </Helmet>
      <h1>404</h1>
      <p>Упс! Такой страницы не существует.</p>
      <Link to="/">На главную</Link>
    </div>
  );
};

export default NotFoundPage;
