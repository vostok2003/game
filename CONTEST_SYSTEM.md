# 🏆 Contest System Documentation

## Overview

The contest system provides LeetCode-style weekly math contests with the following features:

- **Scheduled Contests**: Every Thursday at 8:00 PM (configurable timezone)
- **Duration**: 10 minutes per contest
- **Questions**: 20 math problems with progressive difficulty
- **Scoring**: Points based on difficulty (Easy: 1pt, Medium: 2pts, Hard: 3pts)
- **Real-time Leaderboard**: Live rankings during and after contests
- **Email Notifications**: Sent 10 minutes before contest starts
- **Badge System**: Performance-based badges and achievements
- **Results & Analytics**: Detailed performance analysis

## 🚀 Quick Start

### 1. Environment Setup

Copy the environment template:
```bash
cp server/.env.example server/.env
```

Configure your `.env` file with:
- Database connection
- SMTP settings for email notifications
- Contest timezone and schedule

### 2. Start the Server

```bash
cd server
npm install
npm run dev
```

The contest scheduler will automatically start and:
- Create next Thursday's contest
- Set up cron jobs for notifications and finalization

### 3. Test the System

Create a test contest for immediate testing:
```bash
cd server
node scripts/createTestContest.js
```

## 📋 Features

### Contest Flow

1. **Registration Phase**
   - Users can register for upcoming contests
   - Registration closes when contest starts
   - Email notifications sent 10 minutes before

2. **Live Contest**
   - 20 questions presented one by one
   - Progressive difficulty (5 easy, 10 medium, 5 hard)
   - Real-time answer submission
   - Time tracking per question
   - Navigation between questions

3. **Results & Leaderboard**
   - Automatic scoring and ranking
   - Badge assignment based on performance
   - Detailed answer review
   - Performance analytics

### Badge System

- 🏆 **Winner**: 1st place
- 🥉 **Top 3**: Top 3 finishers
- 🏅 **Top 10**: Top 10 finishers
- ⭐ **Top Performer**: Top 10% percentile
- 🎯 **Master**: 18+ correct answers
- 🔥 **Expert**: 15+ correct answers
- 📈 **Advanced**: 10+ correct answers
- 📊 **Intermediate**: 5+ correct answers
- 🎪 **Participant**: 1+ correct answers

## 🛠️ Configuration

### Contest Schedule

Configure in `.env`:
```env
CONTEST_TIMEZONE=Asia/Kolkata
CONTEST_WEEKDAY_NUM=4    # Thursday (0=Sunday, 6=Saturday)
CONTEST_HOUR=20          # 8:00 PM (24-hour format)
CONTEST_MINUTE=0         # :00 minutes
CONTEST_DURATION_MINUTES=10   # 10 minutes
CONTEST_QUESTION_COUNT=20
```

### Email Notifications

Configure SMTP settings:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=Math Blitz <your-email@gmail.com>
```

For Gmail, use App Passwords instead of your regular password.

## 📁 File Structure

```
server/
├── models/
│   ├── Contest.js          # Contest schema
│   └── ContestAttempt.js   # User attempt schema
├── controllers/
│   └── ContestController.js # Contest business logic
├── routes/
│   └── contest.js          # API endpoints
├── utils/
│   └── contestScheduler.js # Cron jobs & scheduling
└── scripts/
    └── createTestContest.js # Testing utility

