import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { casesAPI, appointmentsAPI, messagesAPI } from '../../api/axios.js';
import AIChatWidget from '../../components/AIChatWidget.jsx';

function ClientDashboard() {
  const [stats, setStats] = useState({});
  const [recentCases, setRecentCases] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, casesRes, appointmentsRes, unreadRes] = await Promise.all([
        casesAPI.getStats(),
        casesAPI.list(),
        appointmentsAPI.getUpcoming(),
        messagesAPI.getUnreadCount(),
      ]);

      setStats(statsRes.data);
      setRecentCases(casesRes.data.slice(0, 5));
      setUpcomingAppointments(appointmentsRes.data.slice(0, 3));
      setUnreadMessages(unreadRes.data.unread_count);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>Welcome to Your Dashboard</h1>
      <AIChatWidget />

      {/* Stats Grid */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total || 0}</div>
          <div className="stat-label">Total Cases</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.open || 0}</div>
          <div className="stat-label">Open Cases</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.in_progress || 0}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{unreadMessages}</div>
          <div className="stat-label">Unread Messages</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Recent Cases */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Cases</h2>
            <Link to="/client/cases" className="btn btn-secondary btn-sm">View All</Link>
          </div>

          {recentCases.length === 0 ? (
            <div className="empty-state">
              <p>No cases yet</p>
              <Link to="/client/cases" className="btn btn-primary btn-sm">Create a Case</Link>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Case #</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Lawyer</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCases.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/client/cases/${c.id}`}>{c.case_number}</Link>
                      </td>
                      <td>{c.title}</td>
                      <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                      <td>{c.lawyer_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upcoming Appointments */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Upcoming Appointments</h2>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="empty-state">
              <p>No upcoming appointments</p>
            </div>
          ) : (
            <div>
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} style={{
                  padding: '15px',
                  borderBottom: '1px solid #e2e8f0',
                }}>
                  <div style={{ fontWeight: 600 }}>{apt.case_number}</div>
                  <div style={{ color: '#718096', fontSize: '0.875rem' }}>
                    {new Date(apt.datetime).toLocaleString()}
                  </div>
                  <div style={{ marginTop: '5px' }}>
                    <span className={`badge badge-${apt.status}`}>{apt.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClientDashboard;
