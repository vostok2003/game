import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import api from "../utils/api";
import { toast } from "react-toastify";

// Mathematical Symbols Animation Component
const MathSymbolsAnimation = () => {
  const [symbols, setSymbols] = useState([]);
  
  const mathSymbols = ['∑', '∫', '∆', '∞', 'π', '√', '∂', '∇', '∈', '∀', '∃', '⊂', '⊃', '∪', '∩', '≡', '≠', '≤', '≥', '±', '×', '÷', '∝', '∴', '∵', 'α', 'β', 'γ', 'θ', 'λ', 'μ', 'σ', 'φ', 'ψ', 'ω'];

  useEffect(() => {
    const createSymbol = () => ({
      id: Math.random(),
      left: Math.random() * 100,
      animationDuration: Math.random() * 10 + 8,
      opacity: Math.random() * 0.1 + 0.05,
      size: Math.random() * 12 + 8,
      symbol: mathSymbols[Math.floor(Math.random() * mathSymbols.length)],
      rotation: Math.random() * 360,
    });

    const initialSymbols = Array.from({ length: 6 }, createSymbol);
    setSymbols(initialSymbols);

    const interval = setInterval(() => {
      setSymbols(prev => {
        const newSymbols = [...prev];
        if (newSymbols.length < 10) {
          newSymbols.push(createSymbol());
        }
        return newSymbols;
      });
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
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

export default function ContestPage() {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const [contest, setContest] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!user) {
      toast.error("Please login to access the contest");
      navigate("/login");
      return;
    }
    
    initializeContest();
  }, [contestId, user]);

  useEffect(() => {
    if (contest && !isSubmitted) {
      const interval = setInterval(updateTimeLeft, 1000);
      return () => clearInterval(interval);
    }
  }, [contest, isSubmitted]);

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentQuestionIndex]);

  const initializeContest = async () => {
    try {
      setLoading(true);
      
      // Start contest attempt
      const response = await api.post("/contest/start", { contestId });
      const { attempt: attemptData, questions: questionsData } = response.data;
      
      setAttempt(attemptData);
      setQuestions(questionsData);
      
      // Load contest details
      const contestRes = await api.get("/contest/current");
      setContest(contestRes.data.contest);

      // If attempt already has answers, load them
      if (attemptData.answers && attemptData.answers.length > 0) {
        const answerMap = {};
        attemptData.answers.forEach(ans => {
          answerMap[ans.questionIndex] = ans.userAnswer;
        });
        setAnswers(answerMap);
        
        // If all questions are answered, show summary
        if (attemptData.answers.length === questionsData.length) {
          setCurrentQuestionIndex(questionsData.length); // Show summary
        }
      }

      if (attemptData.status === 'submitted') {
        setIsSubmitted(true);
        setCurrentQuestionIndex(questionsData.length); // Show results
      }

    } catch (error) {
      console.error("Error initializing contest:", error);
      toast.error(error?.response?.data?.error || "Failed to load contest");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const updateTimeLeft = () => {
    if (!contest) return;

    const now = new Date();
    const closeTime = new Date(contest.closeTime);
    
    if (now >= closeTime) {
      setTimeLeft("Time's up!");
      handleAutoSubmit();
      return;
    }

    const diff = closeTime - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  };

  const handleAnswerSubmit = async () => {
    if (userAnswer === "") {
      toast.error("Please enter an answer");
      return;
    }

    const answer = parseFloat(userAnswer);
    if (isNaN(answer)) {
      toast.error("Please enter a valid number");
      return;
    }

    try {
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
      
      await api.post("/contest/submit-answer", {
        contestId,
        questionIndex: currentQuestionIndex,
        answer,
        timeSpent
      });

      // Update local answers
      setAnswers(prev => ({
        ...prev,
        [currentQuestionIndex]: answer
      }));

      // Move to next question or summary
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setUserAnswer("");
      } else {
        // All questions answered, show summary
        setCurrentQuestionIndex(questions.length);
      }

      toast.success("Answer submitted!");
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast.error(error?.response?.data?.error || "Failed to submit answer");
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setUserAnswer(answers[currentQuestionIndex - 1] || "");
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setUserAnswer(answers[currentQuestionIndex + 1] || "");
    }
  };

  const handleFinalSubmit = async () => {
    if (Object.keys(answers).length === 0) {
      toast.error("Please answer at least one question before submitting");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to submit your contest? You have answered ${Object.keys(answers).length} out of ${questions.length} questions. This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);
      const response = await api.post("/contest/submit", { contestId });
      
      toast.success("Contest submitted successfully!");
      setIsSubmitted(true);
      
      // Show results
      navigate(`/contest/${contestId}/results`, { 
        state: { attempt: response.data.attempt } 
      });
    } catch (error) {
      console.error("Error submitting contest:", error);
      toast.error(error?.response?.data?.error || "Failed to submit contest");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = async () => {
    if (isSubmitted) return;
    
    try {
      await api.post("/contest/submit", { contestId });
      toast.info("Contest auto-submitted due to time limit");
      setIsSubmitted(true);
      navigate(`/contest/${contestId}/results`);
    } catch (error) {
      console.error("Error auto-submitting contest:", error);
    }
  };

  const jumpToQuestion = (index) => {
    setCurrentQuestionIndex(index);
    setUserAnswer(answers[index] || "");
  };

  if (loading) {
    return (
      <div className="min-h-screen relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <MathSymbolsAnimation />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-6"></div>
            <div className="text-white font-mono text-lg mb-2">Loading Contest...</div>
            <div className="text-blue-300 font-mono text-sm">∫ problems dx = initializing...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!contest || !questions.length) {
    return (
      <div className="min-h-screen relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <MathSymbolsAnimation />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-400 text-xl font-mono mb-4">Contest ∉ Available Set</div>
            <div className="text-blue-300 font-mono text-sm mb-6">Error: Contest = ∅ (empty set)</div>
            <button
              onClick={() => navigate("/")}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all font-mono"
            >
              Return Home()
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show summary/review page
  if (currentQuestionIndex >= questions.length) {
    return (
      <div className="min-h-screen relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 py-8">
        <MathSymbolsAnimation />
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">∑</span>
                </div>
                <h1 className="text-2xl font-bold text-white font-mono">Contest Summary</h1>
              </div>
              <div className="text-right">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <div className="text-sm text-blue-200 font-mono">Time Remaining</div>
                  <div className="text-lg font-mono font-bold text-red-400">{timeLeft}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 p-4 rounded-xl text-center">
                <div className="text-3xl font-bold text-blue-300 font-mono">{Object.keys(answers).length}</div>
                <div className="text-sm text-blue-200 font-mono mt-1">Answered ∈ ℕ</div>
              </div>
              <div className="bg-gray-500/20 backdrop-blur-sm border border-gray-400/30 p-4 rounded-xl text-center">
                <div className="text-3xl font-bold text-gray-300 font-mono">{questions.length - Object.keys(answers).length}</div>
                <div className="text-sm text-gray-200 font-mono mt-1">Remaining ∈ ℕ</div>
              </div>
              <div className="bg-green-500/20 backdrop-blur-sm border border-green-400/30 p-4 rounded-xl text-center">
                <div className="text-3xl font-bold text-green-300 font-mono">{questions.length}</div>
                <div className="text-sm text-green-200 font-mono mt-1">|Questions| = 20</div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-bold text-white font-mono mb-4">Question Matrix → Q[i,j]</h3>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => jumpToQuestion(index)}
                    className={`w-12 h-12 rounded-xl text-sm font-bold font-mono border-2 transition-all ${
                      answers.hasOwnProperty(index)
                        ? 'bg-green-500/30 border-green-400 text-green-300 hover:bg-green-500/40'
                        : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20'
                    } backdrop-blur-sm`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-xs text-blue-300/80 font-mono text-center">
                Progress: {Math.round((Object.keys(answers).length / questions.length) * 100)}% = {Object.keys(answers).length}/{questions.length}
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setCurrentQuestionIndex(0)}
                className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/20 transition-all font-mono"
              >
                Review Questions[]
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={submitting || isSubmitted}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono"
              >
                {submitting ? "Computing..." : "Execute Submit()"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <MathSymbolsAnimation />
      
      {/* Contest Header */}
      <header className="relative z-10 bg-gradient-to-r from-blue-900/80 to-indigo-900/80 backdrop-blur-lg border-b border-white/10 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">∫</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white font-sans">{contest.title}</h1>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-blue-200 font-mono">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                  <span className="text-xs text-blue-300/70">•</span>
                  <span className="text-sm text-green-300 font-medium">
                    {Object.keys(answers).length} answered
                  </span>
                </div>
              </div>
            </div>
            
            {/* Timer and Progress */}
            <div className="flex items-center space-x-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 shadow-lg">
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div className="text-xs text-blue-200 font-medium">TIME REMAINING</div>
                    <div className="text-xl font-mono font-bold text-white">{timeLeft}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1 bg-white/5">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
          ></div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl p-5 sticky top-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-sm">Q</span>
                </div>
                <h3 className="font-bold text-white text-lg">Questions</h3>
                <span className="ml-auto text-sm text-blue-300 font-mono">
                  {Object.keys(answers).length}/{questions.length}
                </span>
              </div>
              
              <div className="grid grid-cols-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
                {questions.map((_, index) => {
                  const isCurrent = index === currentQuestionIndex;
                  const isAnswered = answers.hasOwnProperty(index);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => jumpToQuestion(index)}
                      className={`relative w-full aspect-square rounded-xl transition-all duration-200 flex items-center justify-center font-medium ${
                        isCurrent 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 transform scale-105 z-10 border-2 border-blue-400'
                          : isAnswered
                          ? 'bg-green-500/20 text-green-300 border-2 border-green-500/40 hover:bg-green-500/30 hover:border-green-400/60'
                          : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80'
                      }`}
                    >
                      {index + 1}
                      {isAnswered && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              
              <div className="mt-6 pt-5 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-200">Progress</span>
                  <span className="text-sm font-medium text-blue-300">
                    {Math.round((Object.keys(answers).length / questions.length) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-4">
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* Question Header */}
              <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-blue-900/30 to-indigo-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
                      <span className="text-white font-bold">Q</span>
                    </div>
                    <h2 className="text-xl font-bold text-white">
                      Question {currentQuestionIndex + 1}
                    </h2>
                  </div>
                  <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 text-blue-300 px-4 py-2 rounded-lg text-sm font-medium">
                    {currentQuestion.points} Points
                  </div>
                </div>
              </div>
              
              {/* Question Content */}
              <div className="p-6">
                <div className="text-xl text-white mb-8 p-6 bg-white/5 rounded-xl border border-white/5 font-sans leading-relaxed">
                  {currentQuestion.question}
                </div>

                {/* Answer Input */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-blue-200 mb-3">
                    Your Answer
                  </label>
                  <div className="relative max-w-md">
                    <input
                      type="number"
                      step="any"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-blue-300/50 transition-all duration-200"
                      placeholder="Enter your answer..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAnswerSubmit();
                        }
                      }}
                      autoFocus
                    />
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-300/60 font-mono text-sm">
                      ∈ ℝ
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-blue-300/70">
                    Enter a numerical value. You can use decimal points if needed.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button
                    onClick={handleAnswerSubmit}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Submit Answer</span>
                  </button>
                  
                  {currentQuestionIndex === questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestionIndex(questions.length)}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-green-500/20"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>Review & Submit</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleNextQuestion}
                      disabled={currentQuestionIndex === questions.length - 1}
                      className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>Skip for Now</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="px-6 py-4 border-t border-white/5 bg-gradient-to-r from-slate-900/50 to-blue-900/30">
                <div className="flex items-center justify-between">
                  <button
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="inline-flex items-center space-x-2 text-blue-300 hover:text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Previous</span>
                  </button>
                  
                  <div className="text-sm text-blue-300/80 font-medium">
                    {currentQuestionIndex + 1} of {questions.length}
                  </div>
                  
                  <button
                    onClick={handleNextQuestion}
                    disabled={currentQuestionIndex === questions.length - 1}
                    className="inline-flex items-center space-x-2 text-blue-300 hover:text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Next</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
  );
}
