import { HiOutlineMoon, HiOutlineSun } from 'react-icons/hi2';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ className = '' }: { className?: string }) => {
  const { theme, toggleTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return <button type="button" className={className} onClick={toggleTheme} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
    {theme === 'dark' ? <HiOutlineSun aria-hidden="true" /> : <HiOutlineMoon aria-hidden="true" />}
  </button>;
};

export default ThemeToggle;
