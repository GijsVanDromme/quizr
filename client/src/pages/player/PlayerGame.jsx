import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import {
  Clock, CheckCircle, X, Trophy, Loader2,
  Send, Zap, Flame, Star, Pause, Monitor, AlertTriangle, Award, Users, ZoomIn
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

function WaitingScreen({ playerName }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
      <div className="animate-pulse-slow">
        <Loader2 className="w-16 h-16 text-primary-400 animate-spin mx-auto mb-6" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Hey {playerName}!</h2>
      <p className="text-gray-400 text-lg">Wachten tot de quiz begint...</p>
      <p className="text-gray-600 text-sm mt-4 flex items-center gap-2">
        <Monitor className="w-4 h-4" />
        Kijk naar het grote scherm
      </p>
    </div>
  );
}

function QuestionView({ question, onAnswer, timeLeft }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [freeAnswers, setFreeAnswers] = useState(['', '', '']);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const API_BASE = import.meta.env.VITE_API_URL || '';

  const optionColors = [
    'bg-quiz-red hover:bg-red-600 active:bg-red-700',
    'bg-quiz-blue hover:bg-blue-600 active:bg-blue-700',
    'bg-quiz-green hover:bg-emerald-600 active:bg-emerald-700',
    'bg-quiz-yellow hover:bg-yellow-500 active:bg-yellow-600',
  ];
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
            <AlertTriangle className="w-20 h-20" />
          ) : result.isCorrect ? (
            <CheckCircle className="w-20 h-20" />
          ) : (
            <X className="w-20 h-20" />
          )}
        </div>

        <h2 className={`text-3xl font-black mb-2 ${isPartial ? 'text-quiz-orange' : (result.isCorrect ? 'text-quiz-green' : 'text-quiz-red')}`}>
          {isPartial ? `Deels correct! ${result.correctCount}/${result.totalExpected}` :
           result.totalExpected > 1 ? `${result.correctCount}/${result.totalExpected} correct` :
           (result.isCorrect ? 'Correct!' : 'Helaas!')}
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
    <>
      {lightboxImage && <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />}
      <div className="h-[100dvh] flex flex-col bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900 overflow-hidden">
        {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
        <span className="text-xs text-gray-400 font-medium">
          {question.questionNumber}/{question.totalQuestions}
        </span>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold ${timeLeft <= 5 ? 'bg-quiz-red/20 text-quiz-red animate-pulse' : 'bg-white/10 text-white'}`}>
          <Clock className="w-3 h-3" />
          {timeLeft}s
        </div>
      </div>

      {/* Timer progress bar */}
      <div className="h-1 bg-white/10 flex-shrink-0 mx-4 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 5 ? 'bg-quiz-red' : 'bg-primary-500'}`}
          style={{ width: `${(timeLeft / (question.timeLimit || 20)) * 100}%` }}
        />
      </div>

      {/* Question text + image */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <h2 className="text-base font-bold leading-snug line-clamp-3">
          {question.questionText}
        </h2>
        {question.imageUrl && (
          <div className="relative mt-2 group cursor-pointer" onClick={() => setLightboxImage(question.imageUrl?.startsWith('/') ? `${API_BASE}${question.imageUrl}` : question.imageUrl)}>
            <img
              src={question.imageUrl?.startsWith('/') ? `${API_BASE}${question.imageUrl}` : question.imageUrl}
              alt="Question"
              className="w-full max-h-48 rounded-xl object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all rounded-xl flex items-center justify-center">
              <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        )}
      </div>

      {/* Multiple Choice – fills remaining space */}
      {question.type === 'multiple_choice' && (
        <div className="flex-1 grid grid-cols-2 gap-2 px-4 pb-4 min-h-0">
          {question.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleMCAnswer(i)}
              className={`${optionColors[i]} rounded-xl font-bold text-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-3 px-4 py-3 h-full`}
            >
              <div className="w-16 h-16">
                {optionShapesCustom[i]}
              </div>
              <span className="text-center line-clamp-3 leading-tight text-base font-black">{opt}</span>
            </button>
          ))}
        </div>
      )}

      {/* Free Type */}
      {question.type === 'free_type' && (
        <div className="flex-1 flex flex-col px-4 pb-4 gap-2 min-h-0">
          <div className="flex flex-col gap-2 flex-1">
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
                className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-base focus:outline-none focus:border-primary-500"
                placeholder={question.inputFields > 1 ? `Antwoord ${i + 1}` : 'Typ je antwoord...'}
                autoFocus={i === 0}
              />
            ))}
          </div>
          <button
            onClick={handleFreeAnswer}
            disabled={!freeAnswers.some(a => a.trim())}
            className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 rounded-xl font-bold text-base transition-colors disabled:opacity-30 flex items-center justify-center gap-2 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
            Verstuur antwoord
          </button>
        </div>
      )}
      </div>
    </>
  );
}

