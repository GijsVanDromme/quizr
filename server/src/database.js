import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return { quizzes: [] };
  }
}

function writeDB(data) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export function getQuizzes() {
  const db = readDB();
  return db.quizzes.map(q => ({
    id: q.id,
    title: q.title,
    description: q.description,
    questionCount: q.questions?.length || 0,
    createdAt: q.createdAt
  }));
}

export function getQuiz(id) {
  const db = readDB();
  return db.quizzes.find(q => q.id === id) || null;
}

export function saveQuiz(quiz) {
  const db = readDB();
  const index = db.quizzes.findIndex(q => q.id === quiz.id);
  if (index >= 0) {
    db.quizzes[index] = quiz;
  } else {
    db.quizzes.push(quiz);
  }
  writeDB(db);
  return quiz;
}

export function deleteQuiz(id) {
  const db = readDB();
  db.quizzes = db.quizzes.filter(q => q.id !== id);
  writeDB(db);
}
