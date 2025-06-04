import React from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated } from "../services/authHelpers";

const PublicRoute = ({ children }) => {
  return isAuthenticated() ? <Navigate to="/news-list" replace /> : children;
};

export default PublicRoute;
