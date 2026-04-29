import { Router } from 'express';
import { getQuizzes, getQuiz, saveQuiz, deleteQuiz } from '../database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all quizzes
router.get('/', (req, res) => {
  res.json(getQuizzes());
});

// Get single quiz
router.get('/:id', (req, res) => {
  const quiz = getQuiz(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  res.json(quiz);
});

// Create quiz
router.post('/', (req, res) => {
  const quiz = {
    id: uuidv4(),
    title: req.body.title || 'Untitled Quiz',
    description: req.body.description || '',
    questions: req.body.questions || [],
    roundTitles: req.body.roundTitles || {},
    createdAt: new Date().toISOString(),
  };
  saveQuiz(quiz);
  res.json(quiz);
});

// Update quiz
router.put('/:id', (req, res) => {
  const existing = getQuiz(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Quiz not found' });
  
  const updated = {
    ...existing,
    title: req.body.title ?? existing.title,
    description: req.body.description ?? existing.description,
    questions: req.body.questions ?? existing.questions,
    roundTitles: (req.body.roundTitles ?? existing.roundTitles) || {},
  };
  saveQuiz(updated);
  res.json(updated);
});

// Duplicate question
router.post('/:quizId/questions/:questionId/duplicate', (req, res) => {
  const quiz = getQuiz(req.params.quizId);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  
  const questionIndex = quiz.questions.findIndex(q => q.id === req.params.questionId);
  if (questionIndex === -1) return res.status(404).json({ error: 'Question not found' });
  
  const originalQuestion = quiz.questions[questionIndex];
  const duplicatedQuestion = {
    ...originalQuestion,
    id: uuidv4(),
    questionText: originalQuestion.questionText + ' (kopie)',
  };
  
  quiz.questions.splice(questionIndex + 1, 0, duplicatedQuestion);
  saveQuiz(quiz);
  res.json(duplicatedQuestion);
});

// Delete quiz
router.delete('/:id', (req, res) => {
  deleteQuiz(req.params.id);
  res.json({ success: true });
});

export default router;
