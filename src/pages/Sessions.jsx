import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { topicLabels, outcomeLabels, topicLabel } from '../lib/labels.js';
import Badge from '../components/Badge.jsx';

const PAGE_SIZE = 20;

function truncate(text, max = 140) {
  if (!text) return '(no question recorded)';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleString() : '—';
}

export default function Sessions() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [eventsByConvo, setEventsByConvo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');

  // Debounce the search box so we don't fire a query per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      setSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');

      let query = supabase
        .from('conversation_summary')
        .select('*', { count: 'exact' })
        .order('ended', { ascending: false });

      if (search) {
        query = query.ilike('first_question', `%${search}%`);
      }
      if (topicFilter) {
        // topics is a text[] column — .contains checks the filter value is one of them.
        query = query.contains('topics', [topicFilter]);
      }
      if (outcomeFilter) {
        // conversation_summary has no raw "outcome" column (that lives per-turn on
        // chat_logs); we approximate an outcome filter from the view's aggregate
        // counts. "answered" means no fallback/lead/handover occurred all session.
        if (outcomeFilter === 'fallback') query = query.gt('fallbacks', 0);
        else if (outcomeFilter === 'lead_offered') query = query.gt('leads', 0);
        else if (outcomeFilter === 'handover_offered') query = query.gt('handovers', 0);
        else if (outcomeFilter === 'answered') {
          query = query.eq('fallbacks', 0).eq('handovers', 0).eq('leads', 0);
        }
      }

      query = query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      const { data, error: queryError, count } = await query;
      if (cancelled) return;

      if (queryError) {
        setError(queryError.message);
        setRows([]);
        setLoading(false);
        return;
      }

      setRows(data || []);
      setTotalCount(count || 0);

      const convos = (data || []).map((r) => r.convo);
      if (convos.length) {
        const { data: events } = await supabase
          .from('chat_events')
          .select('convo, event_type')
          .in('convo', convos);
        if (!cancelled) {
          const map = {};
          for (const ev of events || []) {
            map[ev.convo] = map[ev.convo] || { lead: false, handover: false };
            if (ev.event_type === 'lead') map[ev.convo].lead = true;
            if (ev.event_type === 'handover') map[ev.convo].handover = true;
          }
          setEventsByConvo(map);
        }
      } else {
        setEventsByConvo({});
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [page, search, topicFilter, outcomeFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <h1>Sessions</h1>

      <div className="filters">
        <input
          type="search"
          placeholder="Search first question…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          value={topicFilter}
          onChange={(e) => {
            setPage(0);
            setTopicFilter(e.target.value);
          }}
        >
          <option value="">All topics</option>
          {Object.entries(topicLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={outcomeFilter}
          onChange={(e) => {
            setPage(0);
            setOutcomeFilter(e.target.value);
          }}
        >
          <option value="">All outcomes</option>
          {Object.entries(outcomeLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>Loading…</p>}

      {!loading && !error && (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>First question</th>
                <th>Topics</th>
                <th>Started</th>
                <th>Ended</th>
                <th>Exchanges</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const events = eventsByConvo[row.convo] || {};
                return (
                  <tr key={row.convo} onClick={() => navigate(`/sessions/${row.convo}`)} className="clickable-row">
                    <td>{truncate(row.first_question)}</td>
                    <td>{(row.topics || []).map(topicLabel).join(', ') || '—'}</td>
                    <td>{formatDate(row.started)}</td>
                    <td>{formatDate(row.ended)}</td>
                    <td>{row.exchanges}</td>
                    <td className="badge-cell">
                      {!!row.member && <Badge variant="member">Member</Badge>}
                      {events.lead && <Badge variant="lead">Lead</Badge>}
                      {events.handover && <Badge variant="handover">Handover</Badge>}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    No sessions match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="pagination">
            <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              Page {page + 1} of {totalPages} ({totalCount} sessions)
            </span>
            <button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
