import { Router } from 'express';
import { getQuizzes, getQuiz, saveQuiz, deleteQuiz } from '../database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all quizzes
router.get('/', async (req, res) => {
  try {
    const list = await getQuizzes();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load quizzes' });
  }
});

// Get single quiz
router.get('/:id', async (req, res) => {
  try {
    const quiz = await getQuiz(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json(quiz);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load quiz' });
  }
});

// Create quiz
router.post('/', async (req, res) => {
  try {
    const quiz = {
      id: uuidv4(),
      title: req.body.title || 'Untitled Quiz',
      description: req.body.description || '',
      questions: req.body.questions || [],
      roundTitles: req.body.roundTitles || {},
      roundSettings: req.body.roundSettings || {},
      createdAt: new Date().toISOString(),
    };
    const saved = await saveQuiz(quiz);
    res.json(saved);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

// Update quiz
router.put('/:id', async (req, res) => {
  try {
    const existing = await getQuiz(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Quiz not found' });

    const updated = {
      ...existing,
      title: req.body.title ?? existing.title,
      description: req.body.description ?? existing.description,
      questions: req.body.questions ?? existing.questions,
      roundTitles: (req.body.roundTitles ?? existing.roundTitles) || {},
      roundSettings: (req.body.roundSettings ?? existing.roundSettings) || {},
    };
    const saved = await saveQuiz(updated);
    res.json(saved);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

// Duplicate question
router.post('/:quizId/questions/:questionId/duplicate', async (req, res) => {
  try {
    const quiz = await getQuiz(req.params.quizId);
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
    await saveQuiz(quiz);
    res.json(duplicatedQuestion);
  } catch (e) {
    res.status(500).json({ error: 'Failed to duplicate question' });
  }
});

// Delete quiz
router.delete('/:id', async (req, res) => {
  try {
    await deleteQuiz(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

export default router;
