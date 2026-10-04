import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import App from "./App";
import "./styles/global.css";
import "./firebase";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";  // 🔥 add

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>          {/* 🔥 wrap */}
        <Router>
          <App />
        </Router>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);

