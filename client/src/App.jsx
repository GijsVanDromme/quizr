import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import QuizEditor from './pages/admin/QuizEditor';
import HostGame from './pages/admin/HostGame';
import PlayerJoin from './pages/player/PlayerJoin';
import PlayerGame from './pages/player/PlayerGame';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/quiz/:id" element={<QuizEditor />} />
        <Route path="/admin/host/:id" element={<HostGame />} />
        <Route path="/play" element={<PlayerJoin />} />
        <Route path="/play/game" element={<PlayerGame />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
