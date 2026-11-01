import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Default to 'positivus' so the user sees the new design right away.
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('pmes_theme') || 'positivus';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pmes_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'positivus' ? 'classic' : 'positivus'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isPositivus: theme === 'positivus' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

