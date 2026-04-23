import React, { useState, useEffect } from 'react';
import { appointmentsAPI, casesAPI } from '../../api/axios.js';

function ClientAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    case_id: '',
    datetime: '',
    duration: 60,
    appointment_type: 'consultation',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [aptRes, casesRes] = await Promise.all([
        appointmentsAPI.list(),
        casesAPI.list(),
      ]);
      setAppointments(aptRes.data);
      setCases(casesRes.data.filter(c => c.status !== 'closed'));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await appointmentsAPI.create({
        ...newAppointment,
        case_id: parseInt(newAppointment.case_id),
      });
      setShowModal(false);
      setNewAppointment({
        case_id: '',
        datetime: '',
        duration: 60,
        appointment_type: 'consultation',
        notes: '',
      });
      loadData();
    } catch (error) {
      console.error('Failed to create appointment:', error);
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await appointmentsAPI.updateStatus(id, 'cancelled');
        loadData();
      } catch (error) {
        console.error('Failed to cancel appointment:', error);
      }
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Appointments</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Schedule Appointment
        </button>
      </div>

      <div className="card">
        {appointments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <p>No appointments scheduled</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Date & Time</th>
                  <th>Duration</th>
                  <th>Type</th>
                  <th>Lawyer</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => (
                  <tr key={apt.id}>
                    <td>{apt.case_number}</td>
                    <td>{new Date(apt.datetime).toLocaleString()}</td>
                    <td>{apt.duration} min</td>
                    <td>{apt.appointment_type.replace('_', ' ')}</td>
                    <td>{apt.lawyer_name}</td>
                    <td><span className={`badge badge-${apt.status}`}>{apt.status}</span></td>
                    <td>
                      {apt.status === 'scheduled' && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleCancel(apt.id)}
                        >
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

      {/* Create Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '450px' }}>
            <div className="card-header">
              <h2 className="card-title">Schedule Appointment</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Case</label>
                <select
                  className="form-input form-select"
                  value={newAppointment.case_id}
                  onChange={(e) => setNewAppointment({ ...newAppointment, case_id: e.target.value })}
                  required
                >
                  <option value="">Select a case...</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.case_number} - {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date & Time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={newAppointment.datetime}
                  onChange={(e) => setNewAppointment({ ...newAppointment, datetime: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Duration (minutes)</label>
                <select
                  className="form-input form-select"
                  value={newAppointment.duration}
                  onChange={(e) => setNewAppointment({ ...newAppointment, duration: parseInt(e.target.value) })}
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  className="form-input form-select"
                  value={newAppointment.appointment_type}
                  onChange={(e) => setNewAppointment({ ...newAppointment, appointment_type: e.target.value })}
                >
                  <option value="consultation">Initial Consultation</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="document_review">Document Review</option>
                  <option value="court_prep">Court Preparation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea
                  className="form-input form-textarea"
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                  placeholder="Any specific topics to discuss..."
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary">Schedule</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientAppointments;
