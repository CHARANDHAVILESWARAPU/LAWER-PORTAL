import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authAPI, casesAPI, billingAPI } from '../../api/axios.js';
import AIChatWidget from '../../components/AIChatWidget.jsx';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [caseStats, setCaseStats] = useState({});
  const [billingStats, setBillingStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, caseStatsRes, billingRes] = await Promise.all([
        authAPI.getUsers(),
        casesAPI.getStats(),
        billingAPI.getSummary(),
      ]);
      setUsers(usersRes.data);
      setCaseStats(caseStatsRes.data);
      setBillingStats(billingRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  const clientCount = users.filter(u => u.role === 'client').length;
  const lawyerCount = users.filter(u => u.role === 'lawyer').length;

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>Admin Dashboard</h1>
      <AIChatWidget />

      {/* Stats Grid */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-value">{users.length}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{clientCount}</div>
          <div className="stat-label">Clients</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{lawyerCount}</div>
          <div className="stat-label">Lawyers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{caseStats.total || 0}</div>
          <div className="stat-label">Total Cases</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{caseStats.open || 0}</div>
          <div className="stat-label">Open Cases</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${billingStats.admin_revenue?.toFixed(2) || '0.00'}</div>
          <div className="stat-label">Total Commission (10%)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${billingStats.admin_paid_revenue?.toFixed(2) || '0.00'}</div>
          <div className="stat-label">Paid Commission (10%)</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Recent Users */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Users</h2>
            <Link to="/admin/users" className="btn btn-secondary btn-sm">View All</Link>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 5).map((user) => (
                  <tr key={user.id}>
                    <td>{user.full_name}</td>
                    <td>{user.email}</td>
                    <td><span className="badge">{user.role}</span></td>
                    <td>
                      <span className={`badge ${user.is_active ? 'badge-open' : 'badge-closed'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Overview */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Case Statistics</h2>
          </div>

          <div style={{ padding: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
              <span>Open Cases</span>
              <strong>{caseStats.open || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
              <span>In Progress</span>
              <strong>{caseStats.in_progress || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
              <span>Pending Review</span>
              <strong>{caseStats.pending || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span>Closed</span>
              <strong>{caseStats.closed || 0}</strong>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <Link to="/admin/cases" className="btn btn-primary" style={{ width: '100%' }}>
              Manage Cases
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
