import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';

export default function Nav() {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  }

  return (
    <nav className="nav">
      <span className="nav-brand">Pub K Analytics</span>
      <NavLink to="/sessions" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
        Sessions
      </NavLink>
      <NavLink to="/stats" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
        Stats
      </NavLink>
      <button type="button" className="nav-logout" onClick={handleLogout}>
        Log out
      </button>
    </nav>
  );
}
