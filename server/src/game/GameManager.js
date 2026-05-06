import stringSimilarity from 'string-similarity';

// Sort questions for quiz playback:
// - Info_slides (roundNumber=0) with afterRound=0 come first (before any round)
// - For each round: questions, then info_slides with afterRound=roundNum, then leaderboards with afterRound=roundNum
function sortQuestionsForPlay(questions) {
  if (!questions || questions.length === 0) return [];
  const withIdx = questions.map((q, idx) => ({ ...q, _origIdx: idx }));
  
  // Filter by type (not roundNumber) — robust even when roundNumber is missing
  const infoSlides = withIdx
    .filter(q => q.type === 'info_slide')
    .sort((a, b) => a._origIdx - b._origIdx);
  
  const leaderboards = withIdx
    .filter(q => q.type === 'leaderboard_slide')
    .sort((a, b) => a._origIdx - b._origIdx);
  
  const regulars = withIdx
    .filter(q => q.type !== 'info_slide' && q.type !== 'leaderboard_slide')
    .sort((a, b) => {
      const aRound = a.roundNumber ?? 1;
      const bRound = b.roundNumber ?? 1;
      if (aRound !== bRound) return aRound - bRound;
      return a._origIdx - b._origIdx;
    });
  
  const byRound = {};
  regulars.forEach(q => {
    const r = q.roundNumber ?? 1;
    if (!byRound[r]) byRound[r] = [];
    byRound[r].push(q);
  });
  
  const roundNumbers = Object.keys(byRound).map(r => parseInt(r)).sort((a, b) => a - b);
  const lastRound = roundNumbers.length > 0 ? roundNumbers[roundNumbers.length - 1] : 0;
  
  const result = [];
  const slidesAtStart = infoSlides.filter(s => (s.afterRound ?? 0) === 0);
  result.push(...slidesAtStart);
  
  for (const roundNum of roundNumbers) {
    result.push(...byRound[roundNum]);
    const infoHere = infoSlides.filter(s => (s.afterRound ?? 0) === roundNum);
    result.push(...infoHere);
    const lbsHere = leaderboards.filter(lb => (lb.afterRound ?? lastRound) === roundNum);
    result.push(...lbsHere);
  }
  
  const placedIds = new Set(result.map(q => q.id));
  const unplaced = [...infoSlides, ...leaderboards].filter(q => !placedIds.has(q.id));
  result.push(...unplaced);
  
  return result.map(({ _origIdx, ...q }) => q);
}

export class GameSession {
  constructor(quiz, hostSocketId) {
    // Trust the saved question order (drag-and-drop is source of truth in editor)
    this.quiz = { ...quiz, questions: quiz.questions || [] };
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
    this.pendingReviews = []; // Answers flagged for manual review
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
      roundNumber: q.roundNumber,
    };

    if (q.type === 'multiple_choice') {
      base.options = q.options;
    } else if (q.type === 'free_type') {
      base.inputFields = q.inputFields || 1;
    }

