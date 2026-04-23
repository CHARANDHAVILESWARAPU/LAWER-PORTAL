import React, { useState, useEffect } from 'react';
import { appointmentsAPI } from '../../api/axios.js';

function LawyerAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const res = await appointmentsAPI.list();
      setAppointments(res.data);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await appointmentsAPI.updateStatus(id, status);
      loadAppointments();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  // Group appointments by date
  const groupedAppointments = appointments.reduce((acc, apt) => {
    const date = new Date(apt.datetime).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(apt);
    return acc;
  }, {});

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>My Schedule</h1>

      {appointments.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <p>No appointments scheduled</p>
          </div>
        </div>
      ) : (
        Object.entries(groupedAppointments).map(([date, apts]) => (
          <div key={date} className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '15px', color: '#1a365d' }}>{date}</h3>

            {apts.map((apt) => (
              <div
                key={apt.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {new Date(apt.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {' - '}
                    {apt.client_name}
                  </div>
                  <div style={{ color: '#718096', fontSize: '0.875rem' }}>
                    {apt.case_number} • {apt.appointment_type.replace('_', ' ')} • {apt.duration} min
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className={`badge badge-${apt.status}`}>{apt.status}</span>

                  {apt.status === 'scheduled' && (
                    <>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleStatusChange(apt.id, 'confirmed')}
                      >
                        Confirm
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleStatusChange(apt.id, 'cancelled')}
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {apt.status === 'confirmed' && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleStatusChange(apt.id, 'completed')}
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

export default LawyerAppointments;
