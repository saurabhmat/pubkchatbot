import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { topicLabel, outcomeLabel } from '../lib/labels.js';
import Badge from '../components/Badge.jsx';

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleString() : '—';
}

export default function SessionDetail() {
  const { convo } = useParams();
  const [logs, setLogs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');

      const [logsResult, eventsResult] = await Promise.all([
        supabase.from('chat_logs').select('*').eq('convo', convo).order('id', { ascending: true }),
        supabase.from('chat_events').select('*').eq('convo', convo).order('id', { ascending: true }),
      ]);

      if (cancelled) return;

      if (logsResult.error) {
        setError(logsResult.error.message);
      } else {
        setLogs(logsResult.data || []);
      }
      setEvents(eventsResult.data || []);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [convo]);

  return (
    <div>
      <p>
        <Link to="/sessions">&larr; Back to sessions</Link>
      </p>
      <h1>Session {convo}</h1>

      {loading && <p>Loading…</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && (
        <div className="session-detail-layout">
          <div className="transcript">
            {logs.map((turn) => (
              <div key={turn.id} className="turn">
                <div className="turn-meta">
                  <span>{formatDate(turn.created_at)}</span>
                  <Badge variant="neutral">{topicLabel(turn.topic)}</Badge>
                  <Badge variant="neutral">{outcomeLabel(turn.outcome)}</Badge>
                  {!!turn.member && <Badge variant="member">Member</Badge>}
                </div>
                <div className="turn-question">
                  <strong>Q:</strong> {turn.question}
                </div>
                <div className="turn-answer">
                  <strong>A:</strong> {turn.answer}
                </div>
              </div>
            ))}
            {logs.length === 0 && <p>No transcript rows found for this conversation.</p>}
          </div>

          <aside className="events-panel">
            <h2>Lead / handover events</h2>
            {events.length === 0 && <p>No lead or handover events for this session.</p>}
            {events.map((ev) => (
              <div key={ev.id} className="event-card">
                <div className="event-card-title">
                  <Badge variant={ev.event_type === 'lead' ? 'lead' : 'handover'}>{ev.event_type}</Badge>
                  <span>{ev.reason}</span>
                </div>
                <dl>
                  <dt>Tag</dt>
                  <dd>{ev.tag || '—'}</dd>
                  <dt>Routed to</dt>
                  <dd>{ev.routed_to || '—'}</dd>
                  <dt>Name</dt>
                  <dd>{ev.name || '—'}</dd>
                  <dt>Email</dt>
                  <dd>{ev.email || '—'}</dd>
                  <dt>GoHighLevel push</dt>
                  <dd>
                    {ev.ghl_ok ? (
                      <Badge variant="ghl-ok">Succeeded</Badge>
                    ) : (
                      <Badge variant="ghl-fail">Failed</Badge>
                    )}
                    {ev.ghl_msg && <div className="ghl-msg">{ev.ghl_msg}</div>}
                  </dd>
                  {!!ev.test_mode && (
                    <>
                      <dt>Mode</dt>
                      <dd>Test</dd>
                    </>
                  )}
                </dl>
              </div>
            ))}
          </aside>
        </div>
      )}
    </div>
  );
}
