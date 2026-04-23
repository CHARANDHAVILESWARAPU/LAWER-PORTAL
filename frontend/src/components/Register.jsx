import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirm_password: '',
    full_name: '',
    role: 'client',
    phone: '',
    specialization: '',
    bar_number: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await register(formData);
      navigate('/login', {
        state: { message: 'Registration successful! Please login.' }
      });
    } catch (err) {
      const errorMsg = err.response?.data;
      if (typeof errorMsg === 'object') {
        const firstError = Object.values(errorMsg)[0];
        setError(Array.isArray(firstError) ? firstError[0] : firstError);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join the Legal Portal</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="full_name"
              className="form-input"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">I am a</label>
            <select
              name="role"
              className="form-input form-select"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="client">Client</option>
              <option value="lawyer">Lawyer</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Phone (optional)</label>
            <input
              type="tel"
              name="phone"
              className="form-input"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter your phone number"
            />
          </div>

          {formData.role === 'lawyer' && (
            <>
              <div className="form-group">
                <label className="form-label">Specialization</label>
                <input
                  type="text"
                  name="specialization"
                  className="form-input"
                  value={formData.specialization}
                  onChange={handleChange}
                  placeholder="e.g., Family Law, Corporate Law"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Bar Number</label>
                <input
                  type="text"
                  name="bar_number"
                  className="form-input"
                  value={formData.bar_number}
                  onChange={handleChange}
                  placeholder="Enter your bar number"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password"
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              name="confirm_password"
              className="form-input"
              value={formData.confirm_password}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px' }}>
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
