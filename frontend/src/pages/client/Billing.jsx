import React, { useState, useEffect } from 'react';
import { billingAPI } from '../../api/axios.js';

function ClientBilling() {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invoicesRes, summaryRes] = await Promise.all([
        billingAPI.getInvoices(),
        billingAPI.getSummary(),
      ]);
      setInvoices(invoicesRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewInvoice = async (invoiceId) => {
    try {
      const res = await billingAPI.getInvoice(invoiceId);
      setSelectedInvoice(res.data);
    } catch (error) {
      console.error('Failed to load invoice:', error);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>Billing & Invoices</h1>

      {/* Summary Cards */}
      <div className="dashboard-grid" style={{ marginBottom: '30px' }}>
        <div className="stat-card">
          <div className="stat-value">${summary.total_billed?.toFixed(2) || '0.00'}</div>
          <div className="stat-label">Total Billed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${summary.total_paid?.toFixed(2) || '0.00'}</div>
          <div className="stat-label">Total Paid</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: summary.outstanding > 0 ? '#e53e3e' : '#38a169' }}>
            ${summary.outstanding?.toFixed(2) || '0.00'}
          </div>
          <div className="stat-label">Outstanding Balance</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.pending_invoices || 0}</div>
          <div className="stat-label">Pending Invoices</div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Your Invoices</h2>
        </div>

        {invoices.length === 0 ? (
          <div className="empty-state">
            <p>No invoices yet. Your lawyer will generate invoices for billable work.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Case</th>
                  <th>Amount Due</th>
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
                    <td style={{
                      fontWeight: 600,
                      color: inv.status === 'paid' ? '#38a169' : inv.status === 'overdue' ? '#e53e3e' : '#1a365d'
                    }}>
                      ${parseFloat(inv.total_amount || 0).toFixed(2)}
                    </td>
                    <td>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '-'}</td>
                    <td>
                      <span className={`badge badge-${inv.status}`}>
                        {inv.status === 'sent' ? 'Unpaid' : inv.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => viewInvoice(inv.id)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="card-header">
              <h2 className="card-title">Invoice {selectedInvoice.invoice_number}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedInvoice(null)}>
                &times;
              </button>
            </div>

            {/* Invoice Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ color: '#718096', fontSize: '0.85rem' }}>Case</div>
                <div style={{ fontWeight: 600 }}>{selectedInvoice.case_number}</div>
              </div>
              <div>
                <div style={{ color: '#718096', fontSize: '0.85rem' }}>Status</div>
                <span className={`badge badge-${selectedInvoice.status}`}>
                  {selectedInvoice.status === 'sent' ? 'Unpaid' : selectedInvoice.status}
                </span>
              </div>
              <div>
                <div style={{ color: '#718096', fontSize: '0.85rem' }}>Due Date</div>
                <div style={{ fontWeight: 600 }}>
                  {selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : '-'}
                </div>
              </div>
              <div>
                <div style={{ color: '#718096', fontSize: '0.85rem' }}>Created</div>
                <div style={{ fontWeight: 600 }}>
                  {new Date(selectedInvoice.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Time Entries Breakdown */}
            {selectedInvoice.entries && selectedInvoice.entries.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '10px', color: '#1a365d' }}>Work Breakdown</h4>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Hours</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.entries.map((entry) => (
                        <tr key={entry.id}>
                          <td>{new Date(entry.date).toLocaleDateString()}</td>
                          <td>{entry.description}</td>
                          <td>{parseFloat(entry.hours)}h</td>
                          <td>${parseFloat(entry.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Totals */}
            <div style={{
              background: '#f7fafc', borderRadius: '8px', padding: '16px',
              display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#718096' }}>Subtotal</span>
                <span>${parseFloat(selectedInvoice.subtotal || 0).toFixed(2)}</span>
              </div>
              {parseFloat(selectedInvoice.tax_amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#718096' }}>Tax ({parseFloat(selectedInvoice.tax_rate)}%)</span>
                  <span>${parseFloat(selectedInvoice.tax_amount || 0).toFixed(2)}</span>
                </div>
              )}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                borderTop: '2px solid #e2e8f0', paddingTop: '8px',
                fontWeight: 700, fontSize: '1.1rem', color: '#1a365d'
              }}>
                <span>Total Amount Due</span>
                <span>${parseFloat(selectedInvoice.total_amount || 0).toFixed(2)}</span>
              </div>
            </div>

            {selectedInvoice.notes && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ marginBottom: '6px', color: '#1a365d' }}>Notes</h4>
                <p style={{ color: '#4a5568', fontSize: '0.9rem' }}>{selectedInvoice.notes}</p>
              </div>
            )}

            {selectedInvoice.paid_date && (
              <div style={{
                marginTop: '16px', padding: '12px', background: '#f0fff4',
                borderRadius: '8px', color: '#38a169', textAlign: 'center', fontWeight: 600
              }}>
                Paid on {new Date(selectedInvoice.paid_date).toLocaleDateString()}
              </div>
            )}

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientBilling;
