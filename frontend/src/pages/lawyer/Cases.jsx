import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { casesAPI, documentsAPI } from '../../api/axios.js';

function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteContent, setNoteContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);

  useEffect(() => {
    loadCase();
    loadDocuments();
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

  const loadDocuments = async () => {
    setDocsLoading(true);
    try {
      const res = await documentsAPI.listByCase(id);
      setDocuments(res.data);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setDocsLoading(false);
    }
  };

  const handleDownload = async (docId, filename) => {
    try {
      const res = await documentsAPI.download(docId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    try {
      await casesAPI.addNote(id, noteContent, isInternal);
      setNoteContent('');
      setIsInternal(false);
      loadCase();
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await casesAPI.updateStatus(id, newStatus);
      loadCase();
    } catch (error) {
      console.error('Failed to update status:', error);
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
            <Link to="/lawyer/cases" className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}>
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
        <Link to="/lawyer/cases" style={{ color: '#3182ce', textDecoration: 'none', fontSize: '0.9rem' }}>
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
          <select
            className="form-input form-select"
            style={{ padding: '8px 12px', width: 'auto' }}
            value={caseData.status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Case Info Grid */}
      <div className="dashboard-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-label">Client</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1a365d', marginTop: '4px' }}>
            {caseData.client?.full_name}
          </div>
          {caseData.client?.email && (
            <div style={{ color: '#718096', fontSize: '0.85rem', marginTop: '2px' }}>{caseData.client.email}</div>
          )}
          {caseData.client?.phone && (
            <div style={{ color: '#718096', fontSize: '0.85rem', marginTop: '2px' }}>{caseData.client.phone}</div>
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
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={!noteContent.trim()}>
              Add Note
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.875rem', color: '#4a5568' }}>
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
              />
              Internal note (hidden from client)
            </label>
          </div>
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
                  border: `1px solid ${note.is_internal ? '#feebc8' : '#e2e8f0'}`,
                  background: note.is_internal ? '#fffff0' : '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '0.875rem', color: '#1a365d' }}>
                    {note.author_name}
                    {note.is_internal && (
                      <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#c05621', background: '#feebc8', padding: '2px 8px', borderRadius: '10px' }}>
                        Internal
                      </span>
                    )}
                  </strong>
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

      {/* Documents Section */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h2 className="card-title">Documents ({documents.length})</h2>
        </div>

        {docsLoading ? (
          <div className="loading" style={{ padding: '30px' }}><div className="spinner"></div></div>
        ) : documents.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px' }}>
            <p>No documents uploaded for this case</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Category</th>
                  <th>Uploaded By</th>
                  <th>Size</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3182ce" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span style={{ fontWeight: 500 }}>{doc.original_filename}</span>
                        {doc.is_confidential && (
                          <span style={{ fontSize: '0.7rem', color: '#c05621', background: '#feebc8', padding: '2px 6px', borderRadius: '8px' }}>
                            Confidential
                          </span>
                        )}
                      </div>
                      {doc.description && (
                        <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '2px' }}>{doc.description}</div>
                      )}
                    </td>
                    <td>
                      <span className="badge">{doc.category || 'other'}</span>
                    </td>
                    <td>{doc.uploaded_by_name || 'Unknown'}</td>
                    <td>{doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '-'}</td>
                    <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDownload(doc.id, doc.original_filename)}
                      >
                        Download
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

function LawyerCases() {
  const { id } = useParams();

  if (id) {
    return <CaseDetail />;
  }

  return <CaseList />;
}

function CaseList() {
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

  const handleStatusChange = async (caseId, newStatus) => {
    try {
      await casesAPI.updateStatus(caseId, newStatus);
      loadCases();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>My Cases</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            className="form-input form-select"
            style={{ width: 'auto' }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All Cases</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="card">
        {cases.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"></div>
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
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.case_number}</strong></td>
                    <td>{c.title}</td>
                    <td>{c.client_name}</td>
                    <td>{c.category || '-'}</td>
                    <td><span className={`badge badge-${c.priority}`}>{c.priority}</span></td>
                    <td>
                      <select
                        className="form-input form-select"
                        style={{ padding: '6px 10px', width: 'auto' }}
                        value={c.status}
                        onChange={(e) => handleStatusChange(c.id, e.target.value)}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="pending">Pending</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                    <td>
                      <Link to={`/lawyer/cases/${c.id}`} className="btn btn-secondary btn-sm">
                        View
                      </Link>
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

export default LawyerCases;
