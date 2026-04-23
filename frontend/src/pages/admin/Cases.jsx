import React, { useState, useEffect } from 'react';
import { casesAPI } from '../../api/axios.js';

function AdminCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadCases();
  }, [filter]);

  const loadCases = async () => {
    try {
      const res = await casesAPI.list(filter || undefined);
      setCases(res.data);
    } catch (error) {
      console.error('Failed to load cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this case? This action cannot be undone.')) {
      try {
        await casesAPI.delete(id);
        loadCases();
      } catch (error) {
        console.error('Failed to delete case:', error);
      }
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>All Cases</h1>
        <select
          className="form-input form-select"
          style={{ width: 'auto' }}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="pending">Pending</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="card">
        {cases.length === 0 ? (
          <div className="empty-state">
            <p>No cases found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Case #</th>
                  <th>Title</th>
                  <th>Client</th>
                  <th>Lawyer</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.case_number}</strong></td>
                    <td>{c.title}</td>
                    <td>{c.client_name}</td>
                    <td>{c.lawyer_name}</td>
                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                    <td><span className={`badge badge-${c.priority}`}>{c.priority}</span></td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(c.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminCases;
