import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, ShieldCheck, Layers, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="dashboard-page">
      {/* Navigation Header */}
      <header className="dashboard-nav">
        <div className="nav-brand">
          <div className="brand-icon-box">
            <Layers size={18} />
          </div>
          <span className="nav-brand-title">Content Intelligence Platform</span>
        </div>

        <div className="nav-right">
          <div className="status-badge" title="Authenticated session">
            <span className="status-dot" />
            <span>Active Session</span>
          </div>

          <div className="user-profile-summary">
            <div className="user-avatar">{getInitials(user?.name)}</div>
            <span className="user-meta-name">{user?.name || 'User'}</span>
          </div>

          <button
            onClick={handleLogout}
            className="btn-secondary"
            id="dashboard-logout-btn"
            title="Sign out of your session"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="dashboard-main">
        <section className="welcome-section">
          <h1 className="welcome-title">Welcome back, {user?.name || 'User'}</h1>
          <p className="welcome-subtitle">
            Content Intelligence Platform Workspace
          </p>
        </section>

        <div className="cards-grid">
          {/* User Profile Card */}
          <div className="info-card">
            <div className="card-top">
              <h2 className="card-heading">User Profile</h2>
              <div className="card-top-icon">
                <UserIcon size={20} />
              </div>
            </div>

            <div className="detail-list">
              <div className="detail-row">
                <span className="detail-label">Full Name</span>
                <span className="detail-value" id="dashboard-user-name">
                  {user?.name}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Email Address</span>
                <span className="detail-value" id="dashboard-user-email">
                  {user?.email}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">User ID</span>
                <span className="detail-value mono" id="dashboard-user-id">
                  {user?.id}
                </span>
              </div>
            </div>
          </div>

          {/* Session Status Card */}
          <div className="info-card">
            <div className="card-top">
              <h2 className="card-heading">Account & Session</h2>
              <div className="card-top-icon">
                <ShieldCheck size={20} />
              </div>
            </div>

            <div className="detail-list">
              <div className="detail-row">
                <span className="detail-label">Authentication Status</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                  <CheckCircle size={16} color="#10b981" />
                  <span className="detail-value" id="dashboard-auth-status" style={{ color: '#6ee7b7' }}>
                    Authenticated
                  </span>
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-label">Session State</span>
                <span className="detail-value">
                  Active
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Access Level</span>
                <div>
                  <span className="detail-pill">Verified User</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
