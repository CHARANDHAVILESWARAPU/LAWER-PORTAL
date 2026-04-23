import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { consultationsAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

/**
 * Full-screen video consultation room.
 *
 * Reliability strategy (waterfall):
 *   1. Try Jitsi Meet External API (best experience)
 *   2. Fall back to embedded iframe (works when API script is blocked)
 *   3. Offer "Open in new tab" link (always works)
 *
 * Flow:
 *   1. Validate meeting via backend (JWT + HMAC token)
 *   2. Attempt to load and use Jitsi External API
 *   3. If that fails, embed via iframe
 *   4. On hangup → POST /leave/ to record duration, then navigate back
 */

function VideoRoom() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [meetingData, setMeetingData] = useState(null);
  const [error, setError] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [jitsiLoading, setJitsiLoading] = useState(false);
  const [mode, setMode] = useState(null); // 'api' | 'iframe' | null
  const jitsiRef = useRef(null);
  const timerRef = useRef(null);
  const hasLeftRef = useRef(false);

  // Get token from navigation state or URL params
  const token = location.state?.token || new URLSearchParams(location.search).get('token') || '';

  // Validate meeting on mount
  useEffect(() => {
    const validateAndJoin = async () => {
      try {
        const res = await consultationsAPI.joinMeeting(meetingId, token);
        setMeetingData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Unable to join meeting. Please check your connection and try again.');
      }
    };
    validateAndJoin();
  }, [meetingId, token]);

  // Record leave - only once
  const handleLeave = useCallback(async () => {
    if (hasLeftRef.current) return;
    hasLeftRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await consultationsAPI.leaveMeeting(meetingId);
    } catch (err) {
      // Best-effort
    }
  }, [meetingId]);

  // Navigate back to consultations page
  const navigateBack = useCallback(() => {
    const role = user?.role || 'client';
    navigate(`/${role}/consultations`);
  }, [user, navigate]);

  // Build Jitsi room URL for iframe / new tab
  const getJitsiUrl = useCallback(() => {
    if (!meetingData) return '';
    const roomName = meetingData.room_name;
    const displayName = encodeURIComponent(meetingData.user_name);
    return `https://meet.jit.si/${roomName}#userInfo.displayName="${displayName}"&config.startWithAudioMuted=true&config.prejoinPageEnabled=true&config.disableDeepLinking=true`;
  }, [meetingData]);

  // Initialize Jitsi when meeting data is ready
  useEffect(() => {
    if (!meetingData) return;

    // Start duration timer
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    setJitsiLoading(true);

    // Try loading Jitsi External API
    const initJitsiAPI = () => {
      if (!window.JitsiMeetExternalAPI) {
        // External API not available, fall back to iframe
        console.warn('Jitsi External API not available, using iframe fallback');
        setMode('iframe');
        setJitsiLoading(false);
        return;
      }

      try {
        const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
          roomName: meetingData.room_name,
          parentNode: document.getElementById('jitsi-container'),
          width: '100%',
          height: '100%',
          userInfo: {
            displayName: meetingData.user_name,
            email: user?.email || '',
          },
          configOverwrite: {
            startWithAudioMuted: true,
            startWithVideoMuted: false,
            prejoinPageEnabled: true,
            disableDeepLinking: true,
            enableClosePage: false,
            toolbarButtons: [
              'microphone', 'camera', 'desktop', 'chat',
              'raisehand', 'participants-pane', 'tileview',
              'select-background', 'fullscreen', 'hangup',
              'settings', 'filmstrip',
            ],
            enableLayerSuspension: true,
            channelLastN: 4,
            p2p: { enabled: true },
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false,
            DEFAULT_BACKGROUND: '#1a365d',
            TOOLBAR_ALWAYS_VISIBLE: true,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            FILM_STRIP_MAX_HEIGHT: 120,
            DISABLE_VIDEO_BACKGROUND: false,
          },
        });

        // Jitsi loaded successfully
        api.addEventListener('videoConferenceJoined', () => {
          setMode('api');
          setJitsiLoading(false);
        });

        // When user hangs up
        api.addEventListener('readyToClose', () => {
          handleLeave().then(navigateBack);
        });

        // Handle connection failure
        api.addEventListener('videoConferenceLeft', () => {
          if (!hasLeftRef.current) {
            handleLeave().then(navigateBack);
          }
        });

        jitsiRef.current = api;

        // If the API doesn't fire videoConferenceJoined within 15s, fall back
        setTimeout(() => {
          if (!mode && jitsiLoading) {
            console.warn('Jitsi External API timed out, using iframe fallback');
            if (jitsiRef.current) {
              try { jitsiRef.current.dispose(); } catch (e) {}
              jitsiRef.current = null;
            }
            setMode('iframe');
            setJitsiLoading(false);
          }
        }, 15000);
      } catch (err) {
        console.error('Jitsi External API initialization failed:', err);
        setMode('iframe');
        setJitsiLoading(false);
      }
    };

    // Load script if not already loaded
    if (window.JitsiMeetExternalAPI) {
      initJitsiAPI();
    } else {
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;

      script.onload = () => {
        setTimeout(initJitsiAPI, 200);
      };

      script.onerror = () => {
        console.warn('Failed to load Jitsi script, using iframe fallback');
        setMode('iframe');
        setJitsiLoading(false);
      };

      document.head.appendChild(script);
    }

    // Cleanup on unmount
    return () => {
      if (jitsiRef.current) {
        try { jitsiRef.current.dispose(); } catch (e) {}
        jitsiRef.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current);
      handleLeave();
    };
  }, [meetingData, user, navigate, handleLeave, navigateBack]);

  // Handle end call from top bar (iframe mode)
  const handleEndCall = async () => {
    await handleLeave();
    navigateBack();
  };

  // Open meeting in new tab (ultimate fallback)
  const openInNewTab = () => {
    window.open(getJitsiUrl(), '_blank', 'noopener,noreferrer');
  };

  // Format seconds as hh:mm:ss or mm:ss
  const formatDuration = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  // Error state
  if (error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#1a365d', color: '#fff',
        flexDirection: 'column', gap: '20px', padding: '20px', textAlign: 'center'
      }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fc8181" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <h2>Cannot Join Meeting</h2>
        <p style={{ color: '#fc8181', maxWidth: '400px' }}>{error}</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
            style={{ background: '#3182ce', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (!meetingData) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#1a365d', color: '#fff',
        flexDirection: 'column', gap: '16px'
      }}>
        <div className="spinner" style={{ borderTopColor: '#fff' }}></div>
        <p>Connecting to meeting...</p>
      </div>
    );
  }

  // Video room
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#000' }}>
      {/* Top bar */}
      <div style={{
        padding: '8px 20px',
        background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.9rem',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <strong>Legal Portal - Video Consultation</strong>
          <span style={{ opacity: 0.8 }}>
            {meetingData.consultation.consultation_number}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{
            background: callDuration > 0 ? 'rgba(72,187,120,0.3)' : 'rgba(255,255,255,0.15)',
            padding: '4px 12px',
            borderRadius: '12px',
            fontFamily: 'monospace',
            border: callDuration > 0 ? '1px solid rgba(72,187,120,0.5)' : 'none',
          }}>
            {formatDuration(callDuration)}
          </span>
          <span style={{ opacity: 0.8 }}>
            With: {user?.role === 'client'
              ? meetingData.consultation.lawyer_name
              : meetingData.consultation.client_name}
          </span>
          {/* Open in new tab button */}
          <button
            onClick={openInNewTab}
            title="Open in new tab"
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
              padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem'
            }}
          >
            Open in Tab
          </button>
          {/* End call button (visible in iframe mode) */}
          {mode === 'iframe' && (
            <button
              onClick={handleEndCall}
              style={{
                background: '#e53e3e', border: 'none', color: '#fff',
                padding: '6px 16px', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.85rem'
              }}
            >
              End Call
            </button>
          )}
        </div>
      </div>

      {/* Jitsi loading overlay */}
      {jitsiLoading && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '12px', color: '#fff',
        }}>
          <div className="spinner" style={{ borderTopColor: '#fff' }}></div>
          <p>Setting up video call...</p>
          <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>If this takes too long, the call will open in an alternative view</p>
        </div>
      )}

      {/* Jitsi External API container (mode=api) */}
      <div
        id="jitsi-container"
        style={{
          flex: 1,
          position: 'relative',
          display: mode === 'iframe' ? 'none' : 'block'
        }}
      />

      {/* Iframe fallback (mode=iframe) */}
      {mode === 'iframe' && (
        <iframe
          src={getJitsiUrl()}
          style={{
            flex: 1,
            border: 'none',
            width: '100%',
          }}
          allow="camera; microphone; display-capture; autoplay; clipboard-write"
          allowFullScreen
          title="Video Consultation"
        />
      )}
    </div>
  );
}

export default VideoRoom;
