import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';

// Components
import Login from './components/Login.jsx';
import Register from './components/Register.jsx';
import Layout from './components/Layout.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';

// Client Pages
import ClientDashboard from './pages/client/Dashboard.jsx';
import ClientCases from './pages/client/Cases.jsx';
import ClientMessages from './pages/client/Messages.jsx';
import ClientDocuments from './pages/client/Documents.jsx';
import ClientAppointments from './pages/client/Appointments.jsx';
import ClientConsultations from './pages/client/Consultations.jsx';
import ClientBilling from './pages/client/Billing.jsx';

// Lawyer Pages
import LawyerDashboard from './pages/lawyer/Dashboard.jsx';
import LawyerCases from './pages/lawyer/Cases.jsx';
import LawyerMessages from './pages/lawyer/Messages.jsx';
import LawyerBilling from './pages/lawyer/Billing.jsx';
import LawyerAppointments from './pages/lawyer/Appointments.jsx';
import LawyerConsultations from './pages/lawyer/Consultations.jsx';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminUsers from './pages/admin/Users.jsx';
import AdminCases from './pages/admin/Cases.jsx';
import AdminBilling from './pages/admin/Billing.jsx';

// Shared Pages
import VideoRoom from './pages/shared/VideoRoom.jsx';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Client Routes */}
          <Route
            path="/client"
            element={
              <PrivateRoute roles={['client']}>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route path="dashboard" element={<ClientDashboard />} />
            <Route path="cases" element={<ClientCases />} />
            <Route path="cases/:id" element={<ClientCases />} />
            <Route path="messages" element={<ClientMessages />} />
            <Route path="documents" element={<ClientDocuments />} />
            <Route path="appointments" element={<ClientAppointments />} />
            <Route path="consultations" element={<ClientConsultations />} />
            <Route path="billing" element={<ClientBilling />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Lawyer Routes */}
          <Route
            path="/lawyer"
            element={
              <PrivateRoute roles={['lawyer']}>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route path="dashboard" element={<LawyerDashboard />} />
            <Route path="cases" element={<LawyerCases />} />
            <Route path="cases/:id" element={<LawyerCases />} />
            <Route path="messages" element={<LawyerMessages />} />
            <Route path="billing" element={<LawyerBilling />} />
            <Route path="appointments" element={<LawyerAppointments />} />
            <Route path="consultations" element={<LawyerConsultations />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Video Room - accessible by both client and lawyer */}
          <Route
            path="/consultation/room/:meetingId"
            element={
              <PrivateRoute roles={['client', 'lawyer']}>
                <VideoRoom />
              </PrivateRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <PrivateRoute roles={['admin']}>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="cases" element={<AdminCases />} />
            <Route path="billing" element={<AdminBilling />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
