// server/models/DailyComment.js
import mongoose from "mongoose";

const VoteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  voteType: { type: String, enum: ["up", "down"], required: true },
  createdAt: { type: Date, default: Date.now }
});

const DailyCommentSchema = new mongoose.Schema({
  date: { type: String, required: true },
  sectionKey: { type: String, required: true },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  text: { 
    type: String, 
    required: true,
    maxlength: 1000,
    trim: true
  },
  votes: [VoteSchema],
  voteScore: { 
    type: Number, 
    default: 0,
    min: -1000,
    max: 1000
  },
  upvotes: { 
    type: Number, 
    default: 0 
  },
  downvotes: { 
    type: Number, 
    default: 0 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  editedAt: { 
    type: Date 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
DailyCommentSchema.index({ date: 1, sectionKey: 1 });
DailyCommentSchema.index({ userId: 1 });
DailyCommentSchema.index({ voteScore: -1 });
DailyCommentSchema.index({ createdAt: -1 });

// Virtual for user info
DailyCommentSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
  options: { select: 'name rating avatar' }
});

// Pre-save hook to update vote counts
DailyCommentSchema.pre('save', function(next) {
  const upvotes = this.votes.filter(v => v.voteType === 'up').length;
  const downvotes = this.votes.filter(v => v.voteType === 'down').length;
  
  this.upvotes = upvotes;
  this.downvotes = downvotes;
  this.voteScore = upvotes - downvotes;
  
  next();
});

export default mongoose.model("DailyComment", DailyCommentSchema);
