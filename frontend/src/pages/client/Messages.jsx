import React, { useState, useEffect, useRef } from 'react';
import { casesAPI, messagesAPI } from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';

function ClientMessages() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    if (selectedCase) {
      loadMessages(selectedCase.id);
    }
  }, [selectedCase]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const loadMessages = async (caseId) => {
    try {
      const res = await messagesAPI.getConversation(caseId);
      setMessages(res.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedCase) return;

    setSending(true);
    try {
      // Get the lawyer's ID from the selected case
      const caseDetails = await casesAPI.get(selectedCase.id);
      const receiverId = caseDetails.data.lawyer.id;

      await messagesAPI.send(selectedCase.id, receiverId, newMessage);
      setNewMessage('');
      loadMessages(selectedCase.id);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (cases.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">💬</div>
          <p>No cases to message about. Create a case first.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>Messages</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', height: 'calc(100vh - 200px)' }}>
        {/* Case List */}
        <div className="card" style={{ overflow: 'auto' }}>
          <h3 style={{ marginBottom: '15px' }}>Your Cases</h3>
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
              <div style={{ fontSize: '0.75rem', color: '#a0aec0', marginTop: '5px' }}>
                Lawyer: {c.lawyer_name}
              </div>
            </div>
          ))}
        </div>

        {/* Messages */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          {selectedCase ? (
            <>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '15px' }}>
                <h3>{selectedCase.title}</h3>
                <span style={{ color: '#718096', fontSize: '0.875rem' }}>
                  Conversation with {selectedCase.lawyer_name}
                </span>
              </div>

              <div className="message-list" style={{ flex: 1, overflowY: 'auto' }}>
                {messages.length === 0 ? (
                  <div className="empty-state">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`message-item ${msg.sender.id === user.id ? 'sent' : ''}`}
                    >
                      <div className="message-bubble">
                        {msg.content}
                      </div>
                      <div className="message-meta">
                        {msg.sender.full_name} • {new Date(msg.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSend} className="message-input-container">
                <input
                  type="text"
                  className="form-input"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  disabled={sending}
                />
                <button type="submit" className="btn btn-primary" disabled={sending || !newMessage.trim()}>
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </>
          ) : (
            <div className="empty-state">
              <p>Select a case to view messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClientMessages;
