import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { consultationsAPI, authAPI, casesAPI } from '../../api/axios';
import '../../styles/VideoConsultation.css';

function ClientConsultations() {
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState([]);
  const [history, setHistory] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [cases, setCases] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');

  // Booking form state
  const [selectedLawyer, setSelectedLawyer] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedCase, setSelectedCase] = useState('');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [consultRes, historyRes, lawyersRes, casesRes] = await Promise.all([
        consultationsAPI.list(),
        consultationsAPI.getHistory(),
        authAPI.getLawyers(),
        casesAPI.list(),
      ]);
      setConsultations(consultRes.data);
      setHistory(historyRes.data);
      setLawyers(lawyersRes.data);
      setCases(casesRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLawyerSelect = async (lawyerId) => {
    setSelectedLawyer(lawyerId);
    setSelectedSlot(null);
    if (lawyerId) {
      try {
        const res = await consultationsAPI.getSlots(lawyerId);
        setAvailableSlots(res.data);
      } catch (err) {
        setAvailableSlots([]);
      }
    } else {
      setAvailableSlots([]);
    }
  };

  const handleBook = async () => {
    if (!selectedSlot) return;
    setBookingError('');
    try {
      await consultationsAPI.book({
        slot_id: selectedSlot,
        case_id: selectedCase || null,
        subject,
        notes,
      });
      setShowBooking(false);
      resetBookingForm();
      loadData();
    } catch (err) {
      setBookingError(err.response?.data?.error || 'Booking failed');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this consultation?')) return;
    try {
      await consultationsAPI.updateStatus(id, 'cancelled');
      loadData();
    } catch (err) {
      console.error('Cancel failed:', err);
    }
  };

  const handleJoin = (consultation) => {
    navigate(`/consultation/room/${consultation.meeting_id}`, {
      state: { token: consultation.meeting_token }
    });
  };

  const resetBookingForm = () => {
    setSelectedLawyer('');
    setSelectedSlot(null);
    setSelectedCase('');
    setSubject('');
    setNotes('');
    setAvailableSlots([]);
    setBookingError('');
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

  const upcoming = consultations.filter(c => !['completed', 'cancelled', 'rejected'].includes(c.status));
  const past = consultations.filter(c => ['completed', 'cancelled', 'rejected'].includes(c.status));

  return (
    <div>
      <div className="vc-page-header">
        <h1>Video Consultations</h1>
        <button className="btn btn-primary" onClick={() => setShowBooking(true)}>
          Book Consultation
        </button>
      </div>

      {/* Booking Modal */}
      {showBooking && (
        <div className="vc-modal-overlay" onClick={() => setShowBooking(false)}>
          <div className="vc-modal" onClick={e => e.stopPropagation()}>
            <div className="vc-modal-header">
              <h2>Book Video Consultation</h2>
              <button className="vc-modal-close" onClick={() => { setShowBooking(false); resetBookingForm(); }}>
                &times;
              </button>
            </div>

            {bookingError && <div className="alert alert-error">{bookingError}</div>}

            <div className="form-group">
              <label className="form-label">Select Lawyer</label>
              <select
                className="form-input form-select"
                value={selectedLawyer}
                onChange={(e) => handleLawyerSelect(e.target.value)}
              >
                <option value="">-- Choose a lawyer --</option>
                {lawyers.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.full_name} - {l.specialization || 'General'}
                  </option>
                ))}
              </select>
            </div>

            {availableSlots.length > 0 && (
              <div className="form-group">
                <label className="form-label">Available Time Slots</label>
                <div className="vc-slots-grid">
                  {availableSlots.map(slot => (
                    <div
                      key={slot.id}
                      className={`vc-slot-card ${selectedSlot === slot.id ? 'selected' : ''}`}
                      onClick={() => setSelectedSlot(slot.id)}
                    >
                      <div className="vc-slot-date">{slot.date}</div>
                      <div className="vc-slot-time">{slot.start_time} - {slot.end_time}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedLawyer && availableSlots.length === 0 && (
              <div className="empty-state" style={{ padding: '20px' }}>
                <p>No available slots for this lawyer</p>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Link to Case (optional)</label>
              <select className="form-input form-select" value={selectedCase} onChange={e => setSelectedCase(e.target.value)}>
                <option value="">-- No case --</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>{c.case_number} - {c.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                className="form-input"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="What would you like to discuss?"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-input form-textarea"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Additional details..."
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setShowBooking(false); resetBookingForm(); }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleBook} disabled={!selectedSlot}>
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="vc-tabs">
        <button
          className={`vc-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming ({upcoming.length})
        </button>
        <button
          className={`vc-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History ({history.length})
        </button>
      </div>

      {/* Upcoming Consultations */}
      {activeTab === 'upcoming' && (
        <div className="card">
          {upcoming.length === 0 ? (
            <div className="empty-state">
              <p>No upcoming consultations</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowBooking(true)}>
                Book one now
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th><th>Lawyer</th><th>Date</th><th>Time</th>
                    <th>Subject</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map(c => (
                    <tr key={c.id}>
                      <td>{c.consultation_number}</td>
                      <td>{c.lawyer_name}</td>
                      <td>{c.slot_date || '-'}</td>
                      <td>{c.slot_start ? `${c.slot_start} - ${c.slot_end}` : '-'}</td>
                      <td>{c.subject || '-'}</td>
                      <td>{getStatusBadge(c.status)}</td>
                      <td className="vc-actions">
                        {['approved', 'in_progress'].includes(c.status) && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleJoin(c)}>
                            Join Now
                          </button>
                        )}
                        {['pending', 'approved'].includes(c.status) && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleCancel(c.id)}>
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Consultation History */}
      {activeTab === 'history' && (
        <div className="card">
          {history.length === 0 ? (
            <div className="empty-state"><p>No past consultations</p></div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th><th>Lawyer</th><th>Date</th>
                    <th>Duration</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(c => (
                    <tr key={c.id}>
                      <td>{c.consultation_number}</td>
                      <td>{c.lawyer_name}</td>
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

export default ClientConsultations;