function PlayerResultsView({ results, playerName }) {
  const optionColors = ['bg-quiz-red', 'bg-quiz-blue', 'bg-quiz-green', 'bg-quiz-yellow'];
  const optionShapes = ['△', '◇', '○', '□'];
  
  // Find current player's answer
  const myAnswer = results.answers?.find(a => a.playerName === playerName);
  const myCorrect = myAnswer?.isCorrect;
  const myPoints = myAnswer?.points || 0;
  
  // Check if partially correct (has points but not fully correct)
  const isPartiallyCorrect = !myCorrect && myPoints > 0;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 pb-16 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900 overflow-y-auto">
      {/* Big visual feedback at top */}
      <div className="flex flex-col items-center justify-center my-6">
        {myCorrect ? (
          <>
            <div className="w-24 h-24 rounded-full bg-quiz-green/20 border-4 border-quiz-green flex items-center justify-center mb-3 animate-bounce">
              <CheckCircle className="w-16 h-16 text-quiz-green" />
            </div>
            <h1 className="text-3xl font-black text-quiz-green mb-1">Correct!</h1>
            {myPoints > 0 && (
              <p className="text-xl font-bold text-quiz-green">+{myPoints} punten</p>
            )}
          </>
        ) : isPartiallyCorrect ? (
          <>
            <div className="w-24 h-24 rounded-full bg-quiz-yellow/20 border-4 border-quiz-yellow flex items-center justify-center mb-3">
              <Zap className="w-16 h-16 text-quiz-yellow" />
            </div>
            <h1 className="text-3xl font-black text-quiz-yellow mb-1">Gedeeltelijk!</h1>
            <p className="text-lg text-gray-300">Goed bezig!</p>
            {myPoints > 0 && (
              <p className="text-xl font-bold text-quiz-yellow mt-1">+{myPoints} punten</p>
            )}
          </>
        ) : myCorrect === false && myPoints === 0 ? (
          <>
            <div className="w-24 h-24 rounded-full bg-quiz-red/20 border-4 border-quiz-red flex items-center justify-center mb-3">
              <X className="w-16 h-16 text-quiz-red" />
            </div>
            <h1 className="text-3xl font-black text-quiz-red mb-1">Helaas!</h1>
            <p className="text-lg text-gray-400">Volgende keer beter</p>
          </>
        ) : (
          <>
            <div className="w-24 h-24 rounded-full bg-gray-500/20 border-4 border-gray-500 flex items-center justify-center mb-3">
              <Clock className="w-16 h-16 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-400 mb-1">Tijd verstreken</h1>
          </>
        )}
      </div>

      <h2 className="text-lg font-bold text-center mb-2 px-4 line-clamp-2">{results.questionText}</h2>
      <p className="text-gray-400 text-sm mb-6">
        <span className="text-quiz-green font-bold">{results.correctCount}</span> / {results.totalPlayers} correct
      </p>

      {results.type === 'multiple_choice' && (
        <div className="w-full max-w-md space-y-3 mb-6">
          {results.options?.map((opt, i) => {
            const isCorrect = results.correctAnswer === i;
            const count = results.distribution?.[i] || 0;
            const pct = results.totalPlayers > 0 ? (count / results.totalPlayers) * 100 : 0;
            return (
              <div key={i} className="relative">
                <div className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  isCorrect 
                    ? 'border-quiz-green bg-quiz-green/20 shadow-lg shadow-quiz-green/20' 
                    : 'border-white/10 bg-white/5'
                }`}>
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${optionColors[i]}`}>
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      {i === 0 && <polygon points="50,15 85,85 15,85" fill="white" />}
                      {i === 1 && <polygon points="50,15 85,50 50,85 15,50" fill="white" />}
                      {i === 2 && <circle cx="50" cy="50" r="35" fill="white" />}
                      {i === 3 && <rect x="15" y="15" width="70" height="70" fill="white" />}
                    </svg>
                  </div>
                  {isCorrect ? (
                    <CheckCircle className="w-6 h-6 text-quiz-green flex-shrink-0" />
                  ) : (
                    <X className="w-6 h-6 text-gray-600 flex-shrink-0" />
                  )}
                  <span className={`flex-1 text-sm font-medium line-clamp-2 ${isCorrect ? 'text-white' : 'text-gray-300'}`}>
                    {opt}
                  </span>
                  <span className={`font-bold ${isCorrect ? 'text-quiz-green' : 'text-gray-400'}`}>
                    {count}
                  </span>
                </div>
                {pct > 0 && (
                  <div 
                    className={`absolute bottom-0 left-0 h-1.5 rounded-b-xl transition-all ${optionColors[i]} opacity-60`} 
                    style={{ width: `${pct}%` }} 
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {results.type === 'free_type' && (
        <div className="w-full max-w-md mb-6 p-4 bg-quiz-green/10 border border-quiz-green/30 rounded-xl">
          <p className="text-gray-400 text-sm mb-1">Correcte antwoord(en):</p>
          <p className="text-quiz-green font-bold text-lg">
            {Array.isArray(results.correctAnswer) ? results.correctAnswer.join(', ') : results.correctAnswer}
          </p>
        </div>
      )}

      <div className="w-full max-w-md">
        <p className="text-gray-400 text-sm font-semibold mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Alle spelers
        </p>
        <div className="space-y-2">
          {results.answers?.map((a, i) => {
            const isPartial = !a.isCorrect && a.points > 0;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  a.isCorrect 
                    ? 'bg-quiz-green/10 border-2 border-quiz-green/40' 
                    : isPartial
                    ? 'bg-quiz-yellow/10 border-2 border-quiz-yellow/40'
                    : 'bg-white/5 border-2 border-white/10'
                } ${a.playerName === playerName ? 'ring-2 ring-primary-500 scale-105' : ''}`}
              >
                {a.isCorrect ? (
                  <CheckCircle className="w-5 h-5 text-quiz-green flex-shrink-0" />
                ) : isPartial ? (
                  <Zap className="w-5 h-5 text-quiz-yellow flex-shrink-0" />
                ) : (
                  <X className="w-5 h-5 text-quiz-red flex-shrink-0" />
                )}
                <span className="text-xl">{a.emoji || '😀'}</span>
                <span className={`font-medium flex-1 truncate ${a.playerName === playerName ? 'text-primary-400 font-bold' : ''}`}>
                  {a.playerName}
                </span>
                {a.answer !== null && a.answer !== undefined && (
                  <span className="text-gray-400 text-xs truncate max-w-[100px]">
                    {typeof a.answer === 'number' && results.options ? results.options[a.answer] : String(a.answer)}
                  </span>
                )}
                {(a.isCorrect || isPartial) && a.points > 0 && (
                  <span className={`font-bold text-sm px-2 py-1 rounded ${
                    a.isCorrect 
                      ? 'text-quiz-green bg-quiz-green/20' 
                      : 'text-quiz-yellow bg-quiz-yellow/20'
                  }`}>
                    +{a.points}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
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
            className={`flex items-center gap-3 p-3 rounded-xl ${
              p.name === playerName 
                ? 'bg-primary-600/20 border-2 border-primary-500/40 scale-105' 
                : i === 0 
                ? 'bg-quiz-yellow/10 border-2 border-quiz-yellow/30'
                : 'bg-white/5'
            }`}
          >
            <span className={`w-8 text-center font-bold ${i === 0 ? 'text-quiz-yellow' : 'text-gray-400'}`}>
              {i === 0 ? '🥇' : `#${i + 1}`}
            </span>
            <span className="text-2xl">{p.emoji || '😀'}</span>
            <span className={`flex-1 font-medium ${i === 0 ? 'text-quiz-yellow font-bold' : ''}`}>{p.name}</span>
            <span className={`font-bold ${i === 0 ? 'text-quiz-yellow' : ''}`}>{p.score.toLocaleString()}</span>
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
      <div className="mb-4">
        {myRank === 1 ? (
          <Trophy className="w-16 h-16 text-quiz-yellow" />
        ) : myRank === 2 ? (
          <Award className="w-16 h-16 text-gray-300" />
        ) : myRank === 3 ? (
          <Award className="w-16 h-16 text-orange-400" />
        ) : (
          <Star className="w-16 h-16 text-primary-400" />
        )}
      </div>
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
  const [questionResults, setQuestionResults] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [reconnecting, setReconnecting] = useState(false);
  const [debugInfo, setDebugInfo] = useState({ lastEvent: 'none', eventCount: 0, socketId: '' });
  
  // Use refs to avoid recreating handlers on every render
  const navigateRef = useRef(navigate);
  const gameStateRef = useRef(gameState);
  const questionRef = useRef(question);
  
  navigateRef.current = navigate;
  gameStateRef.current = gameState;
  questionRef.current = question;

  // Load player data on mount
  useEffect(() => {
    const stored = localStorage.getItem('player');
    if (!stored) {
      navigate('/play');
      return;
    }
    setPlayerName(JSON.parse(stored).name);
  }, [navigate]);

  // Rejoin logic – handles page refresh AND mid-game reconnects
  useEffect(() => {
    if (!socket) return;

    const doRejoin = () => {
      const stored = localStorage.getItem('player');
      if (!stored) { navigateRef.current('/play'); return; }
      const { pin, name, emoji } = JSON.parse(stored);
      if (!pin) { navigateRef.current('/play'); return; }
      console.log('[DEBUG Player] Rejoining room', pin, 'socket:', socket.id);
      socket.emit('player:join', { pin, name, emoji }, (res) => {
        console.log('[DEBUG Player] Rejoin response:', res);
        setReconnecting(false);
        if (res.error) {
          localStorage.removeItem('player');
          navigateRef.current('/play');
        }
      });
    };

    // Detect fresh join (just came from PlayerJoin, already in room)
    const isFreshJoin = sessionStorage.getItem('freshJoin');
    sessionStorage.removeItem('freshJoin');

    if (!isFreshJoin && socket.connected) {
      setReconnecting(true);
      doRejoin();
    }

    // Always listen for reconnects
    socket.on('connect', doRejoin);
    return () => socket.off('connect', doRejoin);
  }, [socket]);

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

  // Socket event handlers - registered ONCE, use refs for state
  useEffect(() => {
    if (!socket) return;

    console.log('[DEBUG Player] 🔌 Registering socket event handlers, socket ID:', socket.id);

    const onQuestion = (q) => {
      console.log('[DEBUG Player] ✅ game:question', q?.questionText, '#' + q?.questionNumber);
      setDebugInfo(d => ({ ...d, lastEvent: `Q${q?.questionNumber}`, eventCount: d.eventCount + 1, socketId: socket.id }));
      setQuestion(q);
      setGameState('question');
    };
    
    const onResults = (r) => {
      console.log('[DEBUG Player] ✅ game:question-results', r?.questionText, r?.correctCount + '/' + r?.totalPlayers);
      setDebugInfo(d => ({ ...d, lastEvent: 'results', eventCount: d.eventCount + 1 }));
      setQuestionResults(r);
      setGameState('results');
    };
    
    const onLeaderboard = ({ leaderboard: lb }) => {
      console.log('[DEBUG Player] ✅ game:leaderboard', lb?.length, 'players');
      setDebugInfo(d => ({ ...d, lastEvent: 'leaderboard', eventCount: d.eventCount + 1 }));
      setLeaderboard(lb);
      setGameState('leaderboard');
    };
    
    const onFinished = ({ leaderboard: lb }) => {
      console.log('[DEBUG Player] ✅ game:finished');
      setDebugInfo(d => ({ ...d, lastEvent: 'finished', eventCount: d.eventCount + 1 }));
      setLeaderboard(lb);
      setGameState('finished');
    };
    
    const onPaused = ({ paused }) => {
      console.log('[DEBUG Player] ✅ game:paused', paused);
      setDebugInfo(d => ({ ...d, lastEvent: `pause=${paused}`, eventCount: d.eventCount + 1 }));
      if (paused) {
        setGameState('paused');
      } else {
        // Restore to question state when unpausing
        setGameState('question');
      }
    };
    
    const onHostDisconnected = () => {
      console.log('[DEBUG Player] ❌ Host disconnected');
      alert('De host heeft het spel verlaten');
      navigateRef.current('/play');
    };

    socket.on('game:question', onQuestion);
    socket.on('game:question-results', onResults);
    socket.on('game:leaderboard', onLeaderboard);
    socket.on('game:finished', onFinished);
    socket.on('game:paused', onPaused);
    socket.on('game:host-disconnected', onHostDisconnected);

    console.log('[DEBUG Player] ✓ All event handlers registered');

    return () => {
      console.log('[DEBUG Player] 🔌 Cleaning up event handlers');
      socket.off('game:question', onQuestion);
      socket.off('game:question-results', onResults);
      socket.off('game:leaderboard', onLeaderboard);
      socket.off('game:finished', onFinished);
      socket.off('game:paused', onPaused);
      socket.off('game:host-disconnected', onHostDisconnected);
    };
  }, [socket]);

  const handleAnswer = (answer, onResult) => {
    socket.emit('player:answer', answer, (response) => {
      if (response.error) {
        console.error(response.error);
        return;
      }
      onResult(response);
    });
  };

  const DebugOverlay = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-black/80 text-white text-[10px] p-1 font-mono z-50 flex justify-between">
      <span>state:{gameState}</span>
      <span>evt:{debugInfo.lastEvent}</span>
      <span>#{debugInfo.eventCount}</span>
      <span>sock:{debugInfo.socketId?.slice(-4) || 'none'}</span>
    </div>
  );

  let content;
  if (reconnecting) {
    content = (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
        <Loader2 className="w-12 h-12 text-primary-400 animate-spin mb-4" />
        <p className="text-xl font-bold">Opnieuw verbinden...</p>
      </div>
    );
  } else if (gameState === 'waiting') {
    content = <WaitingScreen playerName={playerName} />;
  } else if (gameState === 'paused') {
    content = <PausedScreen />;
  } else if (gameState === 'question') {
    content = <QuestionView key={question?.questionNumber} question={question} onAnswer={handleAnswer} timeLeft={timeLeft} />;
  } else if (gameState === 'results') {
    content = questionResults
      ? <PlayerResultsView results={questionResults} playerName={playerName} />
      : <WaitingScreen playerName={playerName} />;
  } else if (gameState === 'leaderboard') {
    content = <PlayerLeaderboardView leaderboard={leaderboard} playerName={playerName} />;
  } else if (gameState === 'finished') {
    content = <PlayerFinishedView leaderboard={leaderboard} playerName={playerName} />;
  }

  return <>{content}<DebugOverlay /></>;
}
