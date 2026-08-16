import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';

// Wraps any authenticated route. Checks the current session once on mount, then
// stays in sync via onAuthStateChange (covers login in another tab / token expiry).
export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still checking

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div className="page-loading">Loading…</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
