import { supabase } from './supabase.js';

// Map DB row (snake_case) to API shape (camelCase)
function fromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    questions: row.questions || [],
    roundTitles: row.round_titles || {},
    roundSettings: row.round_settings || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Map API quiz (camelCase) to DB row (snake_case)
function toRow(quiz) {
  return {
    id: quiz.id,
    title: quiz.title ?? 'Untitled Quiz',
    description: quiz.description ?? '',
    questions: quiz.questions ?? [],
    round_titles: quiz.roundTitles ?? {},
    round_settings: quiz.roundSettings ?? {},
    updated_at: new Date().toISOString(),
  };
}

export async function getQuizzes() {
  const { data, error } = await supabase
    .from('quizzes')
    .select('id, title, description, questions, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[DB] getQuizzes error:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    title: row.title,
    description: row.description || '',
    questionCount: Array.isArray(row.questions) ? row.questions.length : 0,
    createdAt: row.created_at,
  }));
}

export async function getQuiz(id) {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[DB] getQuiz error:', error);
    return null;
  }

  return fromRow(data);
}

export async function saveQuiz(quiz) {
  const row = toRow(quiz);

  const { data, error } = await supabase
    .from('quizzes')
    .upsert(row, { onConflict: 'id' })
    .select()
    .maybeSingle();

  if (error) {
    console.error('[DB] saveQuiz error:', error);
    throw error;
  }

  return fromRow(data);
}

export async function deleteQuiz(id) {
  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[DB] deleteQuiz error:', error);
    throw error;
  }
}
