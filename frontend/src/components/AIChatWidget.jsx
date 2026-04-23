import React, { useState, useEffect, useRef, useCallback } from 'react';
import { aiAPI } from '../api/axios';
import '../styles/AIChatWidget.css';

function AIChatWidget() {
  // ---------- State ----------
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // ---------- Refs ----------
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // ---------- Data loading ----------
  const fetchSessions = useCallback(async () => {
    try {
      const res = await aiAPI.getSessions();
      setSessions(res.data);
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen, fetchSessions]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens or session changes
  useEffect(() => {
    if (isOpen && activeSession) {
      inputRef.current?.focus();
    }
  }, [isOpen, activeSession]);

  // ---------- Session management ----------
  const createSession = async () => {
    try {
      const res = await aiAPI.createSession('New Chat');
      const newSession = res.data;
      setSessions(prev => [newSession, ...prev]);
      setActiveSession(newSession);
      setMessages([]);
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const loadSession = async (session) => {
    setActiveSession(session);
    try {
      const res = await aiAPI.getSession(session.id);
      setMessages(res.data.messages);
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await aiAPI.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  // ---------- Sending messages ----------
  const sendMessage = async (text, inputType = 'text') => {
    const content = text.trim();
    if (!content || loading) return;

    // If no session, create one first
    let session = activeSession;
    if (!session) {
      try {
        const res = await aiAPI.createSession('New Chat');
        session = res.data;
        setSessions(prev => [session, ...prev]);
        setActiveSession(session);
      } catch (err) {
        console.error('Failed to create session:', err);
        return;
      }
    }

    // Optimistic UI: add user message immediately
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      input_type: inputType,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiAPI.sendMessage(session.id, content, inputType);

      // Replace temp message with real one + add AI response
      setMessages(prev => [
        ...prev.slice(0, -1),
        res.data.user_message,
        res.data.ai_message,
      ]);

      // If voice input, speak the response
      if (inputType === 'voice' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(res.data.ai_message.content);
        utterance.rate = 1;
        utterance.pitch = 1;
        speechSynthesis.speak(utterance);
      }

      // Refresh session list to update titles
      fetchSessions();
    } catch (err) {
      console.error('Send failed:', err);
      // Remove the optimistic message
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // ---------- Voice input (Web Speech API) ----------
  const toggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      sendMessage(transcript, 'voice');
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  // ---------- Keyboard handling ----------
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ---------- Format timestamp ----------
  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ---------- Simple markdown renderer ----------
  const renderMarkdown = (text) => {
    if (!text) return '';
    // Escape HTML
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Bullet lists: lines starting with "- "
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    // Line breaks
    html = html.replace(/\n/g, '<br/>');
    // Clean up extra <br/> inside <ul>
    html = html.replace(/<ul><br\/>/g, '<ul>');
    html = html.replace(/<br\/><\/ul>/g, '</ul>');
    html = html.replace(/<\/li><br\/>/g, '</li>');
    return html;
  };

  // ========== RENDER ==========

  // Floating button when closed
  if (!isOpen) {
    return (
      <button className="ai-fab" onClick={() => setIsOpen(true)} title="AI Assistant">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        <span>AI Assistant</span>
      </button>
    );
  }

  return (
    <div className="ai-widget">
      {/* Header */}
      <div className="ai-header">
        <div className="ai-header-left">
          <button
            className="ai-header-btn"
            onClick={() => setShowSidebar(!showSidebar)}
            title="Toggle history"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="ai-header-title">AI Legal Assistant</span>
        </div>
        <div className="ai-header-right">
          <button className="ai-header-btn" onClick={createSession} title="New chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button className="ai-header-btn" onClick={() => setIsOpen(false)} title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="ai-body">
        {/* Sidebar: session history */}
        {showSidebar && (
          <div className="ai-sidebar">
            <div className="ai-sidebar-header">Chat History</div>
            {sessions.length === 0 ? (
              <div className="ai-sidebar-empty">No conversations yet</div>
            ) : (
              sessions.map(s => (
                <div
                  key={s.id}
                  className={`ai-sidebar-item ${activeSession?.id === s.id ? 'active' : ''}`}
                  onClick={() => loadSession(s)}
                >
                  <div className="ai-sidebar-item-title">{s.title}</div>
                  <div className="ai-sidebar-item-meta">
                    {s.message_count} msgs
                    <button
                      className="ai-sidebar-delete"
                      onClick={(e) => deleteSession(e, s.id)}
                      title="Delete"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Main chat area */}
        <div className="ai-main">
          <div className="ai-messages">
            {messages.length === 0 && !loading && (
              <div className="ai-welcome">
                <div className="ai-welcome-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3182ce" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <h3>How can I help you?</h3>
                <p>Ask me about your cases, appointments, billing, or any legal process questions.</p>
                <div className="ai-suggestions">
                  <button onClick={() => sendMessage('What are my active cases?')}>
                    What are my active cases?
                  </button>
                  <button onClick={() => sendMessage('Do I have any upcoming appointments?')}>
                    Upcoming appointments?
                  </button>
                  <button onClick={() => sendMessage('Show my unpaid invoices')}>
                    Unpaid invoices?
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`ai-msg ai-msg-${msg.role}`}>
                <div className="ai-msg-avatar">
                  {msg.role === 'user' ? 'You' : 'AI'}
                </div>
                <div className="ai-msg-body">
                  <div
                    className="ai-msg-content"
                    dangerouslySetInnerHTML={
                      msg.role === 'assistant'
                        ? { __html: renderMarkdown(msg.content) }
                        : undefined
                    }
                  >
                    {msg.role === 'user' ? msg.content : undefined}
                  </div>
                  <div className="ai-msg-meta">
                    {formatTime(msg.created_at)}
                    {msg.input_type === 'voice' && <span className="ai-voice-tag">voice</span>}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing animation */}
            {loading && (
              <div className="ai-msg ai-msg-assistant">
                <div className="ai-msg-avatar">AI</div>
                <div className="ai-msg-body">
                  <div className="ai-typing">
                    <span className="ai-typing-dot"></span>
                    <span className="ai-typing-dot"></span>
                    <span className="ai-typing-dot"></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="ai-input-area">
            <div className="ai-input-wrapper">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={1}
                disabled={loading}
              />
              <div className="ai-input-actions">
                <button
                  className={`ai-btn-voice ${isListening ? 'listening' : ''}`}
                  onClick={toggleVoice}
                  title={isListening ? 'Stop listening' : 'Voice input'}
                  disabled={loading}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </button>
                <button
                  className="ai-btn-send"
                  onClick={() => sendMessage(input)}
                  disabled={loading || !input.trim()}
                  title="Send message"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIChatWidget;
