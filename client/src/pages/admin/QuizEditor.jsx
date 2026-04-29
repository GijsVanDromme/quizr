import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Save, Image, Clock, CheckCircle,
  GripVertical, FileText, Trophy, Upload, X, Type as TypeIcon, ListChecks, Copy, Hash,
  ChevronDown, ChevronUp, Maximize2, Minimize2
} from 'lucide-react';

function QuestionForm({ question, onChange, onDelete, index, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isDragOver, onDuplicate, showRoundHeader, expanded, onToggleExpand }) {
  const [uploading, setUploading] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL || '';

  const update = (field, value) => {
    onChange({ ...question, [field]: value });
  };

  const handleDuplicate = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/quizzes/${question.quizId}/questions/${question.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const duplicatedQuestion = await response.json();
        onDuplicate(duplicatedQuestion);
      }
    } catch (error) {
      console.error('Failed to duplicate question:', error);
    }
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
        // Supabase returns full URL, use it directly
        update('imageUrl', data.url);
      } else if (data.error) {
        console.error('Upload error:', data.error);
        alert('Upload failed: ' + data.error);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Check console for details.');
    }
    setUploading(false);
  };

  const typeDefs = {
    multiple_choice: { label: 'Meerkeuze', Icon: ListChecks },
    free_type: { label: 'Open vraag', Icon: TypeIcon },
    info_slide: { label: 'Info slide', Icon: FileText },
    leaderboard_slide: { label: 'Tussenstand', Icon: Trophy },
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
        onClick={onToggleExpand}
      >
        <GripVertical className="w-5 h-5 text-gray-500 cursor-grab flex-shrink-0" onClick={e => e.stopPropagation()} />
        <span className="text-sm font-medium text-gray-400">#{index + 1}</span>
        <input
          value={question.questionText || ''}
          onChange={(e) => update('questionText', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-transparent border-none outline-none font-medium text-gray-300 placeholder-gray-500 truncate"
          placeholder="Vraag titel..."
        />
        <span className="text-xs px-2 py-1 bg-white/10 rounded-full">
          {typeDefs[question.type]?.label || question.type}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); handleDuplicate(); }}
          className="p-2 text-gray-500 hover:text-primary-400 transition-colors"
          title="Kopieer vraag"
        >
          <Copy className="w-4 h-4" />
        </button>
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
            {Object.entries(typeDefs).map(([type, def]) => (
              <button
                key={type}
                onClick={() => update('type', type)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  question.type === type
                    ? 'bg-primary-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <def.Icon className="w-4 h-4" />
                {def.label}
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

// Sort questions for quiz playback:
// - Info_slides (roundNumber=0) with afterRound=0 come first (before any round)
// - For each round: regular questions, then info_slides with afterRound=roundNum, then leaderboards with afterRound=roundNum
// Within each group, maintain original array order.
function sortQuestionsForPlay(questions) {
  if (!questions || questions.length === 0) return [];
  
  const withIdx = questions.map((q, idx) => ({ ...q, _origIdx: idx }));
  
  // Filter by type (not roundNumber) so slides always land in the right bucket
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
  
  // Group regular questions by round
  const byRound = {};
  regulars.forEach(q => {
    const r = q.roundNumber ?? 1;
    if (!byRound[r]) byRound[r] = [];
    byRound[r].push(q);
  });
  
  const roundNumbers = Object.keys(byRound).map(r => parseInt(r)).sort((a, b) => a - b);
  const lastRound = roundNumbers.length > 0 ? roundNumbers[roundNumbers.length - 1] : 0;
  
  // Start with info_slides positioned before round 1 (afterRound=0 or undefined)
  const result = [];
  const slidesAtStart = infoSlides.filter(s => (s.afterRound ?? 0) === 0);
  result.push(...slidesAtStart);
  
  for (const roundNum of roundNumbers) {
    result.push(...byRound[roundNum]);
    // Insert info_slides configured to show after this round
    const infoHere = infoSlides.filter(s => (s.afterRound ?? 0) === roundNum);
    result.push(...infoHere);
    // Insert leaderboards configured to show after this round
    const lbsHere = leaderboards.filter(lb => (lb.afterRound ?? lastRound) === roundNum);
    result.push(...lbsHere);
  }
  
  // Add any unplaced items (orphans) at the end
  const placedIds = new Set(result.map(q => q.id));
  const unplaced = [...infoSlides, ...leaderboards].filter(q => !placedIds.has(q.id));
  result.push(...unplaced);
  
  return result.map(({ _origIdx, ...q }) => q);
}

export default function QuizEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL || '';

  // Drag and drop
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Expand/collapse state
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [collapsedRounds, setCollapsedRounds] = useState({});

  // Unified drag state for sections (rondes, tussenslides, tussenstanden)
  const [draggedSectionId, setDraggedSectionId] = useState(null);
  const [dropZoneHover, setDropZoneHover] = useState(null);

  useEffect(() => {
    if (!sessionStorage.getItem('admin')) {
      navigate('/admin/login');
      return;
    }
    fetchQuiz();
  }, [id, navigate]);

  const fetchQuiz = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/quizzes/${id}`);
      if (!res.ok) {
        setError(`Kan quiz niet laden (status ${res.status}). Controleer je server URL (VITE_API_URL).`);
        return;
      }
      const data = await res.json();
      setQuiz(data);
    } catch (e) {
      setError('Kon geen verbinding maken met de server. Is de client env var VITE_API_URL juist en is de server online?');
    }
  };

  const saveQuiz = async () => {
    try {
      setSaving(true);
      
      // Sort questions: Tussenslides (0) first, then rounds with leaderboards inserted by afterRound
      const sortedQuestions = sortQuestionsForPlay(quiz.questions);
      
      const quizToSave = {
        ...quiz,
        questions: sortedQuestions
      };
      
      const res = await fetch(`${API_BASE}/api/quizzes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizToSave),
      });
      setSaving(false);
      if (!res.ok) {
        setError(`Opslaan mislukt (status ${res.status}).`);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaving(false);
      setError('Kon niet opslaan: geen verbinding met de server.');
    }
  };

  const addQuestion = (type = 'multiple_choice', roundNumber = 1) => {
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
      roundNumber,
    };
    setQuiz({ ...quiz, questions: [...quiz.questions, newQ] });
  };

  const addIntermediateSlide = () => {
    // Use the afterRound of the existing tussenslides group if any, else default 0 (start of quiz)
    const existingSlides = (quiz?.questions || []).filter(q => (q.roundNumber ?? 1) === 0);
    const defaultAfter = existingSlides.length > 0 ? (existingSlides[0].afterRound ?? 0) : 0;
    const newQ = {
      id: `temp-${Date.now()}`,
      questionText: '',
      type: 'info_slide',
      imageUrl: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      correctAnswers: [],
      inputFields: 1,
      timeLimit: 20,
      roundNumber: 0,
      afterRound: defaultAfter,
    };
    const currentQuestions = quiz?.questions || [];
    const updatedQuestions = [...currentQuestions, newQ];
    setQuiz({ ...quiz, questions: updatedQuestions });
  };

  const addLeaderboardSlide = () => {
    // Determine the highest round number to place leaderboard after the last round by default
    const roundNumbers = (quiz.questions || []).map(q => q.roundNumber ?? 1).filter(r => r > 0);
    const maxRound = roundNumbers.length > 0 ? Math.max(...roundNumbers) : 1;
    
    const newQ = {
      id: `temp-${Date.now()}`,
      questionText: '',
      type: 'leaderboard_slide',
      imageUrl: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      correctAnswers: [],
      inputFields: 1,
      timeLimit: 20,
      roundNumber: -1,
      afterRound: maxRound, // Show leaderboard after this round
    };
    setQuiz({ ...quiz, questions: [...quiz.questions, newQ] });
  };

  const addRound = () => {
    const roundNumbers = quiz.questions.map(q => q.roundNumber || 1).filter(r => r > 0);
    const maxRound = roundNumbers.length > 0 ? Math.max(...roundNumbers) : 0;
    addQuestion('multiple_choice', maxRound + 1);
  };

  // Add question to specific round
  const addQuestionToRound = (roundNumber, type = 'multiple_choice') => {
    addQuestion(type, roundNumber);
  };

  // Create new Tussenslides section if it doesn't exist
  const createTussenslidesSection = () => {
    const hasTussenslides = quiz.questions.some(q => (q.roundNumber ?? 1) === 0);
    if (!hasTussenslides) {
      addIntermediateSlide();
    }
  };

  // Create new Tussenstand marker (multiple allowed)
  const createTussenstandSection = () => {
    const roundNumbers = (quiz.questions || []).map(q => q.roundNumber ?? 1).filter(r => r > 0);
    if (roundNumbers.length === 0) {
      alert('Voeg eerst een ronde toe voordat je een tussenstand kunt plaatsen.');
      return;
    }
    addLeaderboardSlide();
  };

  const toggleAllQuestions = () => {
    const allExpanded = Object.keys(expandedQuestions).length > 0 && Object.values(expandedQuestions).every(v => v);
    const newState = {};
    quiz.questions.forEach((_, i) => {
      newState[i] = !allExpanded;
    });
    setExpandedQuestions(newState);
  };

  const toggleRound = (roundNum) => {
    setCollapsedRounds(prev => ({
      ...prev,
      [roundNum]: !prev[roundNum]
    }));
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

  const handleDrop = (index, targetRound) => (e) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const questions = [...quiz.questions];
    const [moved] = questions.splice(dragIndex, 1);
    // Update round number to match target round
    moved.roundNumber = targetRound;
    // Insert at the correct position
    questions.splice(index, 0, moved);
    setQuiz({ ...quiz, questions });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Handle drop on round header (to move slide to that round)
  const handleDropOnRound = (targetRound) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragIndex === null) return;
    
    const questions = [...quiz.questions];
    const [moved] = questions.splice(dragIndex, 1);
    moved.roundNumber = targetRound;
    
    // Simply add at the end and let the grouping handle the display
    questions.push(moved);
    
    setQuiz({ ...quiz, questions });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDuplicate = async (duplicatedQuestion) => {
    // Refresh the quiz to get the updated questions list
    await fetchQuiz();
  };

  // Build sections array for drag & drop
  // Each section represents a draggable unit (Ronde, Tussenslides, or Tussenstand)
  const buildSections = () => {
    if (!quiz?.questions) return [];
    
    const questionsByRound = quiz.questions.reduce((acc, q, index) => {
      const round = q.roundNumber ?? 1;
      if (!acc[round]) acc[round] = [];
      acc[round].push({ question: q, originalIndex: index });
      return acc;
    }, {});

    const sections = [];
    
    // Tussenslides section (roundNumber = 0)
    if (questionsByRound[0] && questionsByRound[0].length > 0) {
      sections.push({
        type: 'tussenslides',
        roundNumber: 0,
        questions: questionsByRound[0],
        order: 0
      });
    }
    
    // Regular rounds (roundNumber > 0)
    const regularRoundNumbers = Object.keys(questionsByRound)
      .map(r => parseInt(r))
      .filter(r => r > 0)
      .sort((a, b) => a - b);
    
    regularRoundNumbers.forEach(roundNum => {
      sections.push({
        type: 'ronde',
        roundNumber: roundNum,
        questions: questionsByRound[roundNum],
        order: roundNum
      });
    });
    
    // Tussenstand section (roundNumber = -1)
    if (questionsByRound[-1] && questionsByRound[-1].length > 0) {
      sections.push({
        type: 'tussenstand',
        roundNumber: -1,
        questions: questionsByRound[-1],
        order: 999 // Always last
      });
    }
    
    return sections.sort((a, b) => a.order - b.order);
  };
  
  const sections = buildSections();

  // Derive slide groups and rounds BEFORE building ordered sections
  // These are used by buildOrderedSections and must be defined first.
  const intermediateSlides = quiz?.questions
    ? quiz.questions.map((q, i) => ({ question: q, originalIndex: i })).filter(({ question: q }) => q.type === 'info_slide')
    : [];
  const leaderboardSlides = quiz?.questions
    ? quiz.questions.map((q, i) => ({ question: q, originalIndex: i })).filter(({ question: q }) => q.type === 'leaderboard_slide')
    : [];
  // questionsByRound only for real questions (not special slides)
  const questionsByRound = quiz?.questions ? quiz.questions.reduce((acc, q, index) => {
    if (q.type === 'info_slide' || q.type === 'leaderboard_slide') return acc;
    const round = q.roundNumber ?? 1;
    if (!acc[round]) acc[round] = [];
    acc[round].push({ question: q, originalIndex: index });
    return acc;
  }, {}) : {};
  const regularRounds = Object.keys(questionsByRound).filter(r => parseInt(r) > 0).sort((a, b) => parseInt(a) - parseInt(b));

  // Build ordered list of all sections for rendering
  const buildOrderedSections = () => {
    if (!quiz?.questions) return [];
    
    const result = [];
    
    // Tussenslides before round 1
    const tussenslidesStart = intermediateSlides.filter(({ question: q }) => (q.afterRound ?? 0) === 0);
    if (tussenslidesStart.length > 0) {
      result.push({ type: 'tussenslides', afterRound: 0, slides: tussenslidesStart });
    }
    
    // For each regular round
    regularRounds.forEach(roundNum => {
      const rNum = parseInt(roundNum);
      result.push({ type: 'round', roundNumber: rNum, questions: questionsByRound[roundNum] });
      
      // Tussenslides after this round
      const tussenslidesAfter = intermediateSlides.filter(({ question: q }) => (q.afterRound ?? 0) === rNum);
      if (tussenslidesAfter.length > 0) {
        result.push({ type: 'tussenslides', afterRound: rNum, slides: tussenslidesAfter });
      }
      
      // Tussenstanden after this round
      const tussenstandenAfter = leaderboardSlides.filter(({ question: q }) => {
        const defaultAfter = Math.max(...regularRounds.map(r => parseInt(r)), 1);
        return (q.afterRound ?? defaultAfter) === rNum;
      });
      tussenstandenAfter.forEach(({ question: q, originalIndex: i }) => {
        result.push({ type: 'tussenstand', index: i, question: q });
      });
    });
    
    return result;
  };

  const orderedSections = buildOrderedSections();

  // Get unique ID for a section
  const getSectionId = (section) => {
    if (section.type === 'round') return `round-${section.roundNumber}`;
    if (section.type === 'tussenslides') return `tussenslides-${section.afterRound}`;
    if (section.type === 'tussenstand') return `tussenstand-${section.index}`;
    return null;
  };

  // Handle section drop - reorder sections and update quiz
  const handleSectionDrop = (dropIndex) => {
    if (!draggedSectionId) return;
    
    // Find dragged section
    const draggedIndex = orderedSections.findIndex(s => getSectionId(s) === draggedSectionId);
    if (draggedIndex === -1) return;
    
    const draggedSection = orderedSections[draggedIndex];
    
    // Create new ordered list
    const newSections = [...orderedSections];
    newSections.splice(draggedIndex, 1);
    
    // Adjust drop index if dragging down
    const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newSections.splice(adjustedDropIndex, 0, draggedSection);
    
    // Now rebuild quiz.questions based on newSections order
    const updatedQuestions = [...quiz.questions];
    
    // Update afterRound for tussenslides and tussenstanden based on their new position
    let currentRound = 0;
    newSections.forEach((section, idx) => {
      if (section.type === 'round') {
        currentRound = section.roundNumber;
      } else if (section.type === 'tussenslides') {
        // Update afterRound for all slides in this group
        section.slides.forEach(({ originalIndex }) => {
          updatedQuestions[originalIndex].afterRound = currentRound;
        });
      } else if (section.type === 'tussenstand') {
        // Update afterRound for this tussenstand
        updatedQuestions[section.index].afterRound = currentRound;
      }
    });
    
    setQuiz({ ...quiz, questions: updatedQuestions });
    setDraggedSectionId(null);
    setDropZoneHover(null);
  };
  
    // (moved earlier) Derived slide groups and round maps used by ordered sections


  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-[#0f0f23] to-purple-900 p-6">
        <div className="max-w-xl w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-quiz-red font-bold mb-2">Er ging iets mis</p>
          <p className="text-gray-300 mb-4">{error}</p>
          <Link to="/admin" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl inline-block">Terug naar dashboard</Link>
        </div>
      </div>
    );
  }

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
          <div className="flex-1">
            <input
              value={quiz.title}
              onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
              className="w-full text-2xl font-black bg-transparent border-b-2 border-transparent focus:border-primary-500 outline-none py-1"
              placeholder="Quiz titel..."
            />
            <div className="text-sm text-gray-400 mt-1 flex flex-wrap gap-x-3">
              {(() => {
                const realQuestions = quiz.questions.filter(q => q.type === 'multiple_choice' || q.type === 'free_type');
                const infoSlides = quiz.questions.filter(q => q.type === 'info_slide');
                const leaderboards = quiz.questions.filter(q => q.type === 'leaderboard_slide');
                const totalSeconds = realQuestions.reduce((sum, q) => sum + (q.timeLimit || 20), 0);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                const durationText = minutes > 0 ? `${minutes}m${seconds > 0 ? ` ${seconds}s` : ''}` : `${seconds}s`;
                return (
                  <>
                    <span>{realQuestions.length} {realQuestions.length === 1 ? 'vraag' : 'vragen'}</span>
                    <span>•</span>
                    <span className="text-quiz-green">{durationText}</span>
                    <span>•</span>
                    <span>{regularRounds.length} {regularRounds.length === 1 ? 'ronde' : 'rondes'}</span>
                    {infoSlides.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-purple-300">{infoSlides.length} info</span>
                      </>
                    )}
                    {leaderboards.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-yellow-300">{leaderboards.length} tussenstand</span>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
          <button
            onClick={toggleAllQuestions}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors flex items-center gap-2"
            title="Alles in/uitklappen"
          >
            {Object.values(expandedQuestions).some(v => v) ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
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

        {/* Empty state when no sections */}
        {orderedSections.length === 0 && (
          <div className="mb-6 border-2 border-dashed border-primary-500/30 rounded-2xl p-10 text-center text-gray-400">
            <Hash className="w-10 h-10 mx-auto mb-3 text-primary-400/50" />
            <p className="text-base font-semibold mb-1">Nog geen rondes</p>
            <p className="text-sm text-gray-500 mb-4">Start je quiz door een ronde toe te voegen</p>
            <button
              onClick={addRound}
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl font-medium transition-colors inline-flex items-center gap-2 text-sm"
            >
              <Hash className="w-4 h-4" />
              Eerste Ronde Maken
            </button>
          </div>
        )}

        {/* NEW UNIFIED SECTION RENDERING WITH DROP ZONES */}
        <div className="space-y-0">
          {orderedSections.map((section, sectionIdx) => {
            const sectionId = getSectionId(section);
            const isDragging = draggedSectionId === sectionId;
            
            return (
              <div key={sectionId || `section-${sectionIdx}`}>
                {/* Drop zone BEFORE this section */}
                <div
                  className={`h-3 transition-all ${
                    dropZoneHover === sectionIdx
                      ? 'h-12 bg-primary-500/20 border-2 border-dashed border-primary-400 rounded-xl mb-3'
                      : draggedSectionId
                      ? 'hover:h-8 hover:bg-primary-500/10 hover:border border-dashed hover:border-primary-300/50 hover:rounded-xl'
                      : ''
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDropZoneHover(sectionIdx);
                  }}
                  onDragLeave={() => setDropZoneHover(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSectionDrop(sectionIdx);
                  }}
                />

                {/* THE SECTION ITSELF */}
                <div className={`mb-3 ${isDragging ? 'opacity-30' : ''}`}>
                  {section.type === 'round' && (
                    <div className="space-y-3">
                      {/* Round Header - Draggable */}
                      <div
                        draggable="true"
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedSectionId(sectionId);
                        }}
                        onDragEnd={() => {
                          setDraggedSectionId(null);
                          setDropZoneHover(null);
                        }}
                        className="flex items-center gap-3 px-4 py-2 bg-primary-600/20 border border-primary-500/30 rounded-xl cursor-grab active:cursor-grabbing hover:bg-primary-600/30 transition-all"
                        onClick={() => toggleRound(section.roundNumber)}
                      >
                        <GripVertical className="w-5 h-5 text-gray-500" />
                        <Hash className="w-5 h-5 text-primary-400" />
                        <span className="font-bold text-lg text-primary-300">Ronde {section.roundNumber}</span>
                        <span className="text-sm text-gray-400">
                          ({section.questions.length} {section.questions.length === 1 ? 'vraag' : 'vragen'})
                        </span>
                        
                        <div className="ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => addQuestionToRound(section.roundNumber, 'multiple_choice')}
                            className="px-2 py-1 bg-primary-600/30 hover:bg-primary-600/50 border border-primary-500/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Meerkeuze
                          </button>
                          <button
                            onClick={() => addQuestionToRound(section.roundNumber, 'free_type')}
                            className="px-2 py-1 bg-primary-600/30 hover:bg-primary-600/50 border border-primary-500/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Open vraag
                          </button>
                          {collapsedRounds[section.roundNumber] ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Questions in round */}
                      {!collapsedRounds[section.roundNumber] && section.questions.map(({ question: q, originalIndex: i }) => (
                        <QuestionForm
                          key={q.id || i}
                          question={{ ...q, quizId: quiz.id }}
                          onChange={(updated) => updateQuestion(i, updated)}
                          onDelete={() => deleteQuestion(i)}
                          onDuplicate={handleDuplicate}
                          index={i}
                          onDragStart={handleDragStart(i)}
                          onDragOver={handleDragOver(i)}
                          onDrop={handleDrop(i, section.roundNumber)}
                          onDragEnd={handleDragEnd}
                          isDragging={dragIndex === i}
                          isDragOver={dragOverIndex === i}
                          expanded={expandedQuestions[i] === true}
                          onToggleExpand={() => setExpandedQuestions(prev => ({ ...prev, [i]: !prev[i] }))}
                        />
                      ))}
                    </div>
                  )}

                  {section.type === 'tussenslides' && (
                    <div className="space-y-3">
                      {/* Tussenslides Header - Draggable */}
                      <div
                        draggable="true"
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedSectionId(sectionId);
                        }}
                        onDragEnd={() => {
                          setDraggedSectionId(null);
                          setDropZoneHover(null);
                        }}
                        className="flex items-center gap-3 px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-xl cursor-grab active:cursor-grabbing hover:bg-purple-600/30 transition-all"
                        onClick={() => {
                          const collapseKey = `tussenslides-${section.afterRound}`;
                          setCollapsedRounds(prev => ({ ...prev, [collapseKey]: !prev[collapseKey] }));
                        }}
                      >
                        <GripVertical className="w-5 h-5 text-gray-500" />
                        <FileText className="w-5 h-5 text-purple-400" />
                        <span className="font-bold text-lg text-purple-300">Tussenslides</span>
                        <span className="text-sm text-gray-400">
                          ({section.slides.length} {section.slides.length === 1 ? 'slide' : 'slides'})
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {section.afterRound === 0 ? 'Voor ronde 1' : `Na ronde ${section.afterRound}`}
                        </span>

                        <div className="ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              const newQ = {
                                id: `temp-${Date.now()}`,
                                questionText: '',
                                type: 'info_slide',
                                imageUrl: '',
                                options: ['', '', '', ''],
                                correctAnswer: 0,
                                correctAnswers: [],
                                inputFields: 1,
                                timeLimit: 20,
                                roundNumber: 0,
                                afterRound: section.afterRound,
                              };
                              setQuiz({ ...quiz, questions: [...quiz.questions, newQ] });
                            }}
                            className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                          >
                            <Plus className="w-4 h-4" />
                            Info slide
                          </button>
                          {collapsedRounds[`tussenslides-${section.afterRound}`] ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Slides in group */}
                      {!collapsedRounds[`tussenslides-${section.afterRound}`] && section.slides.map(({ question: q, originalIndex: i }) => (
                        <QuestionForm
                          key={q.id || i}
                          question={{ ...q, quizId: quiz.id }}
                          onChange={(updated) => updateQuestion(i, updated)}
                          onDelete={() => deleteQuestion(i)}
                          onDuplicate={handleDuplicate}
                          index={i}
                          onDragStart={handleDragStart(i)}
                          onDragOver={handleDragOver(i)}
                          onDrop={handleDrop(i, 0)}
                          onDragEnd={handleDragEnd}
                          isDragging={dragIndex === i}
                          isDragOver={dragOverIndex === i}
                          expanded={expandedQuestions[i] === true}
                          onToggleExpand={() => setExpandedQuestions(prev => ({ ...prev, [i]: !prev[i] }))}
                        />
                      ))}
                    </div>
                  )}

                  {section.type === 'tussenstand' && (
                    <div
                      draggable="true"
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggedSectionId(sectionId);
                      }}
                      onDragEnd={() => {
                        setDraggedSectionId(null);
                        setDropZoneHover(null);
                      }}
                      className="flex items-center gap-3 px-4 py-2 bg-yellow-600/20 border border-yellow-500/30 rounded-xl cursor-grab active:cursor-grabbing hover:bg-yellow-600/30 transition-all"
                    >
                      <GripVertical className="w-5 h-5 text-gray-500" />
                      <Trophy className="w-5 h-5 text-yellow-400" />
                      <span className="font-bold text-lg text-yellow-300">Tussenstand</span>
                      <span className="text-xs text-gray-500 ml-2">
                        Toont automatisch de scores na ronde {section.question.afterRound || 1}
                      </span>
                      <button
                        onClick={() => deleteQuestion(section.index)}
                        className="ml-auto p-1.5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Drop zone AFTER last section */}
          {orderedSections.length > 0 && (
            <div
              className={`h-3 transition-all ${
                dropZoneHover === orderedSections.length
                  ? 'h-12 bg-primary-500/20 border-2 border-dashed border-primary-400 rounded-xl'
                  : draggedSectionId
                  ? 'hover:h-8 hover:bg-primary-500/10 hover:border border-dashed hover:border-primary-300/50 hover:rounded-xl'
                  : ''
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDropZoneHover(orderedSections.length);
              }}
              onDragLeave={() => setDropZoneHover(null)}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSectionDrop(orderedSections.length);
              }}
            />
          )}
        </div>
        {/* Add section buttons */}
        <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wide">
            Nieuwe sectie toevoegen
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={addRound}
              className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 border border-primary-500 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
              title="Nieuwe ronde met vragen"
            >
              <Hash className="w-4 h-4" />
              Ronde
            </button>
            <button
              onClick={createTussenslidesSection}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 border border-purple-500 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
              title="Tussenslides sectie voor intro/outro/info"
            >
              <FileText className="w-4 h-4" />
              Tussenslides
            </button>
            <button
              onClick={createTussenstandSection}
              className="px-4 py-2.5 bg-yellow-600 hover:bg-yellow-700 border border-yellow-500 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
              title="Tussenstand sectie - toont automatisch scores"
            >
              <Trophy className="w-4 h-4" />
              Tussenstand
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
