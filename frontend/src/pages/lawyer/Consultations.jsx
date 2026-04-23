import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { consultationsAPI } from '../../api/axios';
import '../../styles/VideoConsultation.css';

function LawyerConsultations() {
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState([]);
  const [history, setHistory] = useState([]);
  const [mySlots, setMySlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests');
  const [showSlotForm, setShowSlotForm] = useState(false);

  // New slot form
  const [slotDate, setSlotDate] = useState('');
  const [slotStart, setSlotStart] = useState('');
  const [slotEnd, setSlotEnd] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [consultRes, historyRes, slotsRes] = await Promise.all([
        consultationsAPI.list(),
        consultationsAPI.getHistory(),
        consultationsAPI.getSlots(),
      ]);
      setConsultations(consultRes.data);
      setHistory(historyRes.data);
      setMySlots(slotsRes.data);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlot = async () => {
    if (!slotDate || !slotStart || !slotEnd) return;
    try {
      await consultationsAPI.createSlot({
        date: slotDate,
        start_time: slotStart,
        end_time: slotEnd,
      });
      setSlotDate('');
      setSlotStart('');
      setSlotEnd('');
      setShowSlotForm(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || JSON.stringify(err.response?.data) || 'Failed to create slot');
    }
  };

  const handleDeleteSlot = async (id) => {
    try {
      await consultationsAPI.deleteSlot(id);
      loadData();
    } catch (err) {
      console.error('Delete slot failed:', err);
    }
  };

  const handleApprove = async (id) => {
    try {
      await consultationsAPI.updateStatus(id, 'approved');
      loadData();
    } catch (err) {
      console.error('Approve failed:', err);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this consultation request?')) return;
    try {
      await consultationsAPI.updateStatus(id, 'rejected');
      loadData();
    } catch (err) {
      console.error('Reject failed:', err);
    }
  };

  const handleJoin = (consultation) => {
    navigate(`/consultation/room/${consultation.meeting_id}`, {
      state: { token: consultation.meeting_token }
    });
  };

  const getStatusBadge = (s) => {
    const map = {
      pending: 'badge-pending', approved: 'badge-open',
      rejected: 'badge-overdue', in_progress: 'badge-in_progress',
      completed: 'badge-closed', cancelled: 'badge-overdue',
      no_show: 'badge-closed',
    };
    return <span className={`badge ${map[s] || ''}`}>{s.replace('_', ' ')}</span>;
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  const pending = consultations.filter(c => c.status === 'pending');
  const approved = consultations.filter(c => ['approved', 'in_progress'].includes(c.status));

  return (
    <div>
      <div className="vc-page-header">
        <h1>Video Consultations</h1>
        <button className="btn btn-primary" onClick={() => setShowSlotForm(!showSlotForm)}>
          {showSlotForm ? 'Close' : 'Add Availability'}
        </button>
      </div>

      {/* Add Slot Form */}
      {showSlotForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '16px', color: '#1a365d' }}>Add Available Slot</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={slotDate} onChange={e => setSlotDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Start Time</label>
              <input type="time" className="form-input" value={slotStart} onChange={e => setSlotStart(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">End Time</label>
              <input type="time" className="form-input" value={slotEnd} onChange={e => setSlotEnd(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={handleCreateSlot} disabled={!slotDate || !slotStart || !slotEnd}>
              Add Slot
            </button>
          </div>

          {/* Show existing slots */}
          {mySlots.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ marginBottom: '8px', color: '#4a5568' }}>Your Slots</h4>
              <div className="vc-slots-grid">
                {mySlots.map(slot => (
                  <div key={slot.id} className={`vc-slot-card ${slot.is_booked ? 'booked' : ''}`}>
                    <div className="vc-slot-date">{slot.date}</div>
                    <div className="vc-slot-time">{slot.start_time} - {slot.end_time}</div>
                    <div style={{ marginTop: '6px' }}>
                      {slot.is_booked ? (
                        <span className="badge badge-in_progress">Booked</span>
                      ) : (
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={() => handleDeleteSlot(slot.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="vc-tabs">
        <button className={`vc-tab ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
          Pending Requests ({pending.length})
        </button>
        <button className={`vc-tab ${activeTab === 'approved' ? 'active' : ''}`} onClick={() => setActiveTab('approved')}>
          Approved ({approved.length})
        </button>
        <button className={`vc-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          History ({history.length})
        </button>
      </div>

      {/* Pending Requests */}
      {activeTab === 'requests' && (
        <div className="card">
          {pending.length === 0 ? (
            <div className="empty-state"><p>No pending requests</p></div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th><th>Client</th><th>Date</th><th>Time</th>
                    <th>Subject</th><th>Case</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map(c => (
                    <tr key={c.id}>
                      <td>{c.consultation_number}</td>
                      <td>{c.client_name}</td>
                      <td>{c.slot_date || '-'}</td>
                      <td>{c.slot_start ? `${c.slot_start} - ${c.slot_end}` : '-'}</td>
                      <td>{c.subject || '-'}</td>
                      <td>{c.case_number || '-'}</td>
                      <td className="vc-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => handleApprove(c.id)}>
                          Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleReject(c.id)}>
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Approved / Active */}
      {activeTab === 'approved' && (
        <div className="card">
          {approved.length === 0 ? (
            <div className="empty-state"><p>No approved consultations</p></div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th><th>Client</th><th>Date</th><th>Time</th>
                    <th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approved.map(c => (
                    <tr key={c.id}>
                      <td>{c.consultation_number}</td>
                      <td>{c.client_name}</td>
                      <td>{c.slot_date || '-'}</td>
                      <td>{c.slot_start ? `${c.slot_start} - ${c.slot_end}` : '-'}</td>
                      <td>{getStatusBadge(c.status)}</td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => handleJoin(c)}>
                          Join Now
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div className="card">
          {history.length === 0 ? (
            <div className="empty-state"><p>No past consultations</p></div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th><th>Client</th><th>Date</th>
                    <th>Duration</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(c => (
                    <tr key={c.id}>
                      <td>{c.consultation_number}</td>
                      <td>{c.client_name}</td>
                      <td>{c.slot_date || new Date(c.created_at).toLocaleDateString()}</td>
                      <td>{c.total_duration_display}</td>
                      <td>{getStatusBadge(c.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LawyerConsultations;
