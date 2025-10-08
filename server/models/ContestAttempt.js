import mongoose from "mongoose";

const ContestAttemptSchema = new mongoose.Schema({
  contestId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Contest", 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  answers: [{
    questionIndex: { type: Number, required: true },
    userAnswer: { type: Number, required: true },
    correctAnswer: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
    timeSpent: { type: Number, default: 0 }, // in seconds
    points: { type: Number, default: 0 }
  }],
  totalScore: { type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
  wrongCount: { type: Number, default: 0 },
  totalTimeSpent: { type: Number, default: 0 }, // in seconds
  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date },
  status: { 
    type: String, 
    enum: ['in_progress', 'submitted', 'timeout'], 
    default: 'in_progress' 
  },
  rank: { type: Number }, // Will be calculated after contest ends
  percentile: { type: Number }, // Will be calculated after contest ends
  badges: [{ type: String }] // Badges earned from this contest
}, { 
  timestamps: true 
});

// Ensure one attempt per user per contest
ContestAttemptSchema.index({ contestId: 1, userId: 1 }, { unique: true });

// Calculate total score before saving
ContestAttemptSchema.pre('save', function(next) {
  if (this.answers && this.answers.length > 0) {
    this.totalScore = this.answers.reduce((sum, answer) => sum + answer.points, 0);
    this.correctCount = this.answers.filter(answer => answer.isCorrect).length;
    this.wrongCount = this.answers.filter(answer => !answer.isCorrect).length;
    this.totalTimeSpent = this.answers.reduce((sum, answer) => sum + answer.timeSpent, 0);
  }
  next();
});

export default mongoose.model("ContestAttempt", ContestAttemptSchema);
