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

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // HOST: Create game session
  socket.on('host:create', ({ quizId }, callback) => {
    const quiz = getQuiz(quizId);
    if (!quiz) return callback({ error: 'Quiz not found' });

    const session = gameManager.createSession(quiz, socket.id);
    socket.join(`game:${session.pin}`);
    console.log(`[Game] Created session ${session.pin} for quiz "${quiz.title}"`);

    callback({
      pin: session.pin,
      quizTitle: quiz.title,
      totalQuestions: quiz.questions.length,
    });
  });

  // PLAYER: Join game
  socket.on('player:join', ({ pin, name, emoji }, callback) => {
    const session = gameManager.getSession(pin);
    if (!session) return callback({ error: 'Game niet gevonden' });
    if (session.state !== 'lobby') return callback({ error: 'Game is al begonnen' });

    const result = session.addPlayer(socket.id, name, emoji);
    if (result.error) return callback({ error: result.error });

    gameManager.socketToSession.set(socket.id, pin);
    socket.join(`game:${pin}`);
    console.log(`[Game] ${name} (${emoji}) joined game ${pin}`);

    // Notify host
    io.to(session.hostSocketId).emit('game:player-joined', {
      players: session.getPlayers()
    });

    callback(result);
  });

  // HOST: Start the game (first question)
  socket.on('host:start', (callback) => {
    const session = gameManager.getSessionBySocket(socket.id);
    if (!session) return callback({ error: 'No active session' });

    const result = session.nextQuestion();
    
    if (result.state === 'question') {
      io.to(`game:${session.pin}`).emit('game:question', result.question);
      
      // Auto-end question after time limit
      const timeLimit = (result.question.timeLimit || 20) * 1000;
      session.timer = setTimeout(() => {
        if (session.state === 'question' && !session.paused) {
          session.state = 'results';
          const results = session.getQuestionResults();
          io.to(`game:${session.pin}`).emit('game:question-results', results);
        }
      }, timeLimit + 1000);
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
    const session = gameManager.getSessionBySocket(socket.id);
    if (!session) return callback({ error: 'No active session' });

    if (session.timer) clearTimeout(session.timer);

    const result = session.nextQuestion();

    if (result.state === 'question') {
      io.to(`game:${session.pin}`).emit('game:question', result.question);

      const timeLimit = (result.question.timeLimit || 20) * 1000;
      session.timer = setTimeout(() => {
        if (session.state === 'question' && !session.paused) {
          session.state = 'results';
          const results = session.getQuestionResults();
          io.to(`game:${session.pin}`).emit('game:question-results', results);
        }
      }, timeLimit + 1000);
    } else if (result.state === 'leaderboard') {
      io.to(`game:${session.pin}`).emit('game:leaderboard', { leaderboard: result.leaderboard });
    } else if (result.state === 'finished') {
      io.to(`game:${session.pin}`).emit('game:finished', {
        leaderboard: result.leaderboard
      });
    }

    callback(result);
  });

  // HOST: Show results for current question
  socket.on('host:show-results', (callback) => {
    const session = gameManager.getSessionBySocket(socket.id);
    if (!session) return callback({ error: 'No active session' });

    if (session.timer) clearTimeout(session.timer);
    session.state = 'results';

    const results = session.getQuestionResults();
    io.to(`game:${session.pin}`).emit('game:question-results', results);
    callback(results);
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
              session.state = 'results';
              const results = session.getQuestionResults();
              io.to(`game:${session.pin}`).emit('game:question-results', results);
            }
          }, remainingTime);
        }
        session.pausedTimer = null;
      }
    }

    io.to(`game:${session.pin}`).emit('game:paused', { paused });
    callback({ paused });
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

    // If all answered, auto-show results
    if (result.allAnswered) {
      if (session.timer) clearTimeout(session.timer);
      session.state = 'results';
      const results = session.getQuestionResults();
      io.to(`game:${session.pin}`).emit('game:question-results', results);
    }

    callback(result);
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
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
