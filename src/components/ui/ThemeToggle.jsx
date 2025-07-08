import React from 'react';

/**
 * ThemeToggle component for switching between light and dark modes
 * @param {Object} props
 * @param {boolean} props.darkMode - Current dark mode state
 * @param {Function} props.onToggle - Function to call when toggling theme
 * @param {string} props.size - Size of the toggle (sm, md, lg)
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element}
 */
const ThemeToggle = ({ 
  darkMode = false, 
  onToggle, 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const themeClasses = darkMode ? {
    button: 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-white',
  } : {
    button: 'bg-white hover:bg-gray-50 border-gray-300 text-gray-900',
  };

  return (
    <button
      onClick={onToggle}
      className={`${sizeClasses[size]} rounded-lg ${themeClasses.button} transition-colors backdrop-blur-sm border ${className}`}
      title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
    >
      {darkMode ? '☀️' : '🌙'}
    </button>
  );
};

export default ThemeToggle;