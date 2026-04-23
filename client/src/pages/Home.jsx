import { Link } from 'react-router-dom';
import { Gamepad2, Shield, Zap, Users, Trophy } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
      <div className="text-center mb-12">
        <h1 className="text-6xl md:text-8xl font-black mb-4 bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
          Quiz 2026
        </h1>
        <p className="text-xl text-gray-400">De ultieme quiz ervaring</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Link
          to="/play"
          className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-quiz-green hover:bg-emerald-600 rounded-2xl text-xl font-bold transition-all hover:scale-105"
        >
          <Gamepad2 className="w-6 h-6" />
          Speel mee!
        </Link>
        <Link
          to="/admin/login"
          className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-white/10 hover:bg-white/20 rounded-2xl text-xl font-bold transition-all hover:scale-105"
        >
          <Shield className="w-6 h-6" />
          Admin
        </Link>
      </div>

      <div className="mt-16 grid grid-cols-3 gap-8 text-center text-gray-500 text-sm">
        <div>
          <Zap className="w-6 h-6 mx-auto mb-2" />
          Realtime
        </div>
        <div>
          <Users className="w-6 h-6 mx-auto mb-2" />
          Multiplayer
        </div>
        <div>
          <Trophy className="w-6 h-6 mx-auto mb-2" />
          Leaderboard
        </div>
      </div>
    </div>
  );
}
