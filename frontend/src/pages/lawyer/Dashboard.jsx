import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { casesAPI, appointmentsAPI, billingAPI, messagesAPI } from '../../api/axios.js';
import AIChatWidget from '../../components/AIChatWidget.jsx';

function LawyerDashboard() {
  const [stats, setStats] = useState({});
  const [billingStats, setBillingStats] = useState({});
  const [recentCases, setRecentCases] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, billingRes, casesRes, aptRes, unreadRes] = await Promise.all([
        casesAPI.getStats(),
        billingAPI.getSummary(),
        casesAPI.list(),
        appointmentsAPI.getUpcoming(),
        messagesAPI.getUnreadCount(),
      ]);

      setStats(statsRes.data);
      setBillingStats(billingRes.data);
      setRecentCases(casesRes.data.slice(0, 5));
      setUpcomingAppointments(aptRes.data.slice(0, 3));
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
      <h1 style={{ marginBottom: '30px' }}>Lawyer Dashboard</h1>
      <AIChatWidget />

      {/* Stats Grid */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total || 0}</div>
          <div className="stat-label">Total Cases</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.in_progress || 0}</div>
          <div className="stat-label">Active Cases</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{billingStats.unbilled_hours || 0}</div>
          <div className="stat-label">Unbilled Hours</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${billingStats.outstanding || 0}</div>
          <div className="stat-label">Outstanding</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{unreadMessages}</div>
          <div className="stat-label">Unread Messages</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Active Cases */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Active Cases</h2>
            <Link to="/lawyer/cases" className="btn btn-secondary btn-sm">View All</Link>
          </div>

          {recentCases.length === 0 ? (
            <div className="empty-state">
              <p>No active cases</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Case #</th>
                    <th>Title</th>
                    <th>Client</th>
                    <th>Status</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCases.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/lawyer/cases/${c.id}`}>{c.case_number}</Link>
                      </td>
                      <td>{c.title}</td>
                      <td>{c.client_name}</td>
                      <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                      <td><span className={`badge badge-${c.priority}`}>{c.priority}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          {/* Upcoming Appointments */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <h2 className="card-title">Today's Schedule</h2>
            </div>

            {upcomingAppointments.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>
                <p>No upcoming appointments</p>
              </div>
            ) : (
              <div>
                {upcomingAppointments.map((apt) => (
                  <div key={apt.id} style={{
                    padding: '15px',
                    borderBottom: '1px solid #e2e8f0',
                  }}>
                    <div style={{ fontWeight: 600 }}>{apt.client_name}</div>
                    <div style={{ color: '#718096', fontSize: '0.875rem' }}>
                      {apt.case_number}
                    </div>
                    <div style={{ color: '#3182ce', fontSize: '0.875rem', marginTop: '5px' }}>
                      {new Date(apt.datetime).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 style={{ marginBottom: '15px' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link to="/lawyer/billing" className="btn btn-primary">Log Time</Link>
              <Link to="/lawyer/messages" className="btn btn-secondary">Check Messages</Link>
              <Link to="/lawyer/appointments" className="btn btn-secondary">View Calendar</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LawyerDashboard;
