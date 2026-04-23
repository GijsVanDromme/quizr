export class GameSession {
  constructor(quiz, hostSocketId) {
    this.quiz = quiz;
    this.hostSocketId = hostSocketId;
    this.pin = Math.floor(100000 + Math.random() * 900000).toString();
    this.players = new Map();
    this.disconnectedPlayers = new Map(); // Store disconnected players by name for rejoin
    this.state = 'lobby'; // lobby | question | results | leaderboard | finished
    this.currentQuestionIndex = -1;
    this.answerCount = 0;
    this.timer = null;
    this.pausedTimer = null;
    this.paused = false;
    this.questionStartTime = null;
  }

  addPlayer(socketId, name, emoji) {
    const normalizedName = name.trim().toLowerCase();

    // Check if rejoining (either in current players or disconnected players)
    if (this.state !== 'lobby') {
      // Check current players first
      for (const [oldId, player] of this.players) {
        if (player.name.toLowerCase() === normalizedName) {
          const updatedPlayer = { ...player, id: socketId };
          this.players.delete(oldId);
          this.players.set(socketId, updatedPlayer);
          return { playerId: socketId, playerName: name, rejoined: true };
        }
      }
      // Check disconnected players
      if (this.disconnectedPlayers.has(normalizedName)) {
        const player = this.disconnectedPlayers.get(normalizedName);
        const updatedPlayer = { ...player, id: socketId };
        this.disconnectedPlayers.delete(normalizedName);
        this.players.set(socketId, updatedPlayer);
        return { playerId: socketId, playerName: name, rejoined: true };
      }
      return { error: 'Game is al begonnen' };
    }

    const player = {
      id: socketId,
      name: name.trim(),
      emoji: emoji || '😀',
      score: 0,
      streak: 0,
      answers: [],
      correctAnswers: 0,
      totalAnswers: 0,
    };
    this.players.set(socketId, player);
    return { playerId: socketId, playerName: name.trim() };
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (player) {
      // Store in disconnected players for rejoin
      this.disconnectedPlayers.set(player.name.toLowerCase(), player);
      this.players.delete(socketId);
    }
  }

  getPlayers() {
    return Array.from(this.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      emoji: p.emoji,
    }));
  }

  getCurrentQuestion() {
    const q = this.quiz.questions[this.currentQuestionIndex];
    if (!q) return null;

    const base = {
      questionNumber: this.currentQuestionIndex + 1,
      totalQuestions: this.quiz.questions.length,
      questionText: q.questionText,
      type: q.type,
      imageUrl: q.imageUrl,
      timeLimit: q.timeLimit || 20,
    };

    if (q.type === 'multiple_choice') {
      base.options = q.options;
    } else if (q.type === 'free_type') {
      base.inputFields = q.inputFields || 1;
    }

    return base;
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    this.answerCount = 0;

    if (this.currentQuestionIndex >= this.quiz.questions.length) {
      this.state = 'finished';
      return { state: 'finished', leaderboard: this.getLeaderboard() };
    }

    const nextQ = this.quiz.questions[this.currentQuestionIndex];
    
    // If next slide is a leaderboard slide, show leaderboard directly
    if (nextQ.type === 'leaderboard_slide') {
      this.state = 'leaderboard';
      return {
        state: 'leaderboard',
        leaderboard: this.getLeaderboard()
      };
    }

    this.state = 'question';
    this.questionStartTime = Date.now();

    return {
      state: 'question',
      question: this.getCurrentQuestion()
    };
  }

  submitAnswer(socketId, answer) {
    const player = this.players.get(socketId);
    if (!player) return { error: 'Player not found' };
    if (this.state !== 'question') return { error: 'Not in question state' };

    // Check if already answered
    const alreadyAnswered = player.answers.some(
      a => a.questionIndex === this.currentQuestionIndex
    );
    if (alreadyAnswered) return { error: 'Already answered' };

    this.answerCount++;
    const question = this.quiz.questions[this.currentQuestionIndex];
    const timeTaken = (Date.now() - this.questionStartTime) / 1000;
    const timeLimit = question.timeLimit || 20;

    let isCorrect = false;
    let correctCount = 0;
    let partialScore = 0;

    if (question.type === 'multiple_choice') {
      isCorrect = answer === question.correctAnswer;
      correctCount = isCorrect ? 1 : 0;
    } else if (question.type === 'free_type') {
      const correctAnswers = (question.correctAnswers || []).map(a => a.toLowerCase().trim());
      const playerAnswers = answer.split(',').map(a => a.toLowerCase().trim()).filter(Boolean);
      const matchedIndices = new Set();
      const matchedPlayerAnswers = [];
      const unmatchedPlayerAnswers = [];

      for (const playerAns of playerAnswers) {
        let found = false;
        for (let i = 0; i < correctAnswers.length; i++) {
          if (!matchedIndices.has(i) && playerAns === correctAnswers[i]) {
            correctCount++;
            matchedIndices.add(i);
            matchedPlayerAnswers.push(playerAns);
            found = true;
            break;
          }
        }
        if (!found) {
          unmatchedPlayerAnswers.push(playerAns);
        }
      }

      // Calculate partial score based on correct count
      const totalExpected = correctAnswers.length;
      const scoreRatio = totalExpected > 0 ? correctCount / totalExpected : 0;
      isCorrect = scoreRatio >= 0.5; // At least 50% correct counts as correct
      partialScore = Math.round(scoreRatio * 1000); // Up to 1000 points for correct answers
      
      // Store matched/unmatched for feedback
      player.lastAnswerDetails = {
        matched: matchedPlayerAnswers,
        unmatched: unmatchedPlayerAnswers
      };
    }

    // Calculate score - simple 100 points per correct answer
    let points = 0;
    if (question.type === 'free_type' && correctCount > 0) {
      // Award 100 points per correct answer in free type
      points = correctCount * 100;
      if (isCorrect) {
        player.streak++;
      } else {
        player.streak = 0;
      }
    } else if (isCorrect) {
      // Award 100 points for correct multiple choice
      points = 100;
      player.streak++;
    } else {
      player.streak = 0;
    }

    player.score += points;
    player.answers.push({
      questionIndex: this.currentQuestionIndex,
      answer,
      isCorrect,
      points,
      timeTaken,
    });
    player.totalAnswers++;
    if (isCorrect) player.correctAnswers++;

    const totalExpected = question.type === 'free_type' ? (question.correctAnswers || []).length : 1;

    const result = {
      isCorrect,
      points,
      totalScore: player.score,
      streak: player.streak,
      correctCount,
      totalExpected,
      answerDetails: player.lastAnswerDetails || null,
      allAnswered: this.answerCount >= this.players.size,
    };

    return result;
  }

  getQuestionResults() {
    const question = this.quiz.questions[this.currentQuestionIndex];
    const allAnswers = [];
    let correctCount = 0;

    this.players.forEach((player) => {
      const ans = player.answers.find(
        a => a.questionIndex === this.currentQuestionIndex
      );
      allAnswers.push({
        playerName: player.name,
        emoji: player.emoji,
        answer: ans?.answer ?? null,
        isCorrect: ans?.isCorrect || false,
        points: ans?.points || 0,
      });
      if (ans?.isCorrect) correctCount++;
    });

    const result = {
      questionText: question.questionText,
      type: question.type,
      correctAnswer: question.type === 'multiple_choice'
        ? question.correctAnswer
        : question.correctAnswers,
      totalPlayers: this.players.size,
      correctCount,
      answers: allAnswers,
    };

    if (question.type === 'multiple_choice') {
      result.options = question.options;
      // Distribution
      const dist = {};
      allAnswers.forEach(a => {
        if (a.answer !== null) {
          dist[a.answer] = (dist[a.answer] || 0) + 1;
        }
      });
      result.distribution = dist;
    }

    return result;
  }

  getLeaderboard() {
    return Array.from(this.players.values())
      .sort((a, b) => b.score - a.score)
      .map(p => ({
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        score: p.score,
        correctAnswers: p.correctAnswers,
        totalAnswers: p.totalAnswers,
        streak: p.streak,
      }));
  }
}

