import React, { useEffect } from 'react';

const ThemeToggle = () => {
  const THEME_STORAGE_KEY = "vehicle-dashboard-theme";

  const applyTheme = (theme) => {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark-mode", isDark);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "light";
    applyTheme(savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <button type="button" id="themeToggle" className="secondary-btn" onClick={toggleTheme}>
      {document.body.classList.contains("dark-mode") ? "Light Mode" : "Dark Mode"}
    </button>
  );
};

export default ThemeToggle;
