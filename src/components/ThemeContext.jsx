import React, { createContext, useContext, useState, useEffect } from "react";
import { THEMES } from "../utils/themeConfig";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [selectedThemeId, setSelectedThemeId] = useState(() => {
    return localStorage.getItem("colortogether_theme") || "default";
  });
  const [mode, setMode] = useState(() => {
    return localStorage.getItem("colortogether_mode") || "dark";
  });

  const activeTheme = THEMES.find((t) => t.id === selectedThemeId) || THEMES[0];

  // Apply theme variables to root element
  useEffect(() => {
    const root = document.documentElement;
    const colors = activeTheme.colors[mode] || activeTheme.colors.dark;

    // Apply each color CSS variable
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Toggle dark/light mode class for Tailwind if needed (though we use our variables)
    if (mode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    localStorage.setItem("colortogether_theme", selectedThemeId);
    localStorage.setItem("colortogether_mode", mode);
  }, [selectedThemeId, mode, activeTheme]);

  return (
    <ThemeContext.Provider
      value={{
        themes: THEMES,
        activeTheme,
        mode,
        setTheme: setSelectedThemeId,
        setMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
