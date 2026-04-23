import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import {
  Clock, CheckCircle, X, Trophy, Loader2,
  Send, Zap, Flame, Star, Pause
} from 'lucide-react';

function WaitingScreen({ playerName }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
      <div className="animate-pulse-slow">
        <Loader2 className="w-16 h-16 text-primary-400 animate-spin mx-auto mb-6" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Hey {playerName}!</h2>
      <p className="text-gray-400 text-lg">Wachten tot de quiz begint...</p>
      <p className="text-gray-600 text-sm mt-4">Kijk naar het grote scherm 📺</p>
    </div>
  );
}

function QuestionView({ question, onAnswer, timeLeft }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [freeAnswers, setFreeAnswers] = useState(['', '', '']);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  const optionColors = [
    'bg-quiz-red hover:bg-red-600 active:bg-red-700',
    'bg-quiz-blue hover:bg-blue-600 active:bg-blue-700',
    'bg-quiz-green hover:bg-emerald-600 active:bg-emerald-700',
    'bg-quiz-yellow hover:bg-yellow-500 active:bg-yellow-600 text-black',
  ];
  const optionShapes = ['△', '◇', '○', '□'];

  const handleMCAnswer = (index) => {
    if (submitted) return;
    setSelectedAnswer(index);
    setSubmitted(true);
    onAnswer(index, (res) => setResult(res));
  };

  const handleFreeAnswer = () => {
    if (submitted) return;
    const answer = freeAnswers.filter(a => a.trim()).join(', ');
    if (!answer) return;
    setSubmitted(true);
    onAnswer(answer, (res) => setResult(res));
  };

  // Show feedback after submitting
  if (submitted && result) {
    const isPartial = result.totalExpected > 1 && result.correctCount > 0 && result.correctCount < result.totalExpected;
    const statusColor = isPartial ? 'bg-quiz-orange/20 text-quiz-orange' : (result.isCorrect ? 'bg-quiz-green/20 text-quiz-green' : 'bg-quiz-red/20 text-quiz-red');
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 ${statusColor} animate-bounce-in`}>
          {isPartial ? (
            <div className="text-4xl">🤔</div>
          ) : result.isCorrect ? (
            <CheckCircle className="w-20 h-20" />
          ) : (
            <X className="w-20 h-20" />
          )}
        </div>

        <h2 className={`text-3xl font-black mb-2 ${isPartial ? 'text-quiz-orange' : (result.isCorrect ? 'text-quiz-green' : 'text-quiz-red')}`}>
          {isPartial ? `Deels correct! ${result.correctCount}/${result.totalExpected}` :
           result.totalExpected > 1 ? `${result.correctCount}/${result.totalExpected} correct` :
           (result.isCorrect ? 'Correct! 🎉' : 'Helaas! 😅')}
        </h2>

        {/* Show answer details for free type questions */}
        {result.answerDetails && result.totalExpected > 1 && (
          <div className="w-full max-w-sm mb-4 space-y-2">
            {result.answerDetails.matched?.map((ans, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-quiz-green/10 border border-quiz-green/30 rounded-lg">
                <CheckCircle className="w-4 h-4 text-quiz-green" />
                <span className="text-sm capitalize">{ans}</span>
              </div>
            ))}
            {result.answerDetails.unmatched?.map((ans, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-quiz-red/10 border border-quiz-red/30 rounded-lg">
                <X className="w-4 h-4 text-quiz-red" />
                <span className="text-sm capitalize">{ans}</span>
              </div>
            ))}
          </div>
        )}

        <div className="text-center">
          <p className="text-4xl font-black text-quiz-yellow mb-1">+{result.points}</p>
          <p className="text-gray-400">punten</p>
          {result.streak > 1 && (
            <div className="flex items-center gap-1 justify-center mt-2 text-quiz-orange">
              <Flame className="w-5 h-5" />
              <span className="font-bold">{result.streak}x streak!</span>
            </div>
          )}
        </div>

        <div className="mt-6 text-gray-400">
          <span>Totaal: </span>
          <span className="font-bold text-white text-xl">{result.totalScore.toLocaleString()}</span>
        </div>
      </div>
    );
  }

  // Show "submitted, waiting" state
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
        <Loader2 className="w-12 h-12 text-primary-400 animate-spin mb-4" />
        <p className="text-xl font-bold">Antwoord verzonden!</p>
        <p className="text-gray-400 mt-1">Even wachten op het resultaat...</p>
      </div>
    );
  }

  // Info slide - show text + image
  if (question.type === 'info_slide') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 max-w-2xl leading-relaxed">
          {question.questionText}
        </h2>
        {question.imageUrl && (
          <img
            src={question.imageUrl}
            alt=""
            className="max-w-full max-h-[60vh] rounded-2xl object-contain"
          />
        )}
      </div>
    );
  }

  // Leaderboard slide - show trophy
  if (question.type === 'leaderboard_slide') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
        <Trophy className="w-16 h-16 text-quiz-yellow mb-4" />
        <h2 className="text-3xl font-bold mb-2">Tussenstand</h2>
        <p className="text-gray-400">Bekijk het grote scherm!</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
      {/* Timer */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400">
          Slide {question.questionNumber}/{question.totalQuestions}
        </span>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold ${timeLeft <= 5 ? 'bg-quiz-red/20 text-quiz-red animate-pulse' : 'bg-white/10 text-white'}`}>
          <Clock className="w-4 h-4" />
          {timeLeft}s
        </div>
      </div>

      {/* Question */}
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold leading-tight">
          {question.questionText}
        </h2>
        {question.imageUrl && (
          <img
            src={question.imageUrl}
            alt="Question"
            className="mt-3 w-full max-h-48 rounded-xl object-contain"
          />
        )}
      </div>

      {/* Multiple Choice */}
      {question.type === 'multiple_choice' && (
        <div className="flex-1 grid grid-cols-2 gap-2 sm:gap-3">
          {question.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleMCAnswer(i)}
              className={`${optionColors[i]} p-3 sm:p-5 rounded-xl sm:rounded-2xl text-left font-bold text-sm sm:text-lg transition-all active:scale-95 flex items-center gap-2 sm:gap-3 min-h-[3rem] sm:min-h-[4rem]`}
            >
              <span className="text-lg sm:text-2xl opacity-60 leading-none">{optionShapes[i]}</span>
              <span className="flex-1 line-clamp-3">{opt}</span>
            </button>
          ))}
        </div>
      )}

      {/* Free Type */}
      {question.type === 'free_type' && (
        <div className="flex-1 flex flex-col gap-3">
          {Array.from({ length: question.inputFields || 1 }).map((_, i) => (
            <input
              key={i}
              type="text"
              value={freeAnswers[i]}
              onChange={(e) => {
                const newAnswers = [...freeAnswers];
                newAnswers[i] = e.target.value;
                setFreeAnswers(newAnswers);
              }}
              className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-lg focus:outline-none focus:border-primary-500"
              placeholder={question.inputFields > 1 ? `Antwoord ${i + 1}` : 'Typ je antwoord...'}
              autoFocus={i === 0}
            />
          ))}
          <button
            onClick={handleFreeAnswer}
            disabled={!freeAnswers.some(a => a.trim())}
            className="mt-auto py-4 bg-primary-600 hover:bg-primary-700 rounded-xl font-bold text-lg transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Verstuur antwoord
          </button>
        </div>
      )}
    </div>
  );
}

