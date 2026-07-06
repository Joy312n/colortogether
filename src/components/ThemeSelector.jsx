import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "./ThemeContext";
import { Sun, Moon, Palette, Check, ChevronDown } from "lucide-react";

export default function ThemeSelector() {
  const { themes, activeTheme, mode, setTheme, setMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative flex items-center gap-2" ref={dropdownRef}>
      {/* Light/Dark Toggle Button */}
      <button
        onClick={() => setMode(mode === "dark" ? "light" : "dark")}
        className="p-2 rounded-xl bg-app-surface border border-app-border text-app-text-muted hover:text-app-text hover:bg-app-surface-hover transition-all flex items-center justify-center cursor-pointer shadow-sm"
        title={`Switch to ${mode === "dark" ? "Light" : "Dark"} Mode`}
        aria-label="Toggle Light/Dark Mode"
      >
        {mode === "dark" ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-500" />
        )}
      </button>

      {/* Theme Selection Dropdown Button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-2 bg-app-surface border border-app-border text-app-text hover:bg-app-surface-hover rounded-xl flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer shadow-sm"
          title="Select Color Theme"
        >
          <Palette className="w-4 h-4 text-app-primary" />
          <span className="hidden md:inline">{activeTheme.name}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-app-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-app-surface border border-app-border shadow-2xl p-2 z-[100] animate-fade-in">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-app-text-muted">
              Choose Color Theme
            </div>
            <div className="space-y-1 mt-1">
              {themes.map((theme) => {
                const isActive = theme.id === activeTheme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setTheme(theme.id);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer text-left text-xs font-medium ${
                      isActive 
                        ? "bg-app-primary/10 text-app-primary" 
                        : "text-app-text hover:bg-app-surface-hover"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Theme color swatch */}
                      <span 
                        className="w-4 h-4 rounded-full border border-black/10 dark:border-white/15 shadow-sm block shrink-0" 
                        style={{ backgroundColor: theme.previewColor }}
                      />
                      <span>{theme.name}</span>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-app-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
