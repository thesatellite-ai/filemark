import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WelcomeApp } from "./WelcomeApp";
import "../styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WelcomeApp />
  </StrictMode>,
);
