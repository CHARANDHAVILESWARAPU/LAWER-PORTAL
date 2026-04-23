import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { casesAPI, authAPI } from '../../api/axios.js';

function CaseDetail() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteContent, setNoteContent] = useState('');

  useEffect(() => {
    loadCase();
  }, [id]);

  const loadCase = async () => {
    try {
      const res = await casesAPI.get(id);
      setCaseData(res.data);
    } catch (error) {
      console.error('Failed to load case:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    try {
      await casesAPI.addNote(id, noteContent, false);
      setNoteContent('');
      loadCase();
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (!caseData) {
    return (
      <div>
        <div className="card">
          <div className="empty-state">
            <p>Case not found or access denied.</p>
            <Link to="/client/cases" className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}>
              Back to Cases
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/client/cases" style={{ color: '#3182ce', textDecoration: 'none', fontSize: '0.9rem' }}>
          &larr; Back to Cases
        </Link>
      </div>

      {/* Case Header */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ marginBottom: '8px', color: '#1a365d' }}>{caseData.title}</h1>
            <span style={{ color: '#718096', fontSize: '0.9rem' }}>{caseData.case_number}</span>
          </div>
          <span className={`badge badge-${caseData.status}`}>{caseData.status.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Case Info Grid */}
      <div className="dashboard-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-label">Lawyer</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1a365d', marginTop: '4px' }}>
            {caseData.lawyer?.full_name}
          </div>
          {caseData.lawyer?.email && (
            <div style={{ color: '#718096', fontSize: '0.85rem', marginTop: '2px' }}>{caseData.lawyer.email}</div>
          )}
          {caseData.lawyer?.specialization && (
            <div style={{ color: '#718096', fontSize: '0.85rem', marginTop: '2px' }}>{caseData.lawyer.specialization}</div>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-label">Priority</div>
          <div style={{ marginTop: '8px' }}>
            <span className={`badge badge-${caseData.priority}`}>{caseData.priority}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Category</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1a365d', marginTop: '4px' }}>
            {caseData.category || 'General'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Created</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1a365d', marginTop: '4px' }}>
            {new Date(caseData.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Description */}
      {caseData.description && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '12px', color: '#1a365d' }}>Description</h3>
          <p style={{ color: '#4a5568', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{caseData.description}</p>
        </div>
      )}

      {/* Notes Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Notes ({caseData.notes?.length || 0})</h2>
        </div>

        {/* Add Note Form */}
        <div style={{ marginBottom: '20px', padding: '16px', background: '#f7fafc', borderRadius: '8px' }}>
          <textarea
            className="form-input form-textarea"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Add a note..."
            rows={3}
            style={{ marginBottom: '10px' }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={!noteContent.trim()}>
            Add Note
          </button>
        </div>

        {/* Notes List */}
        {(!caseData.notes || caseData.notes.length === 0) ? (
          <div className="empty-state" style={{ padding: '30px' }}>
            <p>No notes yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {caseData.notes.map((note) => (
              <div
                key={note.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '0.875rem', color: '#1a365d' }}>{note.author_name}</strong>
                  <span style={{ fontSize: '0.8rem', color: '#a0aec0' }}>
                    {new Date(note.created_at).toLocaleString()}
                  </span>
                </div>
                <p style={{ color: '#4a5568', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ClientCases() {
  const { id } = useParams();

  if (id) {
    return <CaseDetail />;
  }

  return <CaseList />;
}

function CaseList() {
  const [cases, setCases] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCase, setNewCase] = useState({
    title: '',
    description: '',
    lawyer_id: '',
    category: '',
    priority: 'medium',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [casesRes, lawyersRes] = await Promise.all([
        casesAPI.list(),
        authAPI.getLawyers(),
      ]);
      setCases(casesRes.data);
      setLawyers(lawyersRes.data);
    } catch (error) {
      console.error('Failed to load cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      await casesAPI.create({
        ...newCase,
        client_id: user.id,
        lawyer_id: parseInt(newCase.lawyer_id),
      });
      setShowCreateModal(false);
      setNewCase({ title: '', description: '', lawyer_id: '', category: '', priority: 'medium' });
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create case');
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>My Cases</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + New Case
        </button>
      </div>

      {cases.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p>You don't have any cases yet.</p>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              Create Your First Case
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Case #</th>
                  <th>Title</th>
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
                    <td>{c.lawyer_name}</td>
                    <td><span className={`badge badge-${c.status}`}>{c.status.replace('_', ' ')}</span></td>
                    <td><span className={`badge badge-${c.priority}`}>{c.priority}</span></td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/client/cases/${c.id}`} className="btn btn-secondary btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Case Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '500px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="card-header">
              <h2 className="card-title">Create New Case</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>
                ×
              </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleCreateCase}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={newCase.title}
                  onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                  placeholder="Brief title for your case"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input form-textarea"
                  value={newCase.description}
                  onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                  placeholder="Describe your legal issue..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Select Lawyer</label>
                <select
                  className="form-input form-select"
                  value={newCase.lawyer_id}
                  onChange={(e) => setNewCase({ ...newCase, lawyer_id: e.target.value })}
                  required
                >
                  <option value="">Choose a lawyer...</option>
                  {lawyers.map((lawyer) => (
                    <option key={lawyer.id} value={lawyer.id}>
                      {lawyer.full_name} - {lawyer.specialization || 'General Practice'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <input
                  type="text"
                  className="form-input"
                  value={newCase.category}
                  onChange={(e) => setNewCase({ ...newCase, category: e.target.value })}
                  placeholder="e.g., Family Law, Contract Dispute"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-input form-select"
                  value={newCase.priority}
                  onChange={(e) => setNewCase({ ...newCase, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary">Create Case</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientCases;
