import React from 'react';
import { HiOutlineMoon, HiOutlineSun } from 'react-icons/hi2';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className={`navbar-btn theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
    >
      {theme === 'dark' ? <HiOutlineSun /> : <HiOutlineMoon />}
    </button>
  );
};

export default ThemeToggle;