function PlayerLeaderboardView({ leaderboard, playerName }) {
  const myRank = leaderboard.findIndex(p => p.name === playerName) + 1;
  const myData = leaderboard.find(p => p.name === playerName);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
      <Trophy className="w-12 h-12 text-quiz-yellow mb-4" />
      <h2 className="text-2xl font-bold mb-6">Tussenstand</h2>

      {myData && (
        <div className="bg-primary-600/20 border-2 border-primary-500/40 rounded-2xl p-6 text-center mb-6 w-full max-w-sm">
          <p className="text-gray-400 text-sm">Jouw positie</p>
          <p className="text-5xl font-black text-primary-400 my-2">#{myRank}</p>
          <p className="text-2xl font-bold">{myData.score.toLocaleString()} <span className="text-sm text-gray-400">punten</span></p>
          <div className="flex items-center justify-center gap-4 mt-3 text-sm text-gray-400">
            <span>{myData.correctAnswers} correct</span>
            {myData.streak > 0 && (
              <span className="flex items-center gap-1 text-quiz-orange">
                <Flame className="w-4 h-4" />
                {myData.streak}x
              </span>
            )}
          </div>
        </div>
      )}

      <div className="w-full max-w-sm space-y-2">
        {leaderboard.slice(0, 5).map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 p-3 rounded-xl ${p.name === playerName ? 'bg-primary-600/20 border border-primary-500/30' : 'bg-white/5'}`}
          >
            <span className="w-8 text-center font-bold text-gray-400">#{i + 1}</span>
            <span className="text-2xl">{p.emoji || '😀'}</span>
            <span className="flex-1 font-medium">{p.name}</span>
            <span className="font-bold">{p.score.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <p className="text-gray-600 text-sm mt-6">Wachtend op volgende vraag...</p>
    </div>
  );
}

function PlayerFinishedView({ leaderboard, playerName }) {
  const myRank = leaderboard.findIndex(p => p.name === playerName) + 1;
  const myData = leaderboard.find(p => p.name === playerName);
  const emojis = ['🏆', '🥈', '🥉', '👏', '💪', '⭐', '🎮', '🎯'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
      <div className="text-6xl mb-4">{emojis[Math.min(myRank - 1, emojis.length - 1)]}</div>
      <h2 className="text-3xl font-black mb-2">Quiz Voltooid!</h2>
      <p className="text-gray-400 mb-6">Goed gespeeld, {playerName}!</p>

      {myData && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center mb-6 w-full max-w-sm">
          <p className="text-6xl font-black mb-2">#{myRank}</p>
          <p className="text-3xl font-bold text-primary-400">{myData.score.toLocaleString()}</p>
          <p className="text-gray-400 mt-1">punten</p>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="text-center">
              <Star className="w-5 h-5 text-quiz-yellow mx-auto mb-1" />
              <span className="text-gray-400">{myData.correctAnswers} correct</span>
            </div>
            <div className="text-center">
              <Zap className="w-5 h-5 text-quiz-orange mx-auto mb-1" />
              <span className="text-gray-400">{myData.totalAnswers} beantwoord</span>
            </div>
          </div>
        </div>
      )}

      <a
        href="/"
        className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
      >
        Terug naar home
      </a>
    </div>
  );
}

function PausedScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
      <div className="animate-pulse-slow">
        <Pause className="w-20 h-20 text-quiz-yellow mx-auto mb-6" />
      </div>
      <h2 className="text-3xl font-black mb-2">Quiz Gepauzeerd</h2>
      <p className="text-gray-400 text-lg">Even wachten...</p>
    </div>
  );
}

export default function PlayerGame() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [gameState, setGameState] = useState('waiting');
  const [question, setQuestion] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    const player = sessionStorage.getItem('player');
    if (!player) {
      navigate('/play');
      return;
    }
    setPlayerName(JSON.parse(player).name);
  }, [navigate]);

  // Timer
  useEffect(() => {
    if (gameState !== 'question' || !question) return;
    setTimeLeft(question.timeLimit || 20);

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, question]);

  useEffect(() => {
    if (!socket) return;

    socket.on('game:question', (q) => {
      setQuestion(q);
      setGameState('question');
    });

    socket.on('game:question-results', () => {
      // Player just waits, host controls flow
    });

    socket.on('game:leaderboard', ({ leaderboard: lb }) => {
      setLeaderboard(lb);
      setGameState('leaderboard');
    });

    socket.on('game:finished', ({ leaderboard: lb }) => {
      setLeaderboard(lb);
      setGameState('finished');
    });

    socket.on('game:paused', ({ paused }) => {
      if (paused) {
        setGameState('paused');
      } else {
        setGameState('question');
      }
    });

    socket.on('game:host-disconnected', () => {
      alert('De host heeft het spel verlaten');
      navigate('/play');
    });

    return () => {
      socket.off('game:question');
      socket.off('game:question-results');
      socket.off('game:leaderboard');
      socket.off('game:finished');
      socket.off('game:paused');
      socket.off('game:host-disconnected');
    };
  }, [socket, navigate]);

  const handleAnswer = (answer, onResult) => {
    socket.emit('player:answer', answer, (response) => {
      if (response.error) {
        console.error(response.error);
        return;
      }
      onResult(response);
    });
  };

  if (gameState === 'waiting') {
    return <WaitingScreen playerName={playerName} />;
  }

  if (gameState === 'paused') {
    return <PausedScreen />;
  }

  if (gameState === 'question') {
    return <QuestionView question={question} onAnswer={handleAnswer} timeLeft={timeLeft} />;
  }

  if (gameState === 'leaderboard') {
    return <PlayerLeaderboardView leaderboard={leaderboard} playerName={playerName} />;
  }

  if (gameState === 'finished') {
    return <PlayerFinishedView leaderboard={leaderboard} playerName={playerName} />;
  }

  return null;
}
