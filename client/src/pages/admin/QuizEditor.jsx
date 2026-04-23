import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Save, Image, Clock, CheckCircle,
  GripVertical, FileText, Trophy, Upload, X
} from 'lucide-react';

function QuestionForm({ question, onChange, onDelete, index, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isDragOver }) {
  const [expanded, setExpanded] = useState(true);
  const [uploading, setUploading] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL || '';

  const update = (field, value) => {
    onChange({ ...question, [field]: value });
  };

  const updateOption = (optIndex, value) => {
    const opts = [...(question.options || [])];
    opts[optIndex] = value;
    update('options', opts);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        // Prefix with API base so images load from the backend domain in production
        const absoluteUrl = data.url.startsWith('http') ? data.url : `${API_BASE}${data.url}`;
        update('imageUrl', absoluteUrl);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  };

  const typeLabels = {
    multiple_choice: '🔤 Meerkeuze',
    free_type: '✏️ Open vraag',
    info_slide: '📋 Info slide',
    leaderboard_slide: '🏆 Tussenstand',
  };

  // Simplified view for leaderboard slides
  if (question.type === 'leaderboard_slide') {
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        className={`bg-white/5 border rounded-2xl transition-all ${isDragOver ? 'border-primary-500 bg-primary-500/10' : 'border-white/10'} ${isDragging ? 'opacity-50' : ''}`}
      >
        <div className="flex items-center gap-3 p-4">
          <GripVertical className="w-5 h-5 text-gray-500 cursor-grab flex-shrink-0" />
          <Trophy className="w-5 h-5 text-quiz-yellow" />
          <span className="font-bold flex-1">Tussenstand</span>
          <span className="text-sm text-gray-500">#{index + 1}</span>
          <button onClick={onDelete} className="p-2 text-gray-500 hover:text-quiz-red transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`bg-white/5 border rounded-2xl overflow-hidden transition-all ${isDragOver ? 'border-primary-500 bg-primary-500/10' : 'border-white/10'} ${isDragging ? 'opacity-50' : ''}`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical className="w-5 h-5 text-gray-500 cursor-grab flex-shrink-0" onClick={e => e.stopPropagation()} />
        <span className="text-sm font-medium text-gray-400">#{index + 1}</span>
        <span className="flex-1 font-medium truncate">
          {question.questionText || 'Nieuwe vraag'}
        </span>
        <span className="text-xs px-2 py-1 bg-white/10 rounded-full">
          {typeLabels[question.type] || question.type}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-2 text-gray-500 hover:text-quiz-red transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
          {/* Type selector */}
          <div className="flex gap-2 flex-wrap">
            {Object.entries(typeLabels).map(([type, label]) => (
              <button
                key={type}
                onClick={() => update('type', type)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  question.type === type
                    ? 'bg-primary-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Question text */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Vraag / tekst</label>
            <textarea
              value={question.questionText || ''}
              onChange={(e) => update('questionText', e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary-500 resize-none"
              rows={2}
              placeholder="Typ je vraag hier..."
            />
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Afbeelding (optioneel)</label>
            <div className="flex items-center gap-3">
              {question.imageUrl && (
                <div className="relative">
                  <img src={question.imageUrl} alt="" className="w-20 h-20 object-cover rounded-lg" />
                  <button
                    onClick={() => update('imageUrl', '')}
                    className="absolute -top-1 -right-1 p-0.5 bg-quiz-red rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <label className="cursor-pointer px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploaden...' : 'Upload'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          {/* Time Limit - hide for leaderboard and info slides */}
          {question.type !== 'leaderboard_slide' && question.type !== 'info_slide' && (
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-gray-500" />
              <label className="text-sm text-gray-400">Tijdslimiet:</label>
              <select
                value={question.timeLimit || 20}
                onChange={(e) => update('timeLimit', parseInt(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
              >
                <option value={10}>10 sec</option>
                <option value={15}>15 sec</option>
                <option value={20}>20 sec</option>
                <option value={30}>30 sec</option>
                <option value={45}>45 sec</option>
                <option value={60}>60 sec</option>
                <option value={90}>90 sec</option>
                <option value={120}>2 min</option>
              </select>
            </div>
          )}

          {/* Multiple Choice Options */}
          {question.type === 'multiple_choice' && (
            <div className="space-y-2">
              <label className="block text-sm text-gray-400">Antwoorden</label>
              {(question.options || ['', '', '', '']).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    onClick={() => update('correctAnswer', i)}
                    className={`p-2 rounded-lg transition-colors ${
                      question.correctAnswer === i
                        ? 'bg-quiz-green text-white'
                        : 'bg-white/5 text-gray-500 hover:bg-white/10'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <input
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-primary-500"
                    placeholder={`Optie ${i + 1}`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Free Type Options */}
          {question.type === 'free_type' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-400">Aantal verwachte antwoorden:</label>
                <select
                  value={question.inputFields || 1}
                  onChange={(e) => {
                    const newCount = parseInt(e.target.value);
                    const current = question.correctAnswers || [];
                    const newAnswers = Array.from({ length: newCount }, (_, i) => current[i] || '');
                    onChange({ ...question, inputFields: newCount, correctAnswers: newAnswers });
                  }}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm text-gray-400">Correcte antwoorden</label>
                {Array.from({ length: question.inputFields || 1 }).map((_, i) => (
                  <input
                    key={i}
                    value={(question.correctAnswers || [])[i] || ''}
                    onChange={(e) => {
                      const answers = [...(question.correctAnswers || [])];
                      answers[i] = e.target.value;
                      update('correctAnswers', answers);
                    }}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-primary-500"
                    placeholder={`Correct antwoord ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function QuizEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL || '';

  // Drag and drop
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    if (!sessionStorage.getItem('admin')) {
      navigate('/admin/login');
      return;
    }
    fetchQuiz();
  }, [id, navigate]);

  const fetchQuiz = async () => {
    const res = await fetch(`${API_BASE}/api/quizzes/${id}`);
    if (!res.ok) return navigate('/admin');
    const data = await res.json();
    setQuiz(data);
  };

  const saveQuiz = async () => {
    setSaving(true);
    await fetch(`${API_BASE}/api/quizzes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quiz),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addQuestion = (type = 'multiple_choice') => {
    const newQ = {
      id: `temp-${Date.now()}`,
      questionText: '',
      type,
      imageUrl: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      correctAnswers: [],
      inputFields: 1,
      timeLimit: 20,
    };
    setQuiz({ ...quiz, questions: [...quiz.questions, newQ] });
  };

  const updateQuestion = (index, updated) => {
    const questions = [...quiz.questions];
    questions[index] = updated;
    setQuiz({ ...quiz, questions });
  };

  const deleteQuestion = (index) => {
    const questions = quiz.questions.filter((_, i) => i !== index);
    setQuiz({ ...quiz, questions });
  };

  const handleDragStart = (index) => (e) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (index) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (index) => (e) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const questions = [...quiz.questions];
    const [moved] = questions.splice(dragIndex, 1);
    questions.splice(index, 0, moved);
    setQuiz({ ...quiz, questions });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/admin" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <input
            value={quiz.title}
            onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
            className="flex-1 text-2xl font-black bg-transparent border-b-2 border-transparent focus:border-primary-500 outline-none py-1"
            placeholder="Quiz titel..."
          />
          <button
            onClick={saveQuiz}
            disabled={saving}
            className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
              saved ? 'bg-quiz-green' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Opslaan...' : saved ? 'Opgeslagen!' : 'Opslaan'}
          </button>
        </div>

        {/* Questions */}
        <div className="space-y-3 mb-6">
          {quiz.questions.map((q, i) => (
            <QuestionForm
              key={q.id || i}
              question={q}
              onChange={(updated) => updateQuestion(i, updated)}
              onDelete={() => deleteQuestion(i)}
              index={i}
              onDragStart={handleDragStart(i)}
              onDragOver={handleDragOver(i)}
              onDrop={handleDrop(i)}
              onDragEnd={handleDragEnd}
              isDragging={dragIndex === i}
              isDragOver={dragOverIndex === i}
            />
          ))}
        </div>

        {/* Add buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => addQuestion('multiple_choice')}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Meerkeuze
          </button>
          <button
            onClick={() => addQuestion('free_type')}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Open vraag
          </button>
          <button
            onClick={() => addQuestion('info_slide')}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
          >
            <FileText className="w-4 h-4" />
            Info slide
          </button>
          <button
            onClick={() => addQuestion('leaderboard_slide')}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
          >
            <Trophy className="w-4 h-4" />
            Tussenstand
          </button>
        </div>
      </div>
    </div>
  );
}