export class GameManager {
  constructor() {
    this.sessions = new Map();
    this.socketToSession = new Map();
  }

  createSession(quiz, hostSocketId) {
    const session = new GameSession(quiz, hostSocketId);
    this.sessions.set(session.pin, session);
    this.socketToSession.set(hostSocketId, session.pin);
    return session;
  }

  getSession(pin) {
    return this.sessions.get(pin) || null;
  }

  getSessionBySocket(socketId) {
    const pin = this.socketToSession.get(socketId);
    if (pin) return this.sessions.get(pin) || null;
    // Check if player
    for (const session of this.sessions.values()) {
      if (session.players.has(socketId)) return session;
    }
    return null;
  }

  removeSession(pin) {
    const session = this.sessions.get(pin);
    if (session) {
      this.socketToSession.delete(session.hostSocketId);
      session.players.forEach((_, id) => this.socketToSession.delete(id));
      this.sessions.delete(pin);
    }
  }

  handleDisconnect(socketId) {
    // Check if host
    const pin = this.socketToSession.get(socketId);
    if (pin) {
      const session = this.sessions.get(pin);
      if (session && session.hostSocketId === socketId) {
        return { type: 'host', pin, session };
      }
    }
    // Check if player
    for (const [sessionPin, session] of this.sessions) {
      if (session.players.has(socketId)) {
        session.removePlayer(socketId);
        this.socketToSession.delete(socketId);
        return { type: 'player', pin: sessionPin, session };
      }
    }
    return null;
  }
}
