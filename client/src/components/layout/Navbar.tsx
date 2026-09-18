import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getInitials } from '../../utils/helpers';
import NotificationBell from './NotificationBell';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineBars3, HiOutlineUser,
  HiOutlineArrowRightOnRectangle, HiOutlineCog6Tooth,
} from 'react-icons/hi2';

interface NavbarProps {
  collapsed: boolean;
  onMobileToggle: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ collapsed, onMobileToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/dashboard?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className={`navbar ${collapsed ? 'collapsed' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="navbar-btn" onClick={onMobileToggle} style={{ display: 'none' }} id="mobile-menu-btn">
          <HiOutlineBars3 />
        </button>
        <form className="navbar-search" onSubmit={handleSearch}>
          <HiOutlineMagnifyingGlass className="search-icon" />
          <input
            type="text"
            placeholder="Search help posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      <div className="navbar-right">
        <NotificationBell />

        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div className="user-menu" onClick={() => setShowDropdown(!showDropdown)}>
            <div className="user-avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                getInitials(user?.name || 'U')
              )}
            </div>
            <span className="user-name">{user?.name?.split(' ')[0]}</span>
          </div>

          {showDropdown && (
            <div className="user-dropdown">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
              <Link to="/profile" className="user-dropdown-item" onClick={() => setShowDropdown(false)}>
                <HiOutlineUser /> Profile
              </Link>
              <Link to="/profile" className="user-dropdown-item" onClick={() => setShowDropdown(false)}>
                <HiOutlineCog6Tooth /> Settings
              </Link>
              <div className="user-dropdown-divider" />
              <button className="user-dropdown-item danger" onClick={handleLogout} style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}>
                <HiOutlineArrowRightOnRectangle /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
