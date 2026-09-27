import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import { SessionProvider } from "./session";
import Home from "./pages/Home";
import EventPage from "./pages/EventPage";
import Profile from "./pages/Profile";
import Query from "./pages/Query";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <Routes>
          <Route element={<App />}>
            <Route index element={<Home />} />
            <Route path="etkinlik/:id" element={<EventPage />} />
            <Route path="profil" element={<Profile />} />
            <Route path="sorgula" element={<Query />} />
          </Route>
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);
