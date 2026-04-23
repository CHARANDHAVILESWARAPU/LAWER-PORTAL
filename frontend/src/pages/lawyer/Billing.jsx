import React, { useState, useEffect } from 'react';
import { billingAPI, casesAPI } from '../../api/axios.js';

function LawyerBilling() {
  const [timeEntries, setTimeEntries] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [cases, setCases] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [activeTab, setActiveTab] = useState('time');

  const [newEntry, setNewEntry] = useState({
    case_id: '',
    date: new Date().toISOString().split('T')[0],
    hours: '',
    description: '',
  });

  const [newInvoice, setNewInvoice] = useState({
    case_id: '',
    tax_rate: 0,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [entriesRes, invoicesRes, casesRes, summaryRes] = await Promise.all([
        billingAPI.getTimeEntries(),
        billingAPI.getInvoices(),
        casesAPI.list(),
        billingAPI.getSummary(),
      ]);
      setTimeEntries(entriesRes.data);
      setInvoices(invoicesRes.data);
      setCases(casesRes.data.filter(c => c.status !== 'closed'));
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEntry = async (e) => {
    e.preventDefault();
    try {
      await billingAPI.createTimeEntry({
        case_id: parseInt(newEntry.case_id),
        date: newEntry.date,
        hours: parseFloat(newEntry.hours),
        description: newEntry.description,
      });
      setShowTimeModal(false);
      setNewEntry({
        case_id: '',
        date: new Date().toISOString().split('T')[0],
        hours: '',
        description: '',
      });
      loadData();
    } catch (error) {
      console.error('Failed to create entry:', error);
    }
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    try {
      await billingAPI.generateInvoice({
        case_id: parseInt(newInvoice.case_id),
        tax_rate: parseFloat(newInvoice.tax_rate) || 0,
        notes: newInvoice.notes,
      });
      setShowInvoiceModal(false);
      setNewInvoice({ case_id: '', tax_rate: 0, notes: '' });
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to generate invoice');
    }
  };

  const handleMarkPaid = async (invoiceId) => {
    try {
      await billingAPI.updateInvoice(invoiceId, { status: 'paid' });
      loadData();
    } catch (error) {
      console.error('Failed to update invoice:', error);
    }
  };

  const handleMarkUnpaid = async (invoiceId) => {
    try {
      await billingAPI.updateInvoice(invoiceId, { status: 'sent' });
      loadData();
    } catch (error) {
      console.error('Failed to update invoice:', error);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>Billing & Time Tracking</h1>

      {/* Summary Cards */}
      <div className="dashboard-grid" style={{ marginBottom: '30px' }}>
        <div className="stat-card">
          <div className="stat-value">{summary.total_hours?.toFixed(1) || 0}</div>
          <div className="stat-label">Total Hours</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.unbilled_hours?.toFixed(1) || 0}</div>
          <div className="stat-label">Unbilled Hours</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${summary.total_billed?.toFixed(2) || 0}</div>
          <div className="stat-label">Total Billed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${summary.outstanding?.toFixed(2) || 0}</div>
          <div className="stat-label">Outstanding</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          className={`btn ${activeTab === 'time' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('time')}
        >
          Time Entries
        </button>
        <button
          className={`btn ${activeTab === 'invoices' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('invoices')}
        >
          Invoices
        </button>
        <div style={{ flex: 1 }} />
        {activeTab === 'time' && (
          <button className="btn btn-primary" onClick={() => setShowTimeModal(true)}>
            + Log Time
          </button>
        )}
        {activeTab === 'invoices' && (
          <button className="btn btn-primary" onClick={() => setShowInvoiceModal(true)}>
            + Generate Invoice
          </button>
        )}
      </div>

      {/* Time Entries Tab */}
      {activeTab === 'time' && (
        <div className="card">
          {timeEntries.length === 0 ? (
            <div className="empty-state">
              <p>No time entries yet</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Case</th>
                    <th>Description</th>
                    <th>Hours</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {timeEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{new Date(entry.date).toLocaleDateString()}</td>
                      <td>{entry.case_number}</td>
                      <td>{entry.description}</td>
                      <td>{parseFloat(entry.hours)}h</td>
                      <td>${parseFloat(entry.amount || 0).toFixed(2)}</td>
                      <td>
                        <span className={`badge ${entry.invoiced ? 'badge-paid' : 'badge-open'}`}>
                          {entry.invoiced ? 'Invoiced' : 'Unbilled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="card">
          {invoices.length === 0 ? (
            <div className="empty-state">
              <p>No invoices yet</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Case</th>
                    <th>Client</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td><strong>{inv.invoice_number}</strong></td>
                      <td>{inv.case_number}</td>
                      <td>{inv.client_name}</td>
                      <td>${parseFloat(inv.total_amount || 0).toFixed(2)}</td>
                      <td>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '-'}</td>
                      <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ backgroundColor: '#38a169', borderColor: '#38a169' }}
                              onClick={() => handleMarkPaid(inv.id)}
                            >
                              Mark as Paid
                            </button>
                          )}
                          {inv.status === 'paid' && (
                            <span className="badge badge-paid">Paid</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Log Time Modal */}
      {showTimeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '450px' }}>
            <div className="card-header">
              <h2 className="card-title">Log Time</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowTimeModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateEntry}>
              <div className="form-group">
                <label className="form-label">Case</label>
                <select
                  className="form-input form-select"
                  value={newEntry.case_id}
                  onChange={(e) => setNewEntry({ ...newEntry, case_id: e.target.value })}
                  required
                >
                  <option value="">Select a case...</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.case_number} - {c.client_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hours</label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  className="form-input"
                  value={newEntry.hours}
                  onChange={(e) => setNewEntry({ ...newEntry, hours: e.target.value })}
                  placeholder="e.g., 1.5"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input form-textarea"
                  value={newEntry.description}
                  onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                  placeholder="What did you work on?"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary">Log Time</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTimeModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Invoice Modal */}
      {showInvoiceModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '450px' }}>
            <div className="card-header">
              <h2 className="card-title">Generate Invoice</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowInvoiceModal(false)}>×</button>
            </div>

            <form onSubmit={handleGenerateInvoice}>
              <div className="form-group">
                <label className="form-label">Case (with unbilled hours)</label>
                <select
                  className="form-input form-select"
                  value={newInvoice.case_id}
                  onChange={(e) => setNewInvoice({ ...newInvoice, case_id: e.target.value })}
                  required
                >
                  <option value="">Select a case...</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.case_number} - {c.client_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={newInvoice.tax_rate}
                  onChange={(e) => setNewInvoice({ ...newInvoice, tax_rate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea
                  className="form-input form-textarea"
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                  placeholder="Additional notes for the invoice..."
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary">Generate Invoice</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LawyerBilling;
