import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react';

const ADMIN_PASSWORD = 'meteor2026';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin', 'true');
      navigate('/admin');
    } else {
      setError('Fout wachtwoord');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
      <Link to="/" className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="w-5 h-5" />
      </Link>

      <Shield className="w-16 h-16 text-primary-400 mb-6" />
      <h1 className="text-3xl font-black mb-8">Admin Login</h1>

      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
          <label className="block text-sm text-gray-400 mb-2">
            <Lock className="w-4 h-4 inline mr-1" />
            Wachtwoord
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-center text-2xl font-bold py-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary-500 transition-colors pr-12"
              placeholder="••••••"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
            </button>
          </div>
          {error && (
            <div className="mt-3 text-quiz-red text-sm text-center">{error}</div>
          )}
          <button
            type="submit"
            className="w-full mt-4 py-3 bg-primary-600 hover:bg-primary-700 rounded-xl font-bold text-lg transition-colors"
          >
            Inloggen
          </button>
        </div>
      </form>
    </div>
  );
}
