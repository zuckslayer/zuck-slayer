import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import Home from "./pages/Home";
import "./styles/global.css";
import "./firebase";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <Home />
    </Router>
  </React.StrictMode>
);

