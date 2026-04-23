import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Play, Edit, Trash2, ArrowLeft, FileText } from 'lucide-react';

export default function AdminDashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    if (!sessionStorage.getItem('admin')) {
      navigate('/admin/login');
      return;
    }
    fetchQuizzes();
  }, [navigate]);

  const fetchQuizzes = async () => {
    const res = await fetch(`${API_BASE}/api/quizzes`);
    const data = await res.json();
    setQuizzes(data);
  };

  const createQuiz = async () => {
    const res = await fetch(`${API_BASE}/api/quizzes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Nieuwe Quiz', questions: [] }),
    });
    const quiz = await res.json();
    navigate(`/admin/quiz/${quiz.id}`);
  };

  const deleteQuiz = async (id) => {
    if (!confirm('Weet je zeker dat je deze quiz wilt verwijderen?')) return;
    await fetch(`${API_BASE}/api/quizzes/${id}`, { method: 'DELETE' });
    fetchQuizzes();
  };

  return (
    <div className="min-h-screen p-6 md:p-10 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-black">Mijn Quizzen</h1>
          </div>
          <button
            onClick={createQuiz}
            className="px-6 py-3 bg-quiz-green hover:bg-emerald-600 rounded-xl font-bold transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nieuwe Quiz
          </button>
        </div>

        {quizzes.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Geen quizzen gevonden</p>
            <p className="text-sm mt-1">Maak je eerste quiz!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{quiz.title}</h3>
                  <p className="text-gray-400 text-sm">{quiz.questionCount} vragen</p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/admin/quiz/${quiz.id}`}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                    title="Bewerken"
                  >
                    <Edit className="w-5 h-5" />
                  </Link>
                  <Link
                    to={`/admin/host/${quiz.id}`}
                    className="p-3 bg-quiz-green hover:bg-emerald-600 rounded-xl transition-colors"
                    title="Spelen"
                  >
                    <Play className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={() => deleteQuiz(quiz.id)}
                    className="p-3 bg-white/10 hover:bg-quiz-red/20 rounded-xl transition-colors text-gray-400 hover:text-quiz-red"
                    title="Verwijderen"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