    return base;
  }

  previousQuestion() {
    if (this.currentQuestionIndex <= 0) {
      // Already at first question; just re-emit current
      this.currentQuestionIndex = 0;
    } else {
      this.currentQuestionIndex--;
    }
    this.answerCount = 0;

    const prevQ = this.quiz.questions[this.currentQuestionIndex];

    if (prevQ.type === 'leaderboard_slide') {
      this.state = 'leaderboard';
      return { state: 'leaderboard', leaderboard: this.getLeaderboard() };
    }

    this.state = 'question';
    this.questionStartTime = Date.now();
    return { state: 'question', question: this.getCurrentQuestion() };
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

    // If next slide is an info slide (tussenslide), show it without timer/answers
    if (nextQ.type === 'info_slide') {
      this.state = 'question'; // Use question state but it's an info slide
      return {
        state: 'question',
        question: this.getCurrentQuestion()
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
      const flaggedForReview = [];

      for (const playerAns of playerAnswers) {
        let bestMatch = null;
        let bestSimilarity = 0;
        let bestIndex = -1;

        // Find best match among unmatched correct answers
        for (let i = 0; i < correctAnswers.length; i++) {
          if (matchedIndices.has(i)) continue;
          let similarity = stringSimilarity.compareTwoStrings(playerAns, correctAnswers[i]);
          
          // Bonus: same first letter + similar length (helps with typos)
          if (playerAns[0] === correctAnswers[i][0]) {
            const lengthDiff = Math.abs(playerAns.length - correctAnswers[i].length);
            if (lengthDiff <= 2) {
              similarity += 0.15; // 15% bonus
            }
          }
          
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestMatch = correctAnswers[i];
            bestIndex = i;
          }
        }

        if (bestSimilarity >= 0.75) {
          // High confidence match - auto-accept (75%+)
          correctCount++;
          matchedIndices.add(bestIndex);
          matchedPlayerAnswers.push(playerAns);
        } else if (bestSimilarity >= 0.4) {
          // Medium confidence - flag for review (40-75%)
          flaggedForReview.push({
            playerAnswer: playerAns,
            expectedAnswer: bestMatch,
            similarity: bestSimilarity,
            answerIndex: bestIndex
          });
          unmatchedPlayerAnswers.push(playerAns);
        } else {
          // Low confidence - auto-reject
          unmatchedPlayerAnswers.push(playerAns);
        }
      }

      // If answers flagged for review, add to pending reviews
      if (flaggedForReview.length > 0) {
        this.pendingReviews.push({
          playerId: socketId,
          playerName: player.name,
          questionIndex: this.currentQuestionIndex,
          flaggedAnswers: flaggedForReview,
          timestamp: Date.now()
        });
      }

      // Calculate partial score based on correct count
      const totalExpected = correctAnswers.length;
      const scoreRatio = totalExpected > 0 ? correctCount / totalExpected : 0;
      isCorrect = scoreRatio >= 0.5; // At least 50% correct counts as correct
      partialScore = Math.round(scoreRatio * 1000); // Up to 1000 points for correct answers
      
      // Store matched/unmatched for feedback
      player.lastAnswerDetails = {
        matched: matchedPlayerAnswers,
        unmatched: unmatchedPlayerAnswers,
        pendingReview: flaggedForReview.length > 0
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

  getPendingReviews() {
    return this.pendingReviews.filter(r => r.questionIndex === this.currentQuestionIndex);
  }

  reviewAnswer(playerId, answerIndex, approved) {
    const player = this.players.get(playerId);
    if (!player) return { error: 'Player not found' };

    const question = this.quiz.questions[this.currentQuestionIndex];
    if (question.type !== 'free_type') return { error: 'Not a free type question' };

    // Find the pending review for this player
    const reviewIdx = this.pendingReviews.findIndex(
      r => r.playerId === playerId && r.questionIndex === this.currentQuestionIndex
    );
    if (reviewIdx === -1) return { error: 'No pending review found' };

    const review = this.pendingReviews[reviewIdx];
    const flaggedAnswer = review.flaggedAnswers.find(a => a.answerIndex === answerIndex);
    if (!flaggedAnswer) return { error: 'Answer not found' };

    if (approved) {
      // Award points for approved answer
      const points = 100;
      player.score += points;
      
      // Update player's answer record
      const answerRecord = player.answers.find(a => a.questionIndex === this.currentQuestionIndex);
      if (answerRecord) {
        answerRecord.points += points;
        answerRecord.reviewedCorrect = true;
      }

      // Update details
      if (player.lastAnswerDetails) {
        player.lastAnswerDetails.matched.push(flaggedAnswer.playerAnswer);
        const idx = player.lastAnswerDetails.unmatched.indexOf(flaggedAnswer.playerAnswer);
        if (idx > -1) player.lastAnswerDetails.unmatched.splice(idx, 1);
      }
    }

    // Remove this flagged answer from the review
    review.flaggedAnswers = review.flaggedAnswers.filter(a => a.answerIndex !== answerIndex);
    
    // If no more flagged answers for this player, remove the review
    if (review.flaggedAnswers.length === 0) {
      this.pendingReviews.splice(reviewIdx, 1);
    }

    return { 
      success: true, 
      playerName: player.name,
      newScore: player.score,
      remainingReviews: this.getPendingReviews().length
    };
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
