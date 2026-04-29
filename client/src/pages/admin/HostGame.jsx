import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { QRCodeSVG } from 'qrcode.react';
import {
  Users, Play, SkipForward, SkipBack, Trophy, BarChart3,
  CheckCircle, X, Clock, Wifi, ArrowLeft, Eye, FileText, ZoomIn,
  Volume2, VolumeX, Pause, Play as PlayIcon
} from 'lucide-react';

// Image Lightbox Modal
function ImageLightbox({ imageUrl, onClose }) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full z-50"
      >
        <X className="w-6 h-6" />
      </button>
      <img
        src={imageUrl}
        alt="Fullscreen"
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function LobbyScreen({ pin, players, onStart, quizTitle }) {
  // Use network IP if accessing from localhost
  const origin = window.location.origin.includes('localhost') 
    ? `http://192.168.0.169:5173` 
    : window.location.origin;
  const joinUrl = `${origin}/play?pin=${pin}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
      <h1 className="text-4xl md:text-5xl font-black mb-2">{quizTitle}</h1>
      <p className="text-gray-400 mb-10">Wacht tot iedereen is gejoined...</p>

      <div className="flex flex-col md:flex-row items-center gap-10 mb-10">
        <div className="bg-white p-4 rounded-2xl shadow-2xl">
          <QRCodeSVG value={joinUrl} size={200} level="M" />
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-2">Game PIN:</p>
          <div className="text-7xl md:text-8xl font-black tracking-widest text-primary-400">
            {pin}
          </div>
          <p className="text-gray-500 text-sm mt-3">
            Ga naar <span className="text-primary-400 font-mono">{origin}/play</span>
          </p>
        </div>
      </div>

      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-gray-400" />
          <span className="text-gray-400">{players.length} spelers</span>
        </div>

        <div className="flex flex-wrap gap-3 mb-8 min-h-[60px]">
          {players.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm font-medium animate-bounce-in"
            >
              {p.emoji?.startsWith('/team-icons/')
                ? <img src={p.emoji} alt="" className="w-6 h-6 object-contain" />
                : <span className="text-lg">{p.emoji || '😀'}</span>}
              <span>{p.name}</span>
            </div>
          ))}
          {players.length === 0 && (
            <div className="text-gray-600 text-sm italic">Wachtend op spelers...</div>
          )}
        </div>

        <div className="flex gap-3">
          {players.length > 0 && (
            <button
              onClick={onStart}
              className="px-8 py-4 bg-quiz-green hover:bg-emerald-600 rounded-2xl text-xl font-bold transition-colors flex items-center gap-3"
            >
              <Play className="w-6 h-6" />
              Start Quiz
            </button>
          )}
          <button
            onClick={onStart}
            className="px-6 py-4 bg-primary-600 hover:bg-primary-700 rounded-2xl text-lg font-medium transition-colors flex items-center gap-2"
          >
            <Eye className="w-5 h-5" />
            Preview (zonder spelers)
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionScreen({ question, answerCount, totalPlayers, onShowResults, onPrevious, onSkipNext, timeLeft, musicEnabled, onToggleMusic, isPaused, onTogglePause }) {
  // (info slide & question screens both receive onPrevious)
  const [lightboxImage, setLightboxImage] = useState(null);
  const optionColors = ['bg-quiz-red', 'bg-quiz-blue', 'bg-quiz-green', 'bg-quiz-yellow'];
  const optionShapes = ['△', '◇', '○', '□'];
  const optionShapesCustom = [
    <svg viewBox="0 0 100 100" className="w-8 h-8">
      <polygon points="50,15 85,85 15,85" fill="white" />
    </svg>,
    <svg viewBox="0 0 100 100" className="w-8 h-8">
      <polygon points="50,15 85,50 50,85 15,50" fill="white" />
    </svg>,
    <svg viewBox="0 0 100 100" className="w-8 h-8">
      <circle cx="50" cy="50" r="35" fill="white" />
    </svg>,
    <svg viewBox="0 0 100 100" className="w-8 h-8">
      <rect x="15" y="15" width="70" height="70" fill="white" />
    </svg>
  ];
  const API_BASE = import.meta.env.VITE_API_URL || '';

  // Info slide - simplified view without timer, answers, etc.
  if (question.type === 'info_slide') {
    return (
      <>
        <div className="min-h-screen flex flex-col p-6 md:p-10 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900 relative">
          {/* Header - simplified */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-gray-400 font-medium">
                Slide {question.questionNumber} / {question.totalQuestions}
              </span>
              <span className="px-3 py-1 bg-purple-600/30 text-purple-300 rounded-full text-sm font-bold">
                Tussenslide
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={onToggleMusic}
                className={`p-2 rounded-full transition-colors ${musicEnabled ? 'bg-primary-600/30 text-primary-400' : 'bg-white/10 text-gray-500 hover:text-gray-300'}`}
                title={musicEnabled ? 'Muziek uit' : 'Muziek aan'}
              >
                {musicEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {question.imageUrl && (
              <div className="relative mb-8">
                <img
                  src={question.imageUrl?.startsWith('/') ? `${API_BASE}${question.imageUrl}` : question.imageUrl}
                  alt="Info slide"
                  className="max-h-[40rem] rounded-2xl object-contain"
                />
              </div>
            )}
            <h2 className="text-3xl md:text-5xl font-bold text-center mb-8 max-w-4xl leading-tight">
              {question.questionText}
            </h2>
          </div>

          {/* Footer - Previous + Next */}
          <div className="flex justify-center gap-3 pb-6">
            <button
              onClick={onPrevious}
              className="px-6 py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-lg font-bold transition-colors flex items-center gap-2"
              title="Vorige"
            >
              <SkipBack className="w-5 h-5" />
              Vorige
            </button>
            <button
              onClick={onShowResults}
              className="px-8 py-4 bg-primary-600 hover:bg-primary-700 rounded-2xl text-xl font-bold transition-colors flex items-center gap-3"
            >
              <SkipForward className="w-6 h-6" />
              Volgende
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {lightboxImage && <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />}
      <div className="min-h-screen flex flex-col p-6 md:p-10 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className="text-gray-400 font-medium">
            Slide {question.questionNumber} / {question.totalQuestions}
          </span>
        </div>
        {isPaused && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-quiz-yellow/90 text-black px-8 py-4 rounded-2xl font-bold text-2xl animate-pulse z-10">
            ⏸️ Gepauzeerd
          </div>
        )}
        <div className="flex items-center gap-4">
          <button
            onClick={onTogglePause}
            className={`p-2 rounded-full transition-colors ${isPaused ? 'bg-quiz-yellow text-black' : 'bg-white/10 text-gray-500 hover:text-gray-300'}`}
            title={isPaused ? 'Hervatten' : 'Pauzeren'}
          >
            {isPaused ? <PlayIcon className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          {question.roundNumber && question.roundNumber > 0 && (
            <span className="px-3 py-1 bg-primary-600/30 text-primary-300 rounded-full text-sm font-bold">
              Ronde {question.roundNumber}
            </span>
          )}
          <div className="flex items-center gap-2 text-gray-400">
            <Users className="w-4 h-4" />
            <span>{answerCount} / {totalPlayers}</span>
          </div>
          <button
            onClick={onToggleMusic}
            className={`p-2 rounded-full transition-colors ${musicEnabled ? 'bg-primary-600/30 text-primary-400' : 'bg-white/10 text-gray-500 hover:text-gray-300'}`}
            title={musicEnabled ? 'Muziek uit' : 'Muziek aan'}
          >
            {musicEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-lg ${isPaused ? 'bg-quiz-yellow text-black' : (timeLeft <= 5 ? 'bg-quiz-red/20 text-quiz-red animate-pulse' : 'bg-white/10')}`}>
            <Clock className="w-5 h-5" />
            {isPaused ? 'PAUSED' : `${timeLeft}s`}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {question.imageUrl && (
          <div className={`relative mb-8 ${question.type !== 'info_slide' ? 'group' : ''}`}>
            <img
              src={question.imageUrl?.startsWith('/') ? `${API_BASE}${question.imageUrl}` : question.imageUrl}
              alt="Question"
              className={`max-h-[30rem] rounded-2xl ${question.type === 'info_slide' ? '' : 'shadow-2xl'} object-contain ${question.type !== 'info_slide' ? 'cursor-pointer' : ''}`}
              onClick={() => question.type !== 'info_slide' && setLightboxImage(question.imageUrl?.startsWith('/') ? `${API_BASE}${question.imageUrl}` : question.imageUrl)}
            />
            {question.type !== 'info_slide' && (
              <button
                onClick={() => setLightboxImage(question.imageUrl)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                title="Vergroot afbeelding"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <h2 className="text-3xl md:text-5xl font-bold text-center mb-8 max-w-4xl leading-tight">
          {question.questionText}
        </h2>
      </div>

      {/* Options */}
      {question.type === 'multiple_choice' && (
        <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
          {question.options.map((opt, i) => (
            <div
              key={i}
              className={`${optionColors[i]} p-6 rounded-2xl text-center text-xl font-bold shadow-lg flex items-center justify-center gap-3`}
            >
              {optionShapesCustom[i]}
              {opt}
            </div>
          ))}
        </div>
      )}


      {question.type === 'leaderboard_slide' && (
        <div className="text-center text-gray-400 text-xl">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-quiz-yellow" />
          Tussenstand wordt getoond
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={onPrevious}
          className="px-5 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors flex items-center gap-2"
          title="Vorige vraag"
        >
          <SkipBack className="w-4 h-4" />
          Vorige
        </button>
        {question.type !== 'info_slide' && question.type !== 'leaderboard_slide' && (
          <button
            onClick={onShowResults}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
          >
            Toon resultaten
          </button>
        )}
        <button
          onClick={onSkipNext}
          className="px-5 py-3 bg-primary-600/30 hover:bg-primary-600/50 border border-primary-500/30 rounded-xl font-medium transition-colors flex items-center gap-2"
          title="Direct naar volgende vraag (resultaten overslaan)"
        >
          Volgende
          <SkipForward className="w-4 h-4" />
        </button>
      </div>
      </div>
    </>
  );
}

function ResultsScreen({ results, onShowLeaderboard }) {
  const optionColors = ['bg-quiz-red', 'bg-quiz-blue', 'bg-quiz-green', 'bg-quiz-yellow'];
  const optionShapes = ['△', '◇', '○', '□'];
  const optionShapesCustom = [
    // Triangle - bredere driehoek
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <polygon points="50,15 85,85 15,85" fill="white" />
    </svg>,
    // Diamond - ruit die even breed is
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <polygon points="50,15 85,50 50,85 15,50" fill="white" />
    </svg>,
    // Circle - perfecte cirkel
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="35" fill="white" />
    </svg>,
    // Square - perfect vierkant
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect x="15" y="15" width="70" height="70" fill="white" />
    </svg>
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 md:p-10 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
      <h2 className="text-3xl font-bold mb-2">{results.questionText}</h2>
      <p className="text-gray-400 mb-8">
        {results.correctCount} / {results.totalPlayers} correct
      </p>

      {results.type === 'multiple_choice' && (
        <div className="w-full max-w-3xl space-y-3 mb-8">
          {results.options?.map((opt, i) => {
            const isCorrect = results.correctAnswer === i;
            const count = results.distribution?.[i] || 0;

            return (
              <div key={i}>
                <div className={`flex items-center gap-4 p-4 rounded-xl border-2 ${isCorrect ? 'border-quiz-green bg-quiz-green/10' : 'border-white/10 bg-white/5'}`}>
                  <div className={`w-16 h-16 rounded flex items-center justify-center flex-shrink-0 ${optionColors[i]}`}>
                    {optionShapesCustom[i]}
                  </div>
                  {isCorrect && <CheckCircle className="w-6 h-6 text-quiz-green flex-shrink-0" />}
                  {!isCorrect && <X className="w-6 h-6 text-gray-500 flex-shrink-0" />}
                  <span className="flex-1 font-medium">{opt}</span>
                  <span className="font-bold text-lg">{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {results.type === 'free_type' && (
        <div className="w-full max-w-2xl mb-8">
          <div className="bg-quiz-green/20 border-2 border-quiz-green/40 rounded-2xl p-8 mb-6 text-center">
            <p className="text-gray-300 text-sm mb-3 uppercase tracking-wide">Correcte antwoorden</p>
            <p className="text-quiz-green font-black text-3xl">
              {Array.isArray(results.correctAnswer) ? results.correctAnswer.join(', ') : results.correctAnswer}
            </p>
          </div>
          <div className="space-y-2">
            {results.answers?.map((a, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-3 rounded-xl ${a.isCorrect ? 'bg-quiz-green/10 border border-quiz-green/30' : 'bg-white/5 border border-white/10'}`}
              >
                {a.isCorrect ? <CheckCircle className="w-5 h-5 text-quiz-green" /> : <X className="w-5 h-5 text-gray-500" />}
                <span className="font-medium">{a.playerName}</span>
                <span className="text-gray-400 flex-1 text-right">{a.answer ?? '(geen antwoord)'}</span>
                {a.isCorrect && <span className="text-quiz-green font-bold">+{a.points}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onShowLeaderboard}
        className="px-8 py-4 bg-primary-600 hover:bg-primary-700 rounded-2xl text-xl font-bold transition-colors flex items-center gap-3"
      >
        <SkipForward className="w-6 h-6" />
        Volgende
      </button>
    </div>
  );
}

function LeaderboardScreen({ leaderboard, onNext, onPrevious, isLast }) {
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 md:p-10 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
      <Trophy className="w-16 h-16 text-quiz-yellow mb-4" />
      <h2 className="text-4xl font-black mb-8">Tussenstand</h2>

      <div className="w-full max-w-2xl space-y-3 mb-10">
        {leaderboard.map((player, i) => (
          <div
            key={player.id}
            className={`flex items-center gap-4 p-4 rounded-2xl animate-slide-up ${
              i === 0 ? 'bg-quiz-yellow/20 border-2 border-quiz-yellow/40' :
              i === 1 ? 'bg-gray-300/10 border-2 border-gray-300/20' :
              i === 2 ? 'bg-orange-400/10 border-2 border-orange-400/20' :
              'bg-white/5 border border-white/10'
            }`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <span className="text-3xl w-12 text-center">
              {medals[i] || `#${i + 1}`}
            </span>
            {player.emoji?.startsWith('/team-icons/')
              ? <img src={player.emoji} alt="" className="w-10 h-10 object-contain" />
              : <span className="text-2xl">{player.emoji || '😀'}</span>}
            <span className="flex-1 font-bold text-lg">{player.name}</span>
            <span className="text-xl font-black">{player.score.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        {onPrevious && (
          <button
            onClick={onPrevious}
            className="px-6 py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-lg font-bold transition-colors flex items-center gap-2"
            title="Vorige"
          >
            <SkipBack className="w-5 h-5" />
            Vorige
          </button>
        )}
        <button
          onClick={onNext}
          className="px-8 py-4 bg-primary-600 hover:bg-primary-700 rounded-2xl text-xl font-bold transition-colors flex items-center gap-3"
        >
          <SkipForward className="w-6 h-6" />
          {isLast ? 'Resultaten' : 'Volgende vraag'}
        </button>
      </div>
    </div>
  );
}

function FinishedScreen({ leaderboard }) {
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 md:p-10 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
      <div className="text-6xl mb-4">🎉</div>
      <h2 className="text-4xl font-black mb-2">Quiz Voltooid!</h2>
      <p className="text-gray-400 mb-8">Eindstand</p>

      <div className="w-full max-w-2xl space-y-3 mb-10">
        {leaderboard.map((player, i) => (
          <div
            key={player.id}
            className={`flex items-center gap-4 p-4 rounded-2xl animate-slide-up ${
              i === 0 ? 'bg-quiz-yellow/20 border-2 border-quiz-yellow/40' :
              i === 1 ? 'bg-gray-300/10 border-2 border-gray-300/20' :
              i === 2 ? 'bg-orange-400/10 border-2 border-orange-400/20' :
              'bg-white/5 border border-white/10'
            }`}
          >
            <span className="text-3xl w-12 text-center">
              {medals[i] || `#${i + 1}`}
            </span>
            {player.emoji?.startsWith('/team-icons/')
              ? <img src={player.emoji} alt="" className="w-10 h-10 object-contain" />
              : <span className="text-2xl">{player.emoji || '😀'}</span>}
            <div className="flex-1">
              <span className="font-bold text-lg">{player.name}</span>
              <div className="text-sm text-gray-400">
                {player.correctAnswers} correct · {player.totalAnswers} beantwoord
              </div>
            </div>
            <span className="text-xl font-black">{player.score.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <a
        href="/admin"
        className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
      >
        Terug naar dashboard
      </a>
    </div>
  );
}

export default function HostGame() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();

  const [gameState, setGameState] = useState('loading');
  const [pin, setPin] = useState('');
  const [players, setPlayers] = useState([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answerCount, setAnswerCount] = useState(0);
  const [results, setResults] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQuestionNum, setCurrentQuestionNum] = useState(0);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef(null);

  // Initialize audio once
  useEffect(() => {
    const audio = new Audio('/bg_music.mp3');
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  // Play/pause based on toggle
  useEffect(() => {
    if (!audioRef.current) return;
    if (musicEnabled) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [musicEnabled]);

  // Store quiz ID for preview
  useEffect(() => {
    sessionStorage.setItem('currentQuizId', id);
  }, [id]);

  // Timer
  useEffect(() => {
    if (gameState !== 'question' || !currentQuestion) return;
    setTimeLeft(currentQuestion.timeLimit || 20);

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0 || isPaused) {
          return prev;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, currentQuestion, isPaused]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('game:player-joined', ({ players: p }) => setPlayers(p));
    socket.on('game:player-left', ({ players: p }) => setPlayers(p));
    socket.on('game:answer-count', ({ count }) => setAnswerCount(count));

    socket.on('game:question-results', (r) => {
      setResults(r);
      setGameState('results');
    });

    return () => {
      socket.off('game:player-joined');
      socket.off('game:player-left');
      socket.off('game:answer-count');
      socket.off('game:question-results');
    };
  }, [socket]);

  // Create session
  useEffect(() => {
    if (!socket || !connected) return;

    socket.emit('host:create', { quizId: id }, (response) => {
      if (response.error) {
        alert(response.error);
        navigate('/admin');
        return;
      }
      setPin(response.pin);
      setQuizTitle(response.quizTitle);
      setTotalQuestions(response.totalQuestions);
      setGameState('lobby');
    });
  }, [socket, connected, id, navigate]);

  const startGame = useCallback(() => {
    socket.emit('host:start', (response) => {
      if (response.state === 'question') {
        setCurrentQuestion(response.question);
        setCurrentQuestionNum(response.question.questionNumber);
        setAnswerCount(0);
        setGameState('question');
      } else if (response.state === 'leaderboard') {
        setLeaderboard(response.leaderboard);
        setGameState('leaderboard');
      } else if (response.state === 'finished') {
        setLeaderboard(response.leaderboard);
        setGameState('finished');
      }
    });
  }, [socket]);

  const showLeaderboard = useCallback(() => {
    socket.emit('host:show-leaderboard', ({ leaderboard: lb }) => {
      setLeaderboard(lb);
      setGameState('leaderboard');
    });
  }, [socket]);

  const previousQuestion = useCallback(() => {
    socket.emit('host:previous', (response) => {
      if (response?.error) return;
      if (response.state === 'question') {
        setCurrentQuestion(response.question);
        setCurrentQuestionNum(response.question.questionNumber);
        setAnswerCount(0);
        setGameState('question');
      } else if (response.state === 'leaderboard') {
        setLeaderboard(response.leaderboard);
        setGameState('leaderboard');
      }
    });
  }, [socket]);

  const nextQuestion = useCallback(() => {
    socket.emit('host:next', (response) => {
      if (response.state === 'question') {
        setCurrentQuestion(response.question);
        setCurrentQuestionNum(response.question.questionNumber);
        setAnswerCount(0);
        setIsPaused(false);
        setGameState('question');
      } else if (response.state === 'leaderboard') {
        setLeaderboard(response.leaderboard);
        setGameState('leaderboard');
      } else if (response.state === 'finished') {
        setLeaderboard(response.leaderboard);
        setGameState('finished');
      }
    });
  }, [socket]);

  const showResults = useCallback(() => {
    console.log('[DEBUG Host] showResults called, question type:', currentQuestion?.type);
    if (currentQuestion?.type === 'info_slide') {
      console.log('[DEBUG Host] Info slide detected, calling nextQuestion directly');
      nextQuestion();
      return;
    }
    if (currentQuestion?.type === 'leaderboard_slide') {
      console.log('[DEBUG Host] Leaderboard slide detected, calling showLeaderboard directly');
      showLeaderboard();
      return;
    }
    console.log('[DEBUG Host] Emitting host:show-results');
    socket.emit('host:show-results', (r) => {
      console.log('[DEBUG Host] Received results response:', r);
      setResults(r);
      setGameState('results');
    });
  }, [socket, currentQuestion, nextQuestion, showLeaderboard]);

  const togglePause = useCallback(() => {
    socket.emit('host:toggle-pause', { paused: !isPaused }, (response) => {
      setIsPaused(response.paused);
    });
  }, [socket, isPaused]);

  if (gameState === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
        {!connected && (
          <div className="flex items-center gap-2 text-quiz-red mb-4">
            <Wifi className="w-5 h-5" />
            Verbinden met server...
          </div>
        )}
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (gameState === 'lobby') {
    return <LobbyScreen pin={pin} players={players} onStart={startGame} quizTitle={quizTitle} />;
  }

  if (gameState === 'question') {
    return (
      <QuestionScreen
        question={currentQuestion}
        answerCount={answerCount}
        totalPlayers={players.length}
        onShowResults={showResults}
        onPrevious={previousQuestion}
        onSkipNext={nextQuestion}
        timeLeft={timeLeft}
        musicEnabled={musicEnabled}
        onToggleMusic={() => setMusicEnabled(!musicEnabled)}
        isPaused={isPaused}
        onTogglePause={togglePause}
      />
    );
  }

  if (gameState === 'results') {
    return <ResultsScreen results={results} onShowLeaderboard={nextQuestion} />;
  }

  if (gameState === 'leaderboard') {
    return (
      <LeaderboardScreen
        leaderboard={leaderboard}
        onNext={nextQuestion}
        onPrevious={previousQuestion}
        isLast={currentQuestionNum >= totalQuestions}
      />
    );
  }

  if (gameState === 'finished') {
    return <FinishedScreen leaderboard={leaderboard} />;
  }

  return null;
}
