import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import api from '../utils/api';

// Mathematical Symbols Animation Component
const MathSymbolsAnimation = () => {
  const [symbols, setSymbols] = useState([]);
  
  const mathSymbols = ['∑', '∫', '∆', '∞', 'π', '√', '∂', '∇', '∈', '∀', '∃', '⊂', '⊃', '∪', '∩', '≡', '≠', '≤', '≥', '±', '×', '÷', '∝', '∴', '∵', 'α', 'β', 'γ', 'θ', 'λ', 'μ', 'σ', 'φ', 'ψ', 'ω'];

  useEffect(() => {
    const createSymbol = () => ({
      id: Math.random(),
      left: Math.random() * 100,
      animationDuration: Math.random() * 15 + 10,
      opacity: Math.random() * 0.06 + 0.02,
      size: Math.random() * 12 + 8,
      symbol: mathSymbols[Math.floor(Math.random() * mathSymbols.length)],
      rotation: Math.random() * 360,
    });

    const initialSymbols = Array.from({ length: 4 }, createSymbol);
    setSymbols(initialSymbols);

    const interval = setInterval(() => {
      setSymbols(prev => {
        const newSymbols = [...prev];
        if (newSymbols.length < 6) {
          newSymbols.push(createSymbol());
        }
        return newSymbols;
      });
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {symbols.map((symbol) => (
        <div
          key={symbol.id}
          className="absolute animate-float text-blue-200/10 font-bold select-none"
          style={{
            left: `${symbol.left}%`,
            animationDuration: `${symbol.animationDuration}s`,
            opacity: symbol.opacity,
            fontSize: `${symbol.size}px`,
            transform: `rotate(${symbol.rotation}deg)`,
          }}
        >
          {symbol.symbol}
        </div>
      ))}
    </div>
  );
};

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const ContestProgress = ({ user }) => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedContest, setSelectedContest] = useState(null);
  const [contestDetails, setContestDetails] = useState(null);
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'history', 'details'

  useEffect(() => {
    if (user) {
      loadProgress();
    }
  }, [user]);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const response = await api.get('/contest/history');
      setProgress(response.data.progress);
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContestDetails = async (contestId) => {
    try {
      setLoading(true);
      const response = await api.get(`/contest/past/${contestId}`);
      setContestDetails(response.data.contestDetails);
      setSelectedContest(contestId);
      setViewMode('details');
    } catch (error) {
      console.error('Error loading contest details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="relative bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-2xl text-center overflow-hidden">
        <MathSymbolsAnimation />
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">∫</span>
            </div>
            <div className="text-white font-mono font-bold">Analytics Dashboard</div>
          </div>
          <div className="text-blue-200 font-mono text-sm mb-2">
            User ∉ Authenticated → Analytics = ∅
          </div>
          <div className="text-blue-300/60 font-mono text-xs">
            Authentication.required() → Progress.view()
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="relative bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-2xl overflow-hidden">
        <MathSymbolsAnimation />
        <div className="relative z-10 animate-pulse">
          <div className="h-4 bg-white/20 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-white/20 rounded"></div>
            <div className="h-3 bg-white/20 rounded w-5/6"></div>
            <div className="h-3 bg-white/20 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!progress || progress.totalContests === 0) {
    return (
      <div className="relative bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-2xl text-center overflow-hidden">
        <MathSymbolsAnimation />
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">∅</span>
            </div>
            <div className="text-white font-mono font-bold">Progress Analytics</div>
          </div>
          <div className="text-blue-200 font-mono text-sm mb-4">
            Contest History = ∅ (empty set)
          </div>
          <div className="text-blue-300/60 font-mono text-xs mb-2">
            ∀ contest ∈ Participation → Analytics.generate()
          </div>
          <div className="text-blue-300/40 font-mono text-xs">
            Charts ∧ Statistics ∧ Performance Metrics → Available
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const scoreData = {
    labels: progress.history.slice(0, 10).reverse().map((h, i) => `Contest ${i + 1}`),
    datasets: [
      {
        label: 'Score',
        data: progress.history.slice(0, 10).reverse().map(h => h.score),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const accuracyData = {
    labels: progress.history.slice(0, 10).reverse().map((h, i) => `Contest ${i + 1}`),
    datasets: [
      {
        label: 'Accuracy %',
        data: progress.history.slice(0, 10).reverse().map(h => h.accuracy),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
    ],
  };

  const performanceData = {
    labels: ['Correct', 'Incorrect'],
    datasets: [
      {
        data: [
          progress.history.reduce((sum, h) => sum + h.correctAnswers, 0),
          progress.history.reduce((sum, h) => sum + (h.totalQuestions - h.correctAnswers), 0)
        ],
        backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(239, 68, 68, 0.8)'],
        borderColor: ['rgb(34, 197, 94)', 'rgb(239, 68, 68)'],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  const getBadgeEmoji = (badge) => {
    const badgeEmojis = {
      'Winner': '🏆',
      'Top 3': '🥉',
      'Top 10': '🏅',
      'Top Performer': '⭐',
      'Master': '🎯',
      'Expert': '🔥',
      'Advanced': '📈',
      'Intermediate': '📊',
      'Participant': '🎪'
    };
    return badgeEmojis[badge] || '🏅';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Debug chart data
  console.log('Progress data:', progress);
  console.log('Recent history:', progress.history);
  console.log('Score data:', scoreData);

  // Add error boundary for charts
  const renderChart = (ChartComponent, data, options, title) => {
    try {
      return (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">{title}</h4>
          <div className="h-48">
            <ChartComponent data={data} options={options} />
          </div>
        </div>
      );
    } catch (error) {
      console.error(`Error rendering ${title}:`, error);
      return (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">{title}</h4>
          <div className="h-48 flex items-center justify-center bg-gray-50 rounded">
            <div className="text-center text-gray-500">
              <div>Chart Error</div>
              <div className="text-xs mt-1">Check console for details</div>
            </div>
          </div>
        </div>
      );
    }
  };

  if (viewMode === 'details' && contestDetails) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Contest Details</h3>
            <p className="text-sm text-gray-600">{contestDetails.contest.title}</p>
          </div>
          <button
            onClick={() => setViewMode('overview')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to Overview
          </button>
        </div>

        {/* Contest Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{contestDetails.attempt.score}</div>
            <div className="text-xs text-gray-600">Score</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {contestDetails.attempt.correctAnswers}/{contestDetails.attempt.totalQuestions}
            </div>
            <div className="text-xs text-gray-600">Correct</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {contestDetails.attempt.rank || 'N/A'}
            </div>
            <div className="text-xs text-gray-600">Rank</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {formatTime(contestDetails.attempt.totalTime)}
            </div>
            <div className="text-xs text-gray-600">Time</div>
          </div>
        </div>

        {/* Badges */}
        {contestDetails.attempt.badges.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Badges Earned</h4>
            <div className="flex flex-wrap gap-2">
              {contestDetails.attempt.badges.map((badge, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                >
                  {getBadgeEmoji(badge)} {badge}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Questions Review */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-4">Questions Review</h4>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {contestDetails.questions.map((q, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  q.isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Q{q.questionNumber}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      q.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                      q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {q.difficulty}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(q.timeSpent)}
                    </span>
                  </div>
                  <div className={`text-sm font-medium ${
                    q.isCorrect ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {q.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </div>
                </div>
                
                <div className="text-sm text-gray-800 mb-3">{q.question}</div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {q.options.map((option, optIndex) => (
                    <div
                      key={optIndex}
                      className={`p-2 rounded ${
                        optIndex === q.correctAnswer ? 'bg-green-100 border border-green-300' :
                        optIndex === q.userAnswer && !q.isCorrect ? 'bg-red-100 border border-red-300' :
                        'bg-gray-50'
                      }`}
                    >
                      <span className="font-medium">
                        {String.fromCharCode(65 + optIndex)}.
                      </span> {option}
                      {optIndex === q.correctAnswer && (
                        <span className="ml-2 text-green-600">✓</span>
                      )}
                      {optIndex === q.userAnswer && !q.isCorrect && (
                        <span className="ml-2 text-red-600">✗</span>
                      )}
                    </div>
                  ))}
                </div>
                
                {q.explanation && (
                  <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-white/15 via-white/10 to-white/15 backdrop-blur-xl border border-white/30 p-8 rounded-3xl shadow-2xl overflow-hidden">
      <MathSymbolsAnimation />
      
      {/* Enhanced Decorative Elements */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-purple-400/15 to-pink-500/15 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-400/15 to-cyan-500/15 rounded-full blur-2xl"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-r from-green-400/10 to-emerald-500/10 rounded-full blur-xl"></div>
      
      <div className="relative z-10">
        {/* Enhanced Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-2xl">∫</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white font-mono">Progress Analytics</h3>
                <p className="text-blue-200 font-mono text-sm mt-1">Performance.analyze() → Insights & Trends</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-blue-300/80">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Real-time Analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Mathematical Insights</span>
              </div>
            </div>
          </div>
          
          {/* Enhanced Tab Navigation */}
          <div className="flex gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-2 border border-white/20">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-6 py-3 text-sm rounded-xl font-mono transition-all transform hover:scale-105 ${
                viewMode === 'overview' 
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Overview()
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-6 py-3 text-sm rounded-xl font-mono transition-all transform hover:scale-105 ${
                viewMode === 'history' 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              History[]
            </button>
          </div>
        </div>

        {viewMode === 'overview' && (
          <>
            {/* Enhanced Mathematical Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="group relative bg-gradient-to-br from-blue-500/25 to-blue-600/15 backdrop-blur-sm border border-blue-400/40 rounded-2xl p-6 hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-400/20 rounded-full blur-xl"></div>
                <div className="relative z-10 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <span className="text-white font-bold text-lg">∑</span>
                  </div>
                  <div className="text-4xl font-bold text-blue-300 font-mono mb-2">{progress.totalContests}</div>
                  <div className="text-sm text-blue-200 font-mono">|Contests| ∈ ℕ</div>
                  <div className="text-xs text-blue-300/60 font-mono mt-1">Total Participated</div>
                </div>
              </div>
              
              <div className="group relative bg-gradient-to-br from-green-500/25 to-green-600/15 backdrop-blur-sm border border-green-400/40 rounded-2xl p-6 hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-green-400/20 rounded-full blur-xl"></div>
                <div className="relative z-10 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <span className="text-white font-bold text-lg">μ</span>
                  </div>
                  <div className="text-4xl font-bold text-green-300 font-mono mb-2">{progress.avgScore}</div>
                  <div className="text-sm text-green-200 font-mono">μ(Score) ∈ ℝ</div>
                  <div className="text-xs text-green-300/60 font-mono mt-1">Average Score</div>
                </div>
              </div>
              
              <div className="group relative bg-gradient-to-br from-purple-500/25 to-purple-600/15 backdrop-blur-sm border border-purple-400/40 rounded-2xl p-6 hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-purple-400/20 rounded-full blur-xl"></div>
                <div className="relative z-10 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <span className="text-white font-bold text-lg">%</span>
                  </div>
                  <div className="text-4xl font-bold text-purple-300 font-mono mb-2">{progress.avgAccuracy}%</div>
                  <div className="text-sm text-purple-200 font-mono">μ(Accuracy) ∈ [0,100]</div>
                  <div className="text-xs text-purple-300/60 font-mono mt-1">Success Rate</div>
                </div>
              </div>
              
              <div className="group relative bg-gradient-to-br from-yellow-500/25 to-orange-500/15 backdrop-blur-sm border border-yellow-400/40 rounded-2xl p-6 hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-400/20 rounded-full blur-xl"></div>
                <div className="relative z-10 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <span className="text-white font-bold text-lg">🏆</span>
                  </div>
                  <div className="text-4xl font-bold text-yellow-300 font-mono mb-2">{progress.totalBadges}</div>
                  <div className="text-sm text-yellow-200 font-mono">|Badges| ∈ ℕ</div>
                  <div className="text-xs text-yellow-300/60 font-mono mt-1">Achievements</div>
                </div>
              </div>
            </div>

            {/* Enhanced Charts Section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">📈</span>
                  </div>
                  <h4 className="text-lg font-bold text-white font-mono">Score Trend Analysis</h4>
                </div>
                <div className="h-64">
                  {renderChart(Line, scoreData, chartOptions, 'Score Trend')}
                </div>
                <div className="mt-4 text-xs text-blue-300/60 font-mono text-center">
                  f(x) = score progression over time
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">📊</span>
                  </div>
                  <h4 className="text-lg font-bold text-white font-mono">Accuracy Distribution</h4>
                </div>
                <div className="h-64">
                  {renderChart(Bar, accuracyData, chartOptions, 'Accuracy Trend')}
                </div>
                <div className="mt-4 text-xs text-green-300/60 font-mono text-center">
                  Accuracy(%) ∈ [0,100] per contest
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">🎯</span>
                  </div>
                  <h4 className="text-lg font-bold text-white font-mono">Performance Matrix</h4>
                </div>
                <div className="h-64">
                  {renderChart(Doughnut, performanceData, doughnutOptions, 'Overall Performance')}
                </div>
                <div className="mt-4 text-xs text-purple-300/60 font-mono text-center">
                  Correct ∪ Incorrect = Total Answers
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">🏆</span>
                  </div>
                  <h4 className="text-lg font-bold text-white font-mono">Achievement Set</h4>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {progress.badges.map((badge, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/15 transition-all">
                      <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                        <span className="text-lg">{getBadgeEmoji(badge)}</span>
                      </div>
                      <div>
                        <span className="text-white font-mono font-medium">{badge}</span>
                        <div className="text-xs text-blue-300/60 font-mono">Achievement Unlocked</div>
                      </div>
                    </div>
                  ))}
                  {progress.badges.length === 0 && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">🎯</span>
                      </div>
                      <div className="text-blue-300/60 font-mono text-sm">
                        Badges = ∅ (empty set)
                      </div>
                      <div className="text-blue-300/40 font-mono text-xs mt-1">
                        Participate → Earn Achievements
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-xs text-yellow-300/60 font-mono text-center">
                  |Achievements| = {progress.badges.length} badges
                </div>
              </div>
            </div>
        </>
      )}

        {viewMode === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">📚</span>
              </div>
              <h4 className="text-xl font-bold text-white font-mono">Contest History Timeline</h4>
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
              {progress.history.map((contest, index) => (
                <div
                  key={index}
                  className="group relative bg-white/10 backdrop-blur-sm border border-white/20 p-6 rounded-2xl hover:bg-white/15 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                  onClick={() => loadContestDetails(contest.contestId)}
                >
                  {/* Timeline connector */}
                  {index < progress.history.length - 1 && (
                    <div className="absolute left-8 top-16 w-0.5 h-8 bg-gradient-to-b from-blue-400/50 to-transparent"></div>
                  )}
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-bold text-white font-mono">{contest.contestTitle}</div>
                        <div className="text-sm text-blue-300/80 font-mono">
                          {new Date(contest.contestDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-blue-300/60 font-mono">Click to analyze</div>
                      <div className="text-lg">📊</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl p-3 border border-blue-400/30">
                      <div className="text-xs text-blue-200 font-mono mb-1">Score</div>
                      <div className="text-lg font-bold text-blue-300 font-mono">{contest.score}</div>
                    </div>
                    <div className="bg-green-500/20 backdrop-blur-sm rounded-xl p-3 border border-green-400/30">
                      <div className="text-xs text-green-200 font-mono mb-1">Accuracy</div>
                      <div className="text-lg font-bold text-green-300 font-mono">{contest.accuracy}%</div>
                    </div>
                    <div className="bg-purple-500/20 backdrop-blur-sm rounded-xl p-3 border border-purple-400/30">
                      <div className="text-xs text-purple-200 font-mono mb-1">Rank</div>
                      <div className="text-lg font-bold text-purple-300 font-mono">#{contest.rank || 'N/A'}</div>
                    </div>
                    <div className="bg-orange-500/20 backdrop-blur-sm rounded-xl p-3 border border-orange-400/30">
                      <div className="text-xs text-orange-200 font-mono mb-1">Duration</div>
                      <div className="text-lg font-bold text-orange-300 font-mono">{formatTime(contest.totalTime)}</div>
                    </div>
                  </div>
                  
                  {contest.badges.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {contest.badges.map((badge, badgeIndex) => (
                        <span
                          key={badgeIndex}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-yellow-500/20 border border-yellow-400/30 text-yellow-300 font-mono"
                        >
                          {getBadgeEmoji(badge)} {badge}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {progress.history.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">📚</span>
                  </div>
                  <div className="text-blue-300/60 font-mono text-lg mb-2">
                    History = ∅ (empty set)
                  </div>
                  <div className="text-blue-300/40 font-mono text-sm">
                    Participate in contests to build your timeline
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(100vh) rotate(0deg);
          }
          100% {
            transform: translateY(-100px) rotate(360deg);
          }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
      </div>
    </div>
  );
};

export default ContestProgress;
