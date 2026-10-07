import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { DesktopProvider } from "./core/store";
import Desktop from "./components/Desktop";
import "./style.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DesktopProvider>
      <Desktop />
    </DesktopProvider>
  </React.StrictMode>,
);
