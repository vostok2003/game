import mongoose from "mongoose";

const ContestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "Weekly Math Contest" },
  openTime: { type: Date, required: true },
  closeTime: { type: Date, required: true },
  duration: { type: Number, required: true }, // in seconds
  questions: [{
    question: { type: String, required: true },
    answer: { type: Number, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    points: { type: Number, default: 1 }
  }],
  registeredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  maxParticipants: { type: Number, default: 1000 },
  status: { 
    type: String, 
    enum: ['upcoming', 'live', 'completed'], 
    default: 'upcoming' 
  },
  notificationSent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
ContestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual to check if contest is currently live
ContestSchema.virtual('isLive').get(function() {
  const now = new Date();
  return now >= this.openTime && now <= this.closeTime;
});

// Virtual to check if contest is upcoming
ContestSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  return now < this.openTime;
});

// Virtual to check if contest is completed
ContestSchema.virtual('isCompleted').get(function() {
  const now = new Date();
  return now > this.closeTime;
});

export default mongoose.model("Contest", ContestSchema);
