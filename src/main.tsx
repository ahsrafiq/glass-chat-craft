import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Prevent browser scroll restoration
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// Prevent any auto-scroll on page load
window.addEventListener('DOMContentLoaded', () => {
  window.scrollTo(0, 0);
});

createRoot(document.getElementById("root")!).render(<App />);
