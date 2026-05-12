import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { QRCodeSVG } from 'qrcode.react';
import {
  Users, Play, SkipForward, SkipBack, Trophy, BarChart3,
  CheckCircle, X, Clock, Wifi, ArrowLeft, Eye, FileText, ZoomIn,
  Volume2, VolumeX, Pause, Play as PlayIcon, AlertCircle, Zap, Hash
} from 'lucide-react';

// Round Navigation Bar - shown in preview/debug mode
function RoundNavBar({ quizData, currentQuestion, onJump }) {
  if (!quizData?.questions) return null;

  // Build sections: rounds + leaderboards/info slides as anchor points
  const sections = [];
  let lastRound = -1;
  quizData.questions.forEach((q, idx) => {
    if (q.type === 'leaderboard_slide') {
      sections.push({ type: 'leaderboard', index: idx, label: 'Tussenstand', afterRound: q.afterRound });
    } else if (q.type === 'info_slide') {
      // Group consecutive info slides
      const last = sections[sections.length - 1];
      if (last && last.type === 'info' && last.afterRound === q.afterRound) {
        last.endIndex = idx;
        last.count++;
      } else {
        sections.push({ type: 'info', index: idx, endIndex: idx, count: 1, label: 'Info', afterRound: q.afterRound });
      }
    } else if (q.roundNumber > 0 && q.roundNumber !== lastRound) {
      lastRound = q.roundNumber;
      const title = quizData.roundTitles?.[q.roundNumber] || `Ronde ${q.roundNumber}`;
      sections.push({ type: 'round', index: idx, label: title, roundNumber: q.roundNumber });
    }
  });

  const currentIdx = currentQuestion ? (currentQuestion.questionNumber - 1) : -1;

  return (
    <div className="bg-black/40 backdrop-blur-sm border-b border-white/10 px-4 py-2 flex items-center gap-2 overflow-x-auto sticky top-0 z-30">
      <span className="text-xs text-yellow-400 font-bold whitespace-nowrap mr-2">DEBUG:</span>
      {sections.map((s, i) => {
        const isActive = currentIdx >= s.index && (s.endIndex === undefined ? (i === sections.length - 1 || currentIdx < sections[i + 1].index) : currentIdx <= s.endIndex);
        const colors = s.type === 'round' 
          ? (isActive ? 'bg-primary-600 text-white' : 'bg-primary-600/20 text-primary-300 hover:bg-primary-600/40')
          : s.type === 'leaderboard'
          ? (isActive ? 'bg-quiz-yellow text-black' : 'bg-quiz-yellow/20 text-yellow-300 hover:bg-quiz-yellow/40')
          : (isActive ? 'bg-blue-500 text-white' : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/40');
        return (
          <button
            key={i}
            onClick={() => onJump(s.index)}
            className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${colors}`}
            title={`Spring naar slide ${s.index + 1}`}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

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

// Review Modal for manual answer checking
function ReviewModal({ reviews, onReview, onClose }) {
  if (!reviews || reviews.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-400" />
            <h2 className="text-2xl font-bold">Antwoorden beoordelen</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {reviews.map((review, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                {review.playerEmoji?.startsWith('/team-icons/')
                  ? <img src={review.playerEmoji} alt="" className="w-10 h-10 object-contain" />
                  : <span className="text-3xl">{review.playerEmoji || '😀'}</span>}
                <span className="text-xl font-bold">{review.playerName}</span>
              </div>
              
              {review.flaggedAnswers.map((answer, ansIdx) => (
                <div key={ansIdx} className="bg-white/5 rounded-lg p-3 mb-2">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Antwoord speler:</p>
                      <p className="font-bold text-yellow-300">{answer.playerAnswer}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Verwacht antwoord:</p>
                      <p className="font-bold text-green-300">{answer.expectedAnswer}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-yellow-400 h-2 rounded-full transition-all"
                        style={{ width: `${answer.similarity * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{Math.round(answer.similarity * 100)}% match</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onReview(review.playerId, answer.answerIndex, true)}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-bold flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Goedkeuren
                    </button>
                    <button
                      onClick={() => onReview(review.playerId, answer.answerIndex, false)}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-bold flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Afkeuren
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
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

function QuestionScreen({ question, answerCount, totalPlayers, onShowResults, onPrevious, onSkipNext, timeLeft, musicEnabled, onToggleMusic, isPaused, onTogglePause, pendingReviewsCount, onOpenReviews, pin, players, playersLookingAway }) {
  const [showQR, setShowQR] = useState(false);
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

          {/* Content - image first, then text below */}
          <div className="flex-1 flex flex-col items-center justify-center gap-8">
            {question.imageUrl && (
              <div className="relative flex-shrink-0">
                <img
                  src={question.imageUrl?.startsWith('/') ? `${API_BASE}${question.imageUrl}` : question.imageUrl}
                  alt="Info slide"
                  className={`max-h-[50vh] md:max-h-[40rem] max-w-full rounded-2xl object-contain transition-all duration-1000 ease-in-out ${question.animated ? 'animate-breathing' : ''}`}
                />
              </div>
            )}
            <h2 className={`text-2xl md:text-5xl font-bold text-center max-w-4xl leading-tight px-4 ${question.animated ? 'animate-pulse' : ''}`}>
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
          {question.roundTitle && (
            <span className="px-3 py-1 bg-primary-600/30 text-primary-300 rounded-full text-sm font-bold">
              {question.roundTitle}
            </span>
          )}
          {pin && (
            <button
              onClick={() => setShowQR(true)}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-gray-300 rounded-full text-sm font-bold cursor-pointer transition-colors"
              title="Toon QR code"
            >
              PIN: {pin}
            </button>
          )}
          {showQR && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
              onClick={() => setShowQR(false)}
            >
              <div 
                className="bg-white rounded-2xl p-8 max-w-sm w-full text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-2xl font-bold mb-4 text-gray-900">Scan om mee te doen!</h3>
                <div className="bg-white p-4 rounded-xl inline-block mb-4">
                  <QRCodeSVG 
                    value={`${window.location.origin.includes('localhost') ? 'http://192.168.0.169:5173' : window.location.origin}/play?pin=${pin}`} 
                    size={200} 
                    level="M" 
                  />
                </div>
                <p className="text-gray-600 text-lg font-bold">PIN: {pin}</p>
                <button
                  onClick={() => setShowQR(false)}
                  className="mt-4 px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold transition-colors"
                >
                  Sluiten
                </button>
              </div>
            </div>
          )}
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-gray-400">
              <Users className="w-4 h-4" />
              <span>{answerCount} / {totalPlayers}</span>
            </div>
            {players && players.length > 0 && (
              <div className="flex items-center gap-1 max-w-md overflow-x-auto">
                {players.map((player, idx) => {
                  const isLookingAway = playersLookingAway && playersLookingAway.has(player.name);
                  return (
                    <div
                      key={idx}
                      className={`relative flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                        isLookingAway 
                          ? 'bg-yellow-600/30 border border-yellow-500/50 animate-pulse' 
                          : 'bg-white/10 border border-white/20'
                      }`}
                      title={isLookingAway ? `${player.name} kijkt weg!` : player.name}
                    >
                      {isLookingAway && <Eye className="w-3 h-3 text-yellow-400" />}
                      {player.emoji?.startsWith('/team-icons/')
                        ? <img src={player.emoji} alt="" className="w-4 h-4 object-contain" />
                        : <span className="text-sm">{player.emoji || '😀'}</span>}
                      <span className="max-w-[60px] truncate">{player.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
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

function ResultsScreen({ results, onShowLeaderboard, pendingReviews = [], onOpenReviews, onToggleAnswer }) {
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
      <div className="flex items-center gap-4 mb-8">
        <p className="text-gray-400">
          {results.correctCount} / {results.totalPlayers} correct
        </p>
        {pendingReviews.length > 0 && onOpenReviews && (
          <button
            onClick={onOpenReviews}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-bold flex items-center gap-2 animate-pulse"
          >
            <AlertCircle className="w-5 h-5" />
            {pendingReviews.length} te beoordelen
          </button>
        )}
      </div>

      {results.type === 'multiple_choice' && (
        <>
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
          
          {/* Player list with correct/incorrect */}
          <div className="w-full max-w-3xl space-y-2 mb-8">
            <h3 className="text-lg font-bold text-gray-400 mb-3">Spelers</h3>
            {results.answers?.map((a, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${a.isCorrect ? 'bg-quiz-green/10 border border-quiz-green/30' : 'bg-white/5 border border-white/10'}`}>
                {a.isCorrect ? (
                  <CheckCircle className="w-5 h-5 text-quiz-green flex-shrink-0" />
                ) : (
                  <X className="w-5 h-5 text-quiz-red flex-shrink-0" />
                )}
                {a.emoji?.startsWith('/team-icons/')
                  ? <img src={a.emoji} alt="" className="w-7 h-7 object-contain" />
                  : <span className="text-xl">{a.emoji || '😀'}</span>}
                <span className="font-bold flex-1">{a.playerName}</span>
                {a.points > 0 && (
                  <span className="text-quiz-green font-bold">+{a.points}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {results.type === 'free_type' && (
        <div className="w-full max-w-2xl mb-8">
          <div className="bg-quiz-green/20 border-2 border-quiz-green/40 rounded-2xl p-8 mb-6 text-center">
            <p className="text-gray-300 text-sm mb-3 uppercase tracking-wide">Correcte antwoorden</p>
            <p className="text-quiz-green font-black text-3xl">
              {Array.isArray(results.correctAnswer) ? results.correctAnswer.join(', ') : results.correctAnswer}
            </p>
          </div>
          <div className="space-y-3">
            {results.answers?.map((a, i) => {
              const isPartial = !a.isCorrect && a.points > 0;
              const correctAnswers = Array.isArray(results.correctAnswer) 
                ? results.correctAnswer.map(ans => ans.toLowerCase().trim())
                : [String(results.correctAnswer).toLowerCase().trim()];
              
              // Find pending review for this player
              const playerReview = pendingReviews.find(r => r.playerId === a.playerId);
              
              return (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    {a.isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-quiz-green" />
                    ) : isPartial ? (
                      <Zap className="w-5 h-5 text-quiz-yellow" />
                    ) : (
                      <X className="w-5 h-5 text-quiz-red" />
                    )}
                    {/* Team emoji/icon */}
                    {a.emoji?.startsWith('/team-icons/')
                      ? <img src={a.emoji} alt="" className="w-7 h-7 object-contain" />
                      : <span className="text-xl">{a.emoji || '😀'}</span>}
                    <span className="font-bold">{a.playerName}</span>
                    {playerReview && (
                      <span className="px-2 py-0.5 bg-yellow-600/30 text-yellow-300 rounded-full text-xs font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Review nodig
                      </span>
                    )}
                    {a.points > 0 && (
                      <span className={`ml-auto font-bold ${a.isCorrect ? 'text-quiz-green' : 'text-quiz-yellow'}`}>
                        +{a.points}
                      </span>
                    )}
                  </div>
                  
                  {/* Individual answers breakdown with manual correction */}
                  {a.answer && (
                    <div className="ml-8 space-y-2">
                      {String(a.answer).split(',').map((ans, idx) => {
                        const trimmedAns = ans.trim();
                        // Use server-provided matched details if available
                        const matched = a.answerDetails?.matched || [];
                        const isCorrectAnswer = matched.some(m => m.toLowerCase().trim() === trimmedAns.toLowerCase());
                        // Check if this answer needs review (in flagged answers)
                        const needsReview = playerReview?.flaggedAnswers?.some(
                          f => f.playerAnswer.toLowerCase().trim() === trimmedAns.toLowerCase()
                        );
                        
                        return (
                          <div key={idx} className={`flex items-center gap-2 text-sm rounded-lg p-2 ${needsReview ? 'bg-yellow-600/10 border border-yellow-600/30' : ''}`}>
                            {isCorrectAnswer ? (
                              <CheckCircle className="w-4 h-4 text-quiz-green flex-shrink-0" />
                            ) : needsReview ? (
                              <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                            ) : (
                              <X className="w-4 h-4 text-quiz-red flex-shrink-0" />
                            )}
                            <span className={`flex-1 ${isCorrectAnswer ? 'text-quiz-green' : needsReview ? 'text-yellow-300' : 'text-gray-400'}`}>
                              {trimmedAns}
                              {needsReview && (
                                <span className="ml-2 text-xs text-yellow-500">
                                  (lijkt op "{playerReview.flaggedAnswers.find(f => f.playerAnswer.toLowerCase().trim() === trimmedAns.toLowerCase())?.expectedAnswer}")
                                </span>
                              )}
                            </span>
                            {/* Manual correction toggle button */}
                            {onToggleAnswer && (
                              <button
                                onClick={() => onToggleAnswer(a.playerId, trimmedAns, !isCorrectAnswer)}
                                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                                  isCorrectAnswer 
                                    ? 'bg-quiz-red/20 hover:bg-quiz-red/40 text-quiz-red' 
                                    : 'bg-quiz-green/20 hover:bg-quiz-green/40 text-quiz-green'
                                }`}
                                title={isCorrectAnswer ? 'Markeer als fout' : 'Markeer als correct'}
                              >
                                {isCorrectAnswer ? '✗ Markeer fout' : '✓ Markeer correct'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
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

function BatchResultsScreen({ batchResults, onShowLeaderboard, onToggleAnswer }) {
  const API_BASE = import.meta.env.VITE_API_URL || '';
  
  // Calculate total points for this round
  const totalRoundPoints = batchResults.results.reduce((sum, result) => {
    const questionPoints = result.answers?.reduce((qSum, a) => qSum + (a.points || 0), 0) || 0;
    return sum + questionPoints;
  }, 0);
  
  const totalCorrect = batchResults.results.reduce((sum, result) => sum + (result.correctCount || 0), 0);
  const totalQuestions = batchResults.results.length * (batchResults.results[0]?.totalPlayers || 0);
  
  // Collect all pending reviews from all questions in this batch
  const allPendingReviews = batchResults.pendingReviews || [];
  
  return (
    <div className="min-h-screen flex flex-col items-center p-6 md:p-10 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-black mb-2">{batchResults.roundTitle}</h2>
          <div className="flex items-center justify-center gap-6 text-lg mb-4">
            <p className="text-gray-400">
              {totalCorrect} / {totalQuestions} correct
            </p>
            <div className="flex items-center gap-2 text-quiz-yellow">
              <Zap className="w-5 h-5" />
              <span className="font-bold">{totalRoundPoints} punten</span>
            </div>
          </div>
          {allPendingReviews.length > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600/30 text-yellow-300 rounded-lg text-sm font-bold">
              <AlertCircle className="w-4 h-4" />
              {allPendingReviews.length} antwoord{allPendingReviews.length !== 1 ? 'en' : ''} te beoordelen
            </div>
          )}
        </div>

        <div className="space-y-8 mb-8">
          {batchResults.results.map((result, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Vraag {result.questionNumber}: {result.questionText}</h3>
                <div className="text-sm text-gray-400">
                  {result.correctCount} / {result.totalPlayers} correct
                </div>
              </div>

              {/* Correct answer display - same style as ResultsScreen */}
              <div className="bg-quiz-green/20 border-2 border-quiz-green/40 rounded-2xl p-6 mb-6 text-center">
                <p className="text-gray-300 text-xs mb-2 uppercase tracking-wide">Correcte antwoorden</p>
                <p className="text-quiz-green font-black text-2xl">
                  {Array.isArray(result.correctAnswer) 
                    ? result.correctAnswer.join(', ') 
                    : result.options?.[result.correctAnswer] ?? result.correctAnswer}
                </p>
              </div>

              {/* Player answers - match ResultsScreen styling */}
              {result.type === 'free_type' ? (
                <div className="space-y-3">
                  {result.answers?.map((a, i) => {
                    const isPartial = !a.isCorrect && a.points > 0;
                    const hasAnswered = a.answer !== null && a.answer !== undefined;
                    const isTeamIcon = a.emoji?.startsWith('/team-icons/');
                    
                    // Find pending review for this player in this question
                    const playerReview = allPendingReviews.find(
                      r => r.playerId === a.playerId && r.questionIndex === result.questionIndex
                    );
                    
                    return (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          {a.isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-quiz-green" />
                          ) : isPartial ? (
                            <Zap className="w-5 h-5 text-quiz-yellow" />
                          ) : (
                            <X className="w-5 h-5 text-quiz-red" />
                          )}
                          {isTeamIcon ? (
                            <img src={`${API_BASE}${a.emoji}`} alt="team" className="w-7 h-7 object-contain" />
                          ) : (
                            <span className="text-xl">{a.emoji || '😀'}</span>
                          )}
                          <span className="font-bold">{a.playerName}</span>
                          {playerReview && (
                            <span className="px-2 py-0.5 bg-yellow-600/30 text-yellow-300 rounded-full text-xs font-bold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Review nodig
                            </span>
                          )}
                          {a.points > 0 && (
                            <span className={`ml-auto font-bold ${a.isCorrect ? 'text-quiz-green' : 'text-quiz-yellow'}`}>
                              +{a.points}
                            </span>
                          )}
                        </div>
                        
                        {/* Individual answers breakdown - match ResultsScreen */}
                        {hasAnswered && a.answer && (
                          <div className="ml-8 space-y-2">
                            {String(a.answer).split(',').map((ans, ansIdx) => {
                              const trimmedAns = ans.trim();
                              const matched = a.answerDetails?.matched || [];
                              const isCorrectAnswer = matched.some(m => m.toLowerCase().trim() === trimmedAns.toLowerCase());
                              
                              // Check if this specific answer needs review
                              const needsReview = playerReview?.flaggedAnswers?.some(
                                f => f.playerAnswer.toLowerCase().trim() === trimmedAns.toLowerCase()
                              );
                              
                              return (
                                <div key={ansIdx} className={`flex items-center gap-2 text-sm rounded-lg p-2 ${needsReview ? 'bg-yellow-600/10 border border-yellow-600/30' : ''}`}>
                                  {isCorrectAnswer ? (
                                    <CheckCircle className="w-4 h-4 text-quiz-green flex-shrink-0" />
                                  ) : needsReview ? (
                                    <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                                  ) : (
                                    <X className="w-4 h-4 text-quiz-red flex-shrink-0" />
                                  )}
                                  <span className={`flex-1 ${isCorrectAnswer ? 'text-quiz-green' : needsReview ? 'text-yellow-300' : 'text-gray-400'}`}>
                                    {trimmedAns}
                                    {needsReview && (
                                      <span className="ml-2 text-xs text-yellow-500">
                                        (lijkt op "{playerReview.flaggedAnswers.find(f => f.playerAnswer.toLowerCase().trim() === trimmedAns.toLowerCase())?.expectedAnswer}")
                                      </span>
                                    )}
                                  </span>
                                  {/* Manual correction toggle - same as ResultsScreen */}
                                  {onToggleAnswer && (
                                    <button
                                      onClick={() => onToggleAnswer(a.playerId, trimmedAns, !isCorrectAnswer, result.questionIndex)}
                                      className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                                        isCorrectAnswer 
                                          ? 'bg-quiz-red/20 hover:bg-quiz-red/40 text-quiz-red' 
                                          : 'bg-quiz-green/20 hover:bg-quiz-green/40 text-quiz-green'
                                      }`}
                                      title={isCorrectAnswer ? 'Markeer als fout' : 'Markeer als correct'}
                                    >
                                      {isCorrectAnswer ? '✗ Markeer fout' : '✓ Markeer correct'}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {!hasAnswered && (
                          <div className="ml-8 text-sm text-gray-500 italic">Geen antwoord</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="text-lg font-bold text-gray-400 mb-3">Spelers</h4>
                  {result.answers?.map((a, i) => {
                    const isTeamIcon = a.emoji?.startsWith('/team-icons/');
                    return (
                      <div 
                        key={i} 
                        className={`flex items-center gap-3 p-3 rounded-xl ${
                          a.isCorrect ? 'bg-quiz-green/10 border border-quiz-green/30' : 'bg-white/5 border border-white/10'
                        }`}
                      >
                        {a.isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-quiz-green flex-shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-quiz-red flex-shrink-0" />
                        )}
                        {isTeamIcon ? (
                          <img src={`${API_BASE}${a.emoji}`} alt="team" className="w-7 h-7 object-contain" />
                        ) : (
                          <span className="text-xl">{a.emoji || '😀'}</span>
                        )}
                        <span className="font-bold flex-1">{a.playerName}</span>
                        {a.points > 0 && (
                          <span className="text-quiz-green font-bold">+{a.points}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={onShowLeaderboard}
            className="px-8 py-4 bg-primary-600 hover:bg-primary-700 rounded-2xl text-xl font-bold transition-colors flex items-center gap-3"
          >
            <SkipForward className="w-6 h-6" />
            Volgende
          </button>
        </div>
      </div>
    </div>
  );
}

function LeaderboardScreen({ leaderboard, onNext, onPrevious, isLast }) {
  const medals = ['🥇', '🥈', '🥉'];

  // Podium: top 3 players
  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 md:p-10 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
      <Trophy className="w-16 h-16 text-quiz-yellow mb-4" />
      <h2 className="text-4xl font-black mb-6">Tussenstand</h2>

      {/* Podium visualization */}
      {top3.length > 0 && (
        <div className="flex items-end justify-center gap-4 mb-6 w-full max-w-2xl">
          {/* Render in podium order: 2nd, 1st, 3rd */}
          {[top3[1], top3[0], top3[2]].filter(Boolean).map((player) => {
            const realIdx = top3.indexOf(player);
            const podiumStyle = realIdx === 0 
              ? { height: 'h-44', color: 'bg-quiz-yellow/20 border-quiz-yellow/50', textColor: 'text-quiz-yellow' }
              : realIdx === 1
              ? { height: 'h-32', color: 'bg-gray-300/20 border-gray-300/40', textColor: 'text-gray-200' }
              : { height: 'h-24', color: 'bg-orange-400/20 border-orange-400/40', textColor: 'text-orange-300' };
            const medals = ['🥇', '🥈', '🥉'];

            return (
              <div key={player.id} className="flex flex-col items-center w-32">
                {/* Equal-sized icons */}
                <div className="w-16 h-16 flex items-center justify-center mb-2">
                  {player.emoji?.startsWith('/team-icons/')
                    ? <img src={player.emoji} alt="" className="w-16 h-16 object-contain" />
                    : <span className="text-5xl">{player.emoji || '😀'}</span>}
                </div>
                <span className={`${podiumStyle.textColor} font-bold mb-2 text-center truncate w-full`}>{player.name}</span>
                <div className={`w-full ${podiumStyle.height} ${podiumStyle.color} border-2 rounded-t-2xl flex flex-col items-center justify-center`}>
                  <span className="text-3xl mb-1">{medals[realIdx]}</span>
                  <span className="font-black text-xl">{player.score.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
  const [pendingReviews, setPendingReviews] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [batchResults, setBatchResults] = useState(null);
  const [quizData, setQuizData] = useState(null); // Full quiz for round navigation
  const [previewMode, setPreviewMode] = useState(false); // True if started without players
  const [antiCheatAlert, setAntiCheatAlert] = useState(null); // { playerName, type }
  const [playersLookingAway, setPlayersLookingAway] = useState(new Set()); // Set of player names looking away
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
      audioRef.current.play().catch((err) => {
        console.warn('[Audio] Play failed:', err.message);
        // Browser blocked autoplay - user needs to interact first
      });
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

    socket.on('game:pending-reviews', ({ reviews }) => {
      setPendingReviews(reviews);
    });

    socket.on('game:score-updated', ({ playerId, newScore }) => {
      // Update leaderboard if visible
      setLeaderboard(prev => prev.map(p => 
        p.id === playerId ? { ...p, score: newScore } : p
      ));
    });

    socket.on('game:question-results', (r) => {
      setResults(r);
      setGameState('results');
    });

    socket.on('game:results-updated', (r) => {
      setResults(r);
    });

    socket.on('game:batch-results', (br) => {
      setBatchResults(br);
      setGameState('batch-results');
    });

    socket.on('game:batch-results-updated', (br) => {
      setBatchResults(br);
    });

    // Anti-cheat alerts
    socket.on('game:player-tab-hidden', ({ playerName }) => {
      setAntiCheatAlert({ playerName, type: 'tab-hidden' });
      setPlayersLookingAway(prev => new Set(prev).add(playerName));
      setTimeout(() => setAntiCheatAlert(null), 3000);
    });

    socket.on('game:player-tab-visible', ({ playerName }) => {
      setPlayersLookingAway(prev => {
        const newSet = new Set(prev);
        newSet.delete(playerName);
        return newSet;
      });
    });

    socket.on('game:player-window-blur', ({ playerName }) => {
      setAntiCheatAlert({ playerName, type: 'window-blur' });
      setPlayersLookingAway(prev => new Set(prev).add(playerName));
      setTimeout(() => setAntiCheatAlert(null), 3000);
    });

    socket.on('game:player-window-focus', ({ playerName }) => {
      setPlayersLookingAway(prev => {
        const newSet = new Set(prev);
        newSet.delete(playerName);
        return newSet;
      });
    });

    return () => {
      socket.off('game:player-joined');
      socket.off('game:player-left');
      socket.off('game:answer-count');
      socket.off('game:pending-reviews');
      socket.off('game:score-updated');
      socket.off('game:question-results');
      socket.off('game:results-updated');
      socket.off('game:batch-results');
      socket.off('game:batch-results-updated');
      socket.off('game:player-tab-hidden');
      socket.off('game:player-tab-visible');
      socket.off('game:player-window-blur');
      socket.off('game:player-window-focus');
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

    // Also fetch full quiz data for round navigation
    const API_BASE = import.meta.env.VITE_API_URL || '';
    fetch(`${API_BASE}/api/quizzes/${id}`)
      .then(r => r.json())
      .then(data => setQuizData(data))
      .catch(() => {});
  }, [socket, connected, id, navigate]);

  const jumpToQuestion = useCallback((questionIndex) => {
    if (!socket) return;
    socket.emit('host:jump-to-question', { questionIndex }, (response) => {
      if (response.error) {
        alert(response.error);
        return;
      }
      if (response.state === 'question') {
        setCurrentQuestion(response.question);
        setCurrentQuestionNum(response.question.questionNumber);
        setGameState('question');
      } else if (response.state === 'leaderboard') {
        setLeaderboard(response.leaderboard);
        setGameState('leaderboard');
      }
    });
  }, [socket]);

  const startGame = useCallback(() => {
    // Detect preview mode (no players)
    if (players.length === 0) setPreviewMode(true);
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
  }, [socket, players.length]);

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

  const handleToggleAnswer = useCallback((playerId, answerText, markCorrect, questionIndex = null) => {
    socket.emit('host:toggle-answer', { playerId, answerText, markCorrect, questionIndex }, (response) => {
      if (response.error) {
        console.error('Toggle error:', response.error);
        return;
      }
      // If in batch-results state, manually update the batch results
      if (questionIndex !== null && batchResults) {
        setBatchResults(prev => {
          const updated = { ...prev };
          updated.results = prev.results.map(result => {
            if (result.questionIndex === questionIndex) {
              // Update the specific answer
              const updatedAnswers = result.answers.map(a => {
                if (a.playerId === playerId) {
                  return {
                    ...a,
                    points: response.points,
                    isCorrect: response.isCorrect,
                    answerDetails: {
                      matched: response.matched || [],
                      unmatched: response.unmatched || []
                    }
                  };
                }
                return a;
              });
              // Recalculate correctCount
              const correctCount = updatedAnswers.filter(a => a.isCorrect).length;
              return { ...result, answers: updatedAnswers, correctCount };
            }
            return result;
          });
          return updated;
        });
      }
      // Results will be updated via socket event for normal results screen
    });
  }, [socket, batchResults]);

  const handleReview = useCallback((playerId, answerIndex, approved) => {
    socket.emit('host:review-answer', { playerId, answerIndex, approved }, (response) => {
      if (response.error) {
        console.error('Review error:', response.error);
        return;
      }
      // Update pending reviews
      setPendingReviews(prev => {
        const updated = prev.map(r => {
          if (r.playerId === playerId) {
            return {
              ...r,
              flaggedAnswers: r.flaggedAnswers.filter(a => a.answerIndex !== answerIndex)
            };
          }
          return r;
        }).filter(r => r.flaggedAnswers.length > 0);
        
        // Close modal if no more reviews
        if (updated.length === 0) {
          setShowReviewModal(false);
        }
        return updated;
      });
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
      // Server returns different types:
      // - 'results': normal flow, show results screen
      // - 'auto-next': delayed results, server auto-advances to next question (do nothing here)
      // - 'batch-results': delayed results last question, server emits batch-results event
      if (r?.type === 'results' && r.results) {
        setResults(r.results);
        setGameState('results');
      }
      // For 'auto-next' and 'batch-results', the server emits proper events
      // that are handled by the existing socket.on listeners
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

  const navBar = previewMode ? <RoundNavBar quizData={quizData} currentQuestion={currentQuestion} onJump={jumpToQuestion} /> : null;

  if (gameState === 'question') {
    return (
      <>
        {antiCheatAlert && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-600/90 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-3 animate-bounce-in shadow-lg">
            <Eye className="w-5 h-5" />
            <span>{antiCheatAlert.playerName} kijkt even weg... 👀</span>
          </div>
        )}
        {navBar}
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
          pendingReviewsCount={pendingReviews.length}
          onOpenReviews={() => setShowReviewModal(true)}
          pin={pin}
          players={players}
          playersLookingAway={playersLookingAway}
        />
        {showReviewModal && (
          <ReviewModal
            reviews={pendingReviews}
            onReview={handleReview}
            onClose={() => setShowReviewModal(false)}
          />
        )}
      </>
    );
  }

  if (gameState === 'results') {
    return (
      <>
        {antiCheatAlert && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-600/90 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-3 animate-bounce-in shadow-lg">
            <Eye className="w-5 h-5" />
            <span>{antiCheatAlert.playerName} kijkt even weg... 👀</span>
          </div>
        )}
        {navBar}
        <ResultsScreen 
          results={results} 
          onShowLeaderboard={nextQuestion}
          pendingReviews={pendingReviews}
          onOpenReviews={() => setShowReviewModal(true)}
          onToggleAnswer={handleToggleAnswer}
        />
        {showReviewModal && (
          <ReviewModal
            reviews={pendingReviews}
            onReview={handleReview}
            onClose={() => setShowReviewModal(false)}
          />
        )}
      </>
    );
  }

  if (gameState === 'batch-results') {
    return (
      <>
        {antiCheatAlert && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-600/90 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-3 animate-bounce-in shadow-lg">
            <Eye className="w-5 h-5" />
            <span>{antiCheatAlert.playerName} kijkt even weg... 👀</span>
          </div>
        )}
        {navBar}
        <BatchResultsScreen 
          batchResults={batchResults}
          onShowLeaderboard={nextQuestion}
          onToggleAnswer={handleToggleAnswer}
        />
      </>
    );
  }

  if (gameState === 'leaderboard') {
    return (
      <>
        {antiCheatAlert && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-600/90 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-3 animate-bounce-in shadow-lg">
            <Eye className="w-5 h-5" />
            <span>{antiCheatAlert.playerName} kijkt even weg... 👀</span>
          </div>
        )}
        {navBar}
        <LeaderboardScreen
          leaderboard={leaderboard}
          onNext={nextQuestion}
          onPrevious={previousQuestion}
          isLast={currentQuestionNum >= totalQuestions}
        />
      </>
    );
  }

  if (gameState === 'finished') {
    return (
      <>
        {antiCheatAlert && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-600/90 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-3 animate-bounce-in shadow-lg">
            <Eye className="w-5 h-5" />
            <span>{antiCheatAlert.playerName} kijkt even weg... 👀</span>
          </div>
        )}
        <FinishedScreen leaderboard={leaderboard} />
      </>
    );
  }

  return null;
}
