import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter as Router } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import App from "./App";
import { initAuthToken } from "./services/apiClient";

import "./styles/Globals.css";
import "react-toastify/dist/ReactToastify.css";

// Инициализация токена
initAuthToken();

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
    <HelmetProvider>
      <Router>
        <App />
      </Router>
    </HelmetProvider>
);

// Перезагрузка при ошибке Jodit
window.onerror = function (message) {
  if (String(message).includes("Cannot read properties of null (reading 'value')")) {
    window.location.reload();
    return true;
  }
};
