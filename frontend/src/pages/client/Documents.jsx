import React, { useState, useEffect } from 'react';
import { casesAPI, documentsAPI } from '../../api/axios.js';

function ClientDocuments() {
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadData, setUploadData] = useState({
    file: null,
    category: 'other',
    description: '',
  });

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    if (selectedCase) {
      loadDocuments(selectedCase.id);
    }
  }, [selectedCase]);

  const loadCases = async () => {
    try {
      const res = await casesAPI.list();
      setCases(res.data);
      if (res.data.length > 0) {
        setSelectedCase(res.data[0]);
      }
    } catch (error) {
      console.error('Failed to load cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (caseId) => {
    try {
      const res = await documentsAPI.listByCase(caseId);
      setDocuments(res.data);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadData.file || !selectedCase) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('case_id', selectedCase.id);
      formData.append('file', uploadData.file);
      formData.append('category', uploadData.category);
      formData.append('description', uploadData.description);

      await documentsAPI.upload(formData);
      setUploadData({ file: null, category: 'other', description: '' });
      loadDocuments(selectedCase.id);
    } catch (error) {
      console.error('Failed to upload document:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const response = await documentsAPI.download(doc.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.original_filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>Documents</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
        {/* Case Selector */}
        <div className="card">
          <h3 style={{ marginBottom: '15px' }}>Select Case</h3>
          {cases.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedCase(c)}
              style={{
                padding: '15px',
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '10px',
                background: selectedCase?.id === c.id ? '#e2e8f0' : 'transparent',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontWeight: 600 }}>{c.case_number}</div>
              <div style={{ fontSize: '0.875rem', color: '#718096' }}>{c.title}</div>
            </div>
          ))}
        </div>

        {/* Documents Area */}
        <div>
          {/* Upload Form */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '15px' }}>Upload Document</h3>
            <form onSubmit={handleUpload}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">File</label>
                  <input
                    type="file"
                    className="form-input"
                    onChange={(e) => setUploadData({ ...uploadData, file: e.target.files[0] })}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Category</label>
                  <select
                    className="form-input form-select"
                    value={uploadData.category}
                    onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
                  >
                    <option value="contract">Contract</option>
                    <option value="evidence">Evidence</option>
                    <option value="correspondence">Correspondence</option>
                    <option value="identification">Identification</option>
                    <option value="financial">Financial</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  placeholder="Brief description of the document"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={uploading || !uploadData.file}>
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </form>
          </div>

          {/* Documents List */}
          <div className="card">
            <h3 style={{ marginBottom: '15px' }}>
              Documents for {selectedCase?.case_number}
            </h3>

            {documents.length === 0 ? (
              <div className="empty-state">
                <p>No documents uploaded yet</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th>Category</th>
                      <th>Uploaded By</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id}>
                        <td>{doc.original_filename}</td>
                        <td><span className="badge">{doc.category}</span></td>
                        <td>{doc.uploaded_by_name}</td>
                        <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDownload(doc)}
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
      </div>
    </div>
  );
}

export default ClientDocuments;
