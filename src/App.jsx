import { Routes, Route, Navigate } from 'react-router-dom';
import AuthGate from './components/AuthGate.jsx';
import Nav from './components/Nav.jsx';
import Login from './pages/Login.jsx';
import Sessions from './pages/Sessions.jsx';
import SessionDetail from './pages/SessionDetail.jsx';
import Stats from './pages/Stats.jsx';

function AuthedLayout({ children }) {
  return (
    <AuthGate>
      <Nav />
      <main className="page">{children}</main>
    </AuthGate>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/sessions" replace />} />
      <Route
        path="/sessions"
        element={
          <AuthedLayout>
            <Sessions />
          </AuthedLayout>
        }
      />
      <Route
        path="/sessions/:convo"
        element={
          <AuthedLayout>
            <SessionDetail />
          </AuthedLayout>
        }
      />
      <Route
        path="/stats"
        element={
          <AuthedLayout>
            <Stats />
          </AuthedLayout>
        }
      />
      <Route path="*" element={<Navigate to="/sessions" replace />} />
    </Routes>
  );
}
