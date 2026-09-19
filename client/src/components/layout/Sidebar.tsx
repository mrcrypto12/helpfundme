import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  HiOutlineHome, HiOutlinePlusCircle, HiOutlineHeart,
  HiOutlineUser, HiOutlineCog6Tooth, HiOutlineChartBarSquare,
  HiOutlineDocumentCheck, HiOutlineBanknotes, HiOutlineUsers,
  HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineMap,
  HiOutlineArrowUturnLeft,
} from 'react-icons/hi2';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navItems = [
    { icon: <HiOutlineHome />, label: 'Dashboard', path: '/dashboard' },
    { icon: <HiOutlineMap />, label: 'Location', path: '/regions' },
    { icon: <HiOutlinePlusCircle />, label: 'Create Post', path: '/posts/create' },
    { icon: <HiOutlineHeart />, label: 'My Donations', path: '/donations' },
    { icon: <HiOutlineUser />, label: 'My Posts', path: '/my-posts' },
    { icon: <HiOutlineCog6Tooth />, label: 'Settings', path: '/profile' },
  ];

  const adminItems = [
    { icon: <HiOutlineChartBarSquare />, label: 'Admin Dashboard', path: '/admin' },
    { icon: <HiOutlineDocumentCheck />, label: 'Post Management', path: '/admin/posts' },
    { icon: <HiOutlineBanknotes />, label: 'Fund Allocation', path: '/admin/funds' },
    { icon: <HiOutlineBanknotes />, label: 'Withdrawals', path: '/admin/withdrawals' },
    { icon: <HiOutlineArrowUturnLeft />, label: 'Refunds', path: '/admin/refunds' },
    { icon: <HiOutlineUsers />, label: 'Users', path: '/admin/users' },
  ];

  return (
    <>
      <div className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`} onClick={onMobileClose} />
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <img className="logo-icon" src="/logos.png" alt="HelpFundMe logo" />
          <span className="logo-text">HelpFundMe</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Main</div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={onMobileClose}
            >
              <span className="icon">{item.icon}</span>
              <span className="label">{item.label}</span>
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <>
              <div className="nav-section-title" style={{ marginTop: '12px' }}>Administration</div>
              {adminItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={onMobileClose}
                >
                  <span className="icon">{item.icon}</span>
                  <span className="label">{item.label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-toggle" onClick={onToggle}>
            {collapsed ? <HiOutlineChevronRight /> : <HiOutlineChevronLeft />}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
