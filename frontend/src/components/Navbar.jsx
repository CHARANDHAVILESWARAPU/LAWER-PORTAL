import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavLinks = () => {
    const role = user?.role;
    const base = `/${role}`;

    const commonLinks = [
      { path: `${base}/dashboard`, label: 'Dashboard' },
      { path: `${base}/cases`, label: 'Cases' },
      { path: `${base}/messages`, label: 'Messages' },
      { path: `${base}/appointments`, label: 'Appointments' },
      { path: `${base}/consultations`, label: 'Consultations' },
    ];

    if (role === 'lawyer') {
      commonLinks.push({ path: `${base}/billing`, label: 'Billing' });
    }

    if (role === 'client') {
      commonLinks.push({ path: `${base}/billing`, label: 'Billing' });
      commonLinks.push({ path: `${base}/documents`, label: 'Documents' });
    }

    if (role === 'admin') {
      return [
        { path: '/admin/dashboard', label: 'Dashboard' },
        { path: '/admin/users', label: 'Users' },
        { path: '/admin/cases', label: 'Cases' },
        { path: '/admin/billing', label: 'Billing' },
      ];
    }

    return commonLinks;
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <Link to={`/${user?.role}/dashboard`} className="navbar-brand">
        Legal Portal
      </Link>

      <div className="navbar-nav">
        {getNavLinks().map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="user-info">
        <span>{user?.full_name}</span>
        <span className="user-role">{user?.role}</span>
        <button onClick={handleLogout} className="btn btn-secondary btn-sm">
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
