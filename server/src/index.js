import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import quizRoutes from './routes/quiz.js';
import uploadRoutes from './routes/upload.js';
import { GameManager } from './game/GameManager.js';
import { getQuiz } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Serve static client build
app.use(express.static(path.join(__dirname, '..', '..', 'client', 'dist')));

// API routes
app.use('/api/quizzes', quizRoutes);
app.use('/api/upload', uploadRoutes);

// Catch-all for SPA
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || req.path.startsWith('/socket.io')) return;
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'dist', 'index.html'));
});

const gameManager = new GameManager();

// Helper: handle results flow (respects delayed results)
function handleShowResults(session, hostSocketId) {
  if (session.timer) clearTimeout(session.timer);
  
  const currentQ = session.quiz.questions[session.currentQuestionIndex];
  const roundNumber = currentQ?.roundNumber;
  const shouldDelay = session.shouldDelayResults(roundNumber);
  const isLastInRound = session.isLastQuestionInRound(session.currentQuestionIndex);

  console.log('[DEBUG] handleShowResults - Round:', roundNumber, 'shouldDelay:', shouldDelay, 'isLastInRound:', isLastInRound);

  const results = session.getQuestionResults();

  if (shouldDelay) {
    session.delayedResults.push({
      questionIndex: session.currentQuestionIndex,
      results: results
    });

    if (isLastInRound) {
      // Last question in round - show batch results to everyone
      session.state = 'batch-results';
      const batchResults = {
        type: 'batch-results',
        roundNumber: roundNumber,
        roundTitle: session.quiz.roundTitles?.[roundNumber] || `Ronde ${roundNumber}`,
        results: session.delayedResults.map(dr => dr.results),
        pendingReviews: session.pendingReviews || []
      };
      session.delayedResults = [];
      console.log('[DEBUG] Last question in delayed round - showing batch results');
      io.to(`game:${session.pin}`).emit('game:batch-results', batchResults);
      return { type: 'batch-results', batchResults };
    } else {
      // Not last question - skip results and go directly to next question
      console.log('[DEBUG] Delayed results - skipping to next question automatically');
      const nextState = session.nextQuestion();
      
      if (nextState.state === 'question') {
        io.to(`game:${session.pin}`).emit('game:question', nextState.question);
        // Set timer for new question if not info_slide
        if (nextState.question.type !== 'info_slide') {
          const timeLimit = (nextState.question.timeLimit || 20) * 1000;
          session.timer = setTimeout(() => {
            if (session.state === 'question' && !session.paused) {
              handleShowResults(session, hostSocketId);
            }
          }, timeLimit + 1000);
        }
      } else if (nextState.state === 'leaderboard') {
        io.to(`game:${session.pin}`).emit('game:leaderboard', { leaderboard: nextState.leaderboard });
      } else if (nextState.state === 'finished') {
        io.to(`game:${session.pin}`).emit('game:finished', { leaderboard: nextState.leaderboard });
      }
      
      return { type: 'auto-next', nextState };
    }
  } else {
    session.state = 'results';
    console.log('[DEBUG] Emitting game:question-results to room game:' + session.pin);
    io.to(`game:${session.pin}`).emit('game:question-results', results);
    return { type: 'results', results };
  }
}

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // HOST: Create game session
  socket.on('host:create', async ({ quizId }, callback) => {
    console.log('[DEBUG] host:create for quizId:', quizId);
    try {
      const { getQuiz } = await import('./database.js');
      const quiz = await getQuiz(quizId);
      if (!quiz) {
        console.log('[DEBUG] Quiz not found');
        return callback({ error: 'Quiz not found' });
      }
      console.log('[DEBUG] Quiz loaded:', quiz.title, 'questions:', quiz.questions?.length);
      console.log('[DEBUG] round_settings from DB:', JSON.stringify(quiz.round_settings));
      console.log('[DEBUG] roundSettings from DB:', JSON.stringify(quiz.roundSettings));
      console.log('[DEBUG] ALL question roundNumbers:');
      quiz.questions?.forEach((q, i) => {
        console.log(`  Q${i+1}: "${q.questionText?.substring(0, 40)}" - Round: ${q.roundNumber}, Type: ${q.type}`);
      });
      const session = gameManager.createSession(quiz, socket.id);
      socket.join(`game:${session.pin}`);
      console.log(`[Game] Created session ${session.pin} for quiz "${quiz.title}"`);

      callback({
        pin: session.pin,
        quizId: quizId,
        quizTitle: quiz.title,
        totalQuestions: quiz.questions.length,
      });
    } catch (err) {
      console.error('[DEBUG] host:create error:', err);
      callback({ error: err.message });
    }
  });

  // PLAYER: Join game (also handles rejoin mid-game)
  socket.on('player:join', ({ pin, name, emoji }, callback) => {
    console.log(`[DEBUG] player:join attempt - pin: ${pin}, name: ${name}, socket: ${socket.id}`);
    const session = gameManager.getSession(pin);
    if (!session) {
      console.log(`[DEBUG] Session not found for pin ${pin}`);
      return callback({ error: 'Game niet gevonden' });
    }

    const result = session.addPlayer(socket.id, name, emoji);
    if (result.error) {
      console.log(`[DEBUG] addPlayer error: ${result.error}, session state: ${session.state}`);
      return callback({ error: result.error });
    }

    gameManager.socketToSession.set(socket.id, pin);
    socket.join(`game:${pin}`);
    console.log(`[DEBUG] Socket ${socket.id} joined room game:${pin}`);

    if (result.rejoined) {
      console.log(`[Game] ${name} rejoined game ${pin} (state: ${session.state})`);
      callback({ ...result, state: session.state });

      // Re-send current game state so player screen updates immediately
      console.log(`[DEBUG] Re-sending state ${session.state} to rejoined player`);
      if (session.state === 'question') {
        const currentQ = session.getCurrentQuestion();
        console.log(`[DEBUG] Sending question:`, currentQ?.questionText);
        socket.emit('game:question', currentQ);
      } else if (session.state === 'leaderboard') {
        socket.emit('game:leaderboard', { leaderboard: session.getLeaderboard() });
      } else if (session.state === 'results') {
        socket.emit('game:question-results', session.getQuestionResults());
      } else if (session.state === 'finished') {
        socket.emit('game:finished', { leaderboard: session.getLeaderboard() });
      }
    } else {
      console.log(`[Game] ${name} (${emoji}) joined game ${pin} (fresh join)`);
      io.to(session.hostSocketId).emit('game:player-joined', {
        players: session.getPlayers()
      });
      callback(result);

      // Broadcast updated taken icons to all players in lobby
      const takenIcons = session.getPlayers().map(p => p.emoji);
      io.to(`game:${pin}`).emit('game:taken-icons', takenIcons);
    }
  });

  // PLAYER: Get taken icons for a game
  socket.on('player:get-taken-icons', (pin) => {
    const session = gameManager.getSession(pin);
    if (!session) return;

    const takenIcons = session.getPlayers().map(p => p.emoji);
    socket.emit('game:taken-icons', takenIcons);
  });

  // HOST: Start the game (first question)
  socket.on('host:start', (callback) => {
    const session = gameManager.getSessionBySocket(socket.id);
    if (!session) return callback({ error: 'No active session' });

    const result = session.nextQuestion();
    
    if (result.state === 'question') {
      io.to(`game:${session.pin}`).emit('game:question', result.question);
      
      // Info slides have no timer — host manually advances
      if (result.question.type !== 'info_slide') {
        const timeLimit = (result.question.timeLimit || 20) * 1000;
        session.timer = setTimeout(() => {
          if (session.state === 'question' && !session.paused) {
            handleShowResults(session, session.hostSocketId);
          }
        }, timeLimit + 1000);
      }
    } else if (result.state === 'leaderboard') {
      io.to(`game:${session.pin}`).emit('game:leaderboard', { leaderboard: result.leaderboard });
    } else if (result.state === 'finished') {
      io.to(`game:${session.pin}`).emit('game:finished', {
        leaderboard: result.leaderboard
      });
    }

    callback(result);
  });

  // HOST: Next question
  socket.on('host:next', (callback) => {
    console.log('[DEBUG] host:next received');
    const session = gameManager.getSessionBySocket(socket.id);
    if (!session) return callback({ error: 'No active session' });

    console.log('[DEBUG] Session found, pin:', session.pin, 'players in room:', session.players.size);
    if (session.timer) clearTimeout(session.timer);

    // If currently in question state with delayed results, handle results first
    if (session.state === 'question') {
      const currentQ = session.quiz.questions[session.currentQuestionIndex];
      const roundNumber = currentQ?.roundNumber;
      const shouldDelay = session.shouldDelayResults(roundNumber);
      const isLastInRound = session.isLastQuestionInRound(session.currentQuestionIndex);

      console.log('[DEBUG] host:next - Round:', roundNumber, 'shouldDelay:', shouldDelay, 'isLastInRound:', isLastInRound);

      if (shouldDelay) {
        // Store results for delayed display
        const results = session.getQuestionResults();
        session.delayedResults.push({
          questionIndex: session.currentQuestionIndex,
          results: results
        });

        if (isLastInRound) {
          // Last question - show batch results
          session.state = 'batch-results';
          const batchResults = {
            type: 'batch-results',
            roundNumber: roundNumber,
            roundTitle: session.quiz.roundTitles?.[roundNumber] || `Ronde ${roundNumber}`,
            results: session.delayedResults.map(dr => dr.results),
            pendingReviews: session.pendingReviews || []
          };
          session.delayedResults = [];
          console.log('[DEBUG] host:next - showing batch results for round', roundNumber);
          io.to(`game:${session.pin}`).emit('game:batch-results', batchResults);
          return callback({ state: 'batch-results', batchResults });
        }
        // Otherwise, continue to next question (results stored)
      }
    }

    const result = session.nextQuestion();
    console.log('[DEBUG] nextQuestion result:', result.state);

    // Check if the NEXT question is in a delayed results round
    if (result.state === 'question' && result.question) {
      const nextRoundNumber = result.question.roundNumber;
      const nextShouldDelay = session.shouldDelayResults(nextRoundNumber);
      console.log('[DEBUG] host:next - Next question round:', nextRoundNumber, 'shouldDelay:', nextShouldDelay);
      
      if (nextShouldDelay && session.delayedResults.length === 0) {
        // Entering a delayed results round - start tracking
        console.log('[DEBUG] host:next - Entering delayed results round', nextRoundNumber);
      }
    }

    if (result.state === 'question') {
      console.log('[DEBUG] Emitting game:question to room game:' + session.pin);
      console.log('[DEBUG] Question:', result.question?.questionText);
      io.to(`game:${session.pin}`).emit('game:question', result.question);

      // Send leaderboard with updated scores to all players
      const leaderboard = session.getLeaderboard();
      io.to(`game:${session.pin}`).emit('game:leaderboard', { leaderboard });

      // Info slides have no timer — host manually advances
      if (result.question.type !== 'info_slide') {
        const timeLimit = (result.question.timeLimit || 20) * 1000;
        session.timer = setTimeout(() => {
          if (session.state === 'question' && !session.paused) {
            handleShowResults(session, session.hostSocketId);
          }
        }, timeLimit + 1000);
      }
    } else if (result.state === 'leaderboard') {
      console.log('[DEBUG] Emitting game:leaderboard to room game:' + session.pin);
      io.to(`game:${session.pin}`).emit('game:leaderboard', { leaderboard: result.leaderboard });
    } else if (result.state === 'finished') {
      console.log('[DEBUG] Emitting game:finished to room game:' + session.pin);
      io.to(`game:${session.pin}`).emit('game:finished', {
        leaderboard: result.leaderboard
      });
    }

    callback(result);
  });

  // HOST: Previous question
  socket.on('host:previous', (callback) => {
    const session = gameManager.getSessionBySocket(socket.id);
    if (!session) return callback({ error: 'No active session' });

    if (session.timer) clearTimeout(session.timer);

    const result = session.previousQuestion();

    if (result.state === 'question') {
      io.to(`game:${session.pin}`).emit('game:question', result.question);

      // Send leaderboard with updated scores to all players
      const leaderboard = session.getLeaderboard();
      io.to(`game:${session.pin}`).emit('game:leaderboard', { leaderboard });

      if (result.question.type !== 'info_slide') {
        const timeLimit = (result.question.timeLimit || 20) * 1000;
        session.timer = setTimeout(() => {
          if (session.state === 'question' && !session.paused) {
            handleShowResults(session, session.hostSocketId);
          }
        }, timeLimit + 1000);
      }
    } else if (result.state === 'leaderboard') {
      io.to(`game:${session.pin}`).emit('game:leaderboard', { leaderboard: result.leaderboard });
    }

    callback(result);
  });

  // HOST: Show results for current question
  socket.on('host:show-results', (callback) => {
    console.log('[DEBUG] host:show-results received');
    const session = gameManager.getSessionBySocket(socket.id);
    if (!session) {
      console.log('[DEBUG] No session found for host:show-results');
      return callback({ error: 'No active session' });
    }

    const result = handleShowResults(session, session.hostSocketId);
    callback(result);
  });

  // HOST: Jump to specific question (debug/preview mode)
  socket.on('host:jump-to-question', ({ questionIndex }, callback) => {
    console.log('[DEBUG] host:jump-to-question:', questionIndex);
    const session = gameManager.getSessionBySocket(socket.id);
    if (!session) return callback({ error: 'No active session' });

    if (session.timer) clearTimeout(session.timer);

    const result = session.jumpToQuestion(questionIndex);
    if (result.error) return callback(result);

    if (result.state === 'question') {
      io.to(`game:${session.pin}`).emit('game:question', result.question);

      // Send leaderboard with updated scores to all players
      const leaderboard = session.getLeaderboard();
      io.to(`game:${session.pin}`).emit('game:leaderboard', { leaderboard });

      if (result.question.type !== 'info_slide') {
        const timeLimit = (result.question.timeLimit || 20) * 1000;
        session.timer = setTimeout(() => {
          if (session.state === 'question' && !session.paused) {
            handleShowResults(session, session.hostSocketId);
          }
        }, timeLimit + 1000);
      }
    } else if (result.state === 'leaderboard') {
      io.to(`game:${session.pin}`).emit('game:leaderboard', { leaderboard: result.leaderboard });
    }

    callback(result);
  });

  // HOST: Show leaderboard
  socket.on('host:show-leaderboard', (callback) => {
    const session = gameManager.getSessionBySocket(socket.id);
    if (!session) return callback({ error: 'No active session' });

    session.state = 'leaderboard';
    const leaderboard = session.getLeaderboard();
    io.to(`game:${session.pin}`).emit('game:leaderboard', { leaderboard });
    callback({ leaderboard });
  });

  // HOST: Toggle pause
  socket.on('host:toggle-pause', ({ paused }, callback) => {
    const session = gameManager.getSessionBySocket(socket.id);
    if (!session) return callback({ error: 'No active session' });

    session.paused = paused;

    if (paused) {
      if (session.timer) {
        clearTimeout(session.timer);
        session.pausedTimer = session.timer;
        session.timer = null;
      }
    } else {
      if (session.pausedTimer && session.state === 'question') {
        const q = session.getCurrentQuestion();
        const remainingTime = session.questionStartTime + (q?.timeLimit || 20) * 1000 - Date.now();
        if (remainingTime > 0) {
          session.timer = setTimeout(() => {
            if (session.state === 'question' && !session.paused) {
              handleShowResults(session, session.hostSocketId);
            }
          }, remainingTime);
        }
        session.pausedTimer = null;
      }
    }

    io.to(`game:${session.pin}`).emit('game:paused', { paused });
    callback({ paused });
  });

  // HOST: Get pending reviews
  socket.on('host:get-pending-reviews', (callback) => {
    const session = gameManager.getSessionBySocket(socket.id);
    if (!session) return callback({ error: 'No active session' });

    const reviews = session.getPendingReviews();
    callback({ reviews });
  });

  // HOST: Toggle individual answer correctness on results screen
  socket.on('host:toggle-answer', ({ playerId, answerText, markCorrect, questionIndex }, callback) => {
    const session = gameManager.getSessionBySocket(socket.id);
    if (!session) return callback({ error: 'No active session' });

    const result = session.toggleAnswerCorrectness(playerId, answerText, markCorrect, questionIndex);
    if (result.error) return callback({ error: result.error });

    // Get player's new score
    const player = session.players.get(playerId);
    const newScore = player?.score || 0;

    // Emit updated results to all clients
    const updatedResults = session.getQuestionResults();
    io.to(`game:${session.pin}`).emit('game:results-updated', updatedResults);

    // Notify player about score update (live update in player bottom bar)
    io.to(playerId).emit('game:score-updated', {
      playerId,
      newScore
    });

    callback(result);
  });

  // HOST: Review answer
  socket.on('host:review-answer', ({ playerId, answerIndex, approved }, callback) => {
    const session = gameManager.getSessionBySocket(socket.id);
    if (!session) return callback({ error: 'No active session' });

    const result = session.reviewAnswer(playerId, answerIndex, approved);
    if (result.error) return callback({ error: result.error });

    // Emit updated results to all clients (so host and players see the change)
    const updatedResults = session.getQuestionResults();
    io.to(`game:${session.pin}`).emit('game:results-updated', updatedResults);

    // Notify all clients about score update
    io.to(`game:${session.pin}`).emit('game:score-updated', {
      playerId,
      newScore: result.newScore
    });

    // Notify player their answer was reviewed
    io.to(playerId).emit('game:answer-reviewed', {
      approved,
      newScore: result.newScore
    });

    callback(result);
  });

  // PLAYER: Submit answer
  socket.on('player:answer', (answer, callback) => {
    const session = gameManager.getSessionBySocket(socket.id);
    if (!session) return callback({ error: 'No active session' });

    const result = session.submitAnswer(socket.id, answer);
    if (result.error) return callback({ error: result.error });

    // Notify host about answer count
    io.to(session.hostSocketId).emit('game:answer-count', {
      count: session.answerCount,
      total: session.players.size
    });

    // Notify host about pending reviews
    const pendingReviews = session.getPendingReviews();
    if (pendingReviews.length > 0) {
      io.to(session.hostSocketId).emit('game:pending-reviews', {
        count: pendingReviews.length,
        reviews: pendingReviews
      });
    }

    // If all answered, auto-show results (unless delayed results is active)
    if (result.allAnswered) {
      if (session.timer) clearTimeout(session.timer);
      
      const currentQ = session.quiz.questions[session.currentQuestionIndex];
      const roundNumber = currentQ?.roundNumber;
      const shouldDelay = session.shouldDelayResults(roundNumber);
      
      if (!shouldDelay) {
        // Normal flow: show results immediately
        session.state = 'results';
        const results = session.getQuestionResults();
        io.to(`game:${session.pin}`).emit('game:question-results', results);
      }
      // If delayed results: do nothing, wait for host to click "Volgende"
    }

    callback(result);
  });

  // PLAYER: Anti-cheat - notify host when player looks away
  socket.on('player:tab-hidden', ({ playerName }) => {
    const pin = gameManager.socketToSession.get(socket.id);
    if (!pin) return;
    const session = gameManager.getSession(pin);
    if (!session) return;
    
    console.log(`[Anti-cheat] ${playerName} tab hidden in game ${pin}`);
    io.to(session.hostSocketId).emit('game:player-tab-hidden', { playerName });
  });

  socket.on('player:tab-visible', ({ playerName }) => {
    const pin = gameManager.socketToSession.get(socket.id);
    if (!pin) return;
    const session = gameManager.getSession(pin);
    if (!session) return;
    
    console.log(`[Anti-cheat] ${playerName} tab visible in game ${pin}`);
    io.to(session.hostSocketId).emit('game:player-tab-visible', { playerName });
  });

  socket.on('player:window-blur', ({ playerName }) => {
    const pin = gameManager.socketToSession.get(socket.id);
    if (!pin) return;
    const session = gameManager.getSession(pin);
    if (!session) return;
    
    console.log(`[Anti-cheat] ${playerName} window blurred in game ${pin}`);
    io.to(session.hostSocketId).emit('game:player-window-blur', { playerName });
  });

  socket.on('player:window-focus', ({ playerName }) => {
    const pin = gameManager.socketToSession.get(socket.id);
    if (!pin) return;
    const session = gameManager.getSession(pin);
    if (!session) return;
    
    console.log(`[Anti-cheat] ${playerName} window focused in game ${pin}`);
    io.to(session.hostSocketId).emit('game:player-window-focus', { playerName });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    const result = gameManager.handleDisconnect(socket.id);
    if (!result) return;

    if (result.type === 'host') {
      io.to(`game:${result.pin}`).emit('game:host-disconnected');
      if (result.session.timer) clearTimeout(result.session.timer);
      gameManager.removeSession(result.pin);
    } else if (result.type === 'player') {
      io.to(result.session.hostSocketId).emit('game:player-left', {
        players: result.session.getPlayers()
      });
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