react-app/src/
├── components/
│   └── WeeklyContest.jsx   # Home page contest widget
├── pages/
│   ├── ContestPage.jsx     # Contest taking interface
│   └── ContestResults.jsx  # Results & leaderboard
└── App.jsx                 # Updated with contest routes
```

## 🔌 API Endpoints

### Public Endpoints
- `GET /api/contest/next` - Get next upcoming contest
- `GET /api/contest/current` - Get currently live contest
- `GET /api/contest/leaderboard?contestId=X` - Get contest leaderboard
- `GET /api/contest/stats?contestId=X` - Get contest statistics

### Protected Endpoints (Require Authentication)
- `POST /api/contest/register` - Register for contest
- `POST /api/contest/start` - Start contest attempt
- `POST /api/contest/submit-answer` - Submit individual answer
- `POST /api/contest/submit` - Submit final contest
- `GET /api/contest/history` - Get user's contest history

## 🎯 Usage Examples

### Register for Contest
```javascript
const response = await api.post('/api/contest/register', {
  contestId: 'contest-id-here'
});
```

### Start Contest
```javascript
const response = await api.post('/api/contest/start', {
  contestId: 'contest-id-here'
});
// Returns: { attempt, questions }
```

### Submit Answer
```javascript
const response = await api.post('/api/contest/submit-answer', {
  contestId: 'contest-id-here',
  questionIndex: 0,
  answer: 42,
  timeSpent: 30
});
```

## 🔧 Troubleshooting

### Contest Not Appearing
1. Check if contest scheduler is running
2. Verify database connection
3. Check server logs for cron job errors

### Email Notifications Not Working
1. Verify SMTP configuration in `.env`
2. Test email credentials
3. Check firewall/security settings
4. For Gmail, ensure App Passwords are enabled

### Questions Not Loading
1. Verify `questionGenerator.js` is working
2. Check contest creation logs
3. Ensure contest has questions array populated

## 🚦 Testing

### Create Test Contest
```bash
node server/scripts/createTestContest.js
```

### Manual Contest Creation
```javascript
import { createContest } from './controllers/ContestController.js';

const contest = await createContest({
  openAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
  durationMinutes: 60,
  questionCount: 10,
  title: 'Test Contest'
});
```

## 📈 Monitoring

The system logs important events:
- Contest creation
- User registrations
- Email notifications sent
- Contest finalization
- Badge assignments

Monitor server logs for:
```
Contest scheduler started
Created next Wednesday contest: [ID]
Notification sent for contest: [ID]
Contest finalized: [participants] participants
```

## 🔄 Maintenance

### Weekly Tasks
- Monitor contest creation (automated)
- Check email delivery rates
- Review badge assignments
- Analyze participation metrics

### Database Cleanup
Consider archiving old contest data periodically:
```javascript
// Archive contests older than 6 months
await Contest.deleteMany({
  closeTime: { $lt: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) }
});
```

## 📊 Contest Progress & Analytics

The system now includes comprehensive progress tracking for users:

### **Progress Features:**
- **Performance Charts**: Line charts showing score trends over time
- **Accuracy Analytics**: Bar charts displaying accuracy improvements
- **Overall Statistics**: Doughnut charts for correct vs incorrect answers
- **Badge Visualization**: Display of all earned badges with emojis
- **Contest History**: Detailed list of all past contest performances
- **Question Review**: Full review of past contest questions with explanations

### **Progress API Endpoints:**
- `GET /api/contest/history` - Get user's complete contest history with analytics
- `GET /api/contest/past/:contestId` - Get detailed past contest with questions and answers

### **Progress Component Features:**
1. **Overview Tab**: 
   - Key statistics (total contests, avg score, avg accuracy, badges)
   - Score trend line chart
   - Accuracy bar chart
   - Performance doughnut chart
   - Badge collection display

2. **History Tab**:
   - Chronological list of all contests
   - Click any contest to view detailed results
   - Performance metrics for each contest
   - Badge indicators

3. **Details View**:
   - Complete question-by-question review
   - User's answers vs correct answers
   - Time spent per question
   - Difficulty indicators
   - Explanations for each question
   - Contest summary statistics

### **Chart Dependencies:**
```bash
npm install chart.js@^4.4.0 react-chartjs-2@^5.2.0
```

## 🎉 Success!

Your contest system is now fully integrated with comprehensive progress tracking! Users will see:

- Contest widget on the home page
- Real-time progress charts and analytics
- Detailed past contest reviews
- Badge system with visual indicators
- Performance trends over time

The system will automatically:
- Create new contests every Thursday at 8:00 PM
- Send email notifications (10 mins before, 2 mins before, immediate for late registrations)
- Update contest statuses
- Award badges based on performance
- Generate leaderboards
- Track detailed user progress and analytics

**New Progress Features:**
- 📈 Interactive charts showing performance trends
- 🏆 Badge collection and achievement tracking
- 📋 Complete contest history with detailed analytics
- 🔍 Question-by-question review of past contests
- 📊 Personalized performance insights

Happy coding! 🚀
