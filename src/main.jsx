import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AnalyticsConsent from "./components/AnalyticsConsent.jsx";
import "./index.css"; // 🔥 THIS LINE IS MUST

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <><App /><AnalyticsConsent /></>
  </React.StrictMode>
);
