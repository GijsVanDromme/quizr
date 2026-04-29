import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { ArrowLeft, Gamepad2, User, Hash, Wifi, WifiOff, Smile, Download, X as XIcon } from 'lucide-react';

const EMOJIS = ['😀', '😎', '🚀', '🔥', '⭐', '🎮', '🏆', '💪', '🎯', '🌟', '⚡', '🎪', '🎨', '🎭', '🎪', '🦄', '🐱', '🐶', '🦊', '🦁', '🐸', '🐼', '🦉', '🦋', '🌈', '☀️', '🌙', '⚽', '🏀', '🎾', '🎸', '🎹', '🎧', '📷', '💻', '🚗', '✈️', '🚀'];
const TEAM_ICONS = ['/team-icons/1.png', '/team-icons/2.png', '/team-icons/3.png', '/team-icons/4.png', '/team-icons/5.png', '/team-icons/6.png', '/team-icons/7.png', '/team-icons/8.png'];

function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) && !window.navigator.standalone;
    setIsIOS(ios);
    if (ios && !sessionStorage.getItem('pwa-dismissed')) {
      setShowBanner(true);
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!sessionStorage.getItem('pwa-dismissed')) {
        setShowBanner(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  const dismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa-dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-primary-800 border border-primary-600 rounded-2xl p-4 shadow-2xl animate-slide-up">
      <button onClick={dismiss} className="absolute top-2 right-2 text-gray-400 hover:text-white p-1">
        <XIcon className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Voeg toe aan homescreen</p>
          <p className="text-gray-400 text-xs">
            {isIOS
              ? 'Tik op Delen ⬆️ en dan "Zet op beginscherm"'
              : 'Snel openen via je startscherm'}
          </p>
        </div>
        {!isIOS && deferredPrompt && (
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm font-bold flex-shrink-0"
          >
            Installeer
          </button>
        )}
      </div>
    </div>
  );
}

export default function PlayerJoin() {
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(TEAM_ICONS[0]);
  const [step, setStep] = useState('pin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [takenIcons, setTakenIcons] = useState([]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { socket, connected } = useSocket();

  useEffect(() => {
    const prefillPin = searchParams.get('pin');
    if (prefillPin) {
      setPin(prefillPin);
      setStep('name');
    }
  }, [searchParams]);

  // Listen for taken icons updates
  useEffect(() => {
    if (!socket) return;

    const handleTakenIcons = (icons) => {
      setTakenIcons(icons || []);
    };

    socket.on('game:taken-icons', handleTakenIcons);

    // Request taken icons when PIN is entered
    if (pin.length === 6) {
      socket.emit('player:get-taken-icons', pin);
    }

    return () => {
      socket.off('game:taken-icons', handleTakenIcons);
    };
  }, [socket, pin]);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin.length !== 6) {
      setError('PIN moet 6 cijfers zijn');
      return;
    }
    setError('');
    setStep('name');
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vul je naam in');
      return;
    }
    if (!socket || !connected) {
      setError('Geen verbinding met server');
      return;
    }

    setLoading(true);
    setError('');

    socket.emit('player:join', { pin, name: name.trim(), emoji }, (response) => {
      setLoading(false);
      if (response.error) {
        setError(response.error);
        return;
      }

      localStorage.setItem('player', JSON.stringify({
        id: response.playerId,
        name: response.playerName,
        emoji,
        pin
      }));
      sessionStorage.setItem('freshJoin', 'true');

      navigate('/play/game');
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900 px-4">
      <Link to="/" className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="w-5 h-5" />
      </Link>

      <div className={`absolute top-6 right-6 flex items-center gap-2 text-sm ${connected ? 'text-quiz-green' : 'text-quiz-red'}`}>
        {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
        {connected ? 'Verbonden' : 'Geen verbinding'}
      </div>

      <Gamepad2 className="w-16 h-16 text-primary-400 mb-6" />
      <h1 className="text-4xl font-black mb-8">Doe mee!</h1>

      <InstallBanner />

      {step === 'pin' ? (
        <form onSubmit={handlePinSubmit} className="w-full max-w-sm">
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
            <label className="block text-sm text-gray-400 mb-2">
              <Hash className="w-4 h-4 inline mr-1" />
              Game PIN
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-4xl font-black tracking-[0.5em] py-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
              placeholder="000000"
              autoFocus
            />

            {error && (
              <div className="mt-3 text-quiz-red text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={pin.length !== 6}
              className="w-full mt-4 py-3 bg-primary-600 hover:bg-primary-700 rounded-xl font-bold text-lg transition-colors disabled:opacity-30"
            >
              Verder
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="w-full max-w-sm">
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
            <div className="text-center mb-4">
              <span className="text-sm text-gray-400">Game PIN:</span>
              <span className="ml-2 font-bold text-primary-400">{pin}</span>
              <button
                type="button"
                onClick={() => { setStep('pin'); setError(''); }}
                className="ml-2 text-xs text-gray-500 hover:text-white"
              >
                (wijzig)
              </button>
            </div>

            <label className="block text-sm text-gray-400 mb-2">
              <Smile className="w-4 h-4 inline mr-1" />
              Kies je team icoon
            </label>
            <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-white/5 rounded-xl">
              {TEAM_ICONS.map((icon) => {
                const isTaken = takenIcons.includes(icon) && emoji !== icon;
                return (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => !isTaken && setEmoji(icon)}
                    disabled={isTaken}
                    className={`p-1 rounded-lg transition-all flex items-center justify-center ${
                      emoji === icon ? 'bg-primary-600 ring-2 ring-primary-400 scale-105' : 'hover:bg-white/10'
                    } ${isTaken ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    <img src={icon} alt="" className="w-12 h-12 object-contain" />
                  </button>
                );
              })}
            </div>

            <label className="block text-sm text-gray-400 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Je naam
            </label>
            <div className="flex items-center gap-2">
              {emoji?.startsWith('/team-icons/')
                ? <img src={emoji} alt="" className="w-12 h-12 object-contain" />
                : <span className="text-3xl">{emoji}</span>}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                className="flex-1 text-center text-2xl font-bold py-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
                placeholder="Jouw naam"
                autoFocus
              />
            </div>

            {error && (
              <div className="mt-3 text-quiz-red text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={!name.trim() || loading || !connected}
              className="w-full mt-4 py-3 bg-quiz-green hover:bg-emerald-600 rounded-xl font-bold text-lg transition-colors disabled:opacity-30"
            >
              {loading ? 'Even wachten...' : 'Join Game! 🎮'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
