import React, { useState, useEffect } from 'react';
import { authAPI } from '../../api/axios.js';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await authAPI.getUsers();
      setUsers(res.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = filter
    ? users.filter(u => u.role === filter)
    : users;

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>User Management</h1>
        <select
          className="form-input form-select"
          style={{ width: 'auto' }}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All Users</option>
          <option value="client">Clients</option>
          <option value="lawyer">Lawyers</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Specialization</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td><strong>{user.full_name}</strong></td>
                  <td>{user.email}</td>
                  <td><span className="badge">{user.role}</span></td>
                  <td>{user.phone || '-'}</td>
                  <td>{user.specialization || '-'}</td>
                  <td>
                    <span className={`badge ${user.is_active ? 'badge-open' : 'badge-closed'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminUsers;
