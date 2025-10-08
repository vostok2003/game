import cron from "node-cron";
import { createContest } from "../controllers/ContestController.js";
import Contest from "../models/Contest.js";
import ContestAttempt from "../models/ContestAttempt.js";
import User from "../models/User.js";
import moment from "moment-timezone";

// Configuration
const TIMEZONE = process.env.CONTEST_TIMEZONE || "Asia/Kolkata";
const CONTEST_DAY = Number(process.env.CONTEST_WEEKDAY_NUM) || 5; // Friday (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
const CONTEST_HOUR = Number(process.env.CONTEST_HOUR) || 15; // 3:00 PM (24-hour format)
const CONTEST_MINUTE = Number(process.env.CONTEST_MINUTE) || 30; // :30
const NOTIFY_MINUTES_BEFORE = Number(process.env.CONTEST_NOTIFY_MIN_MINUTES) || 10; // 10 minutes before
const DURATION_MINUTES = Number(process.env.CONTEST_DURATION_MINUTES) || 10; // 10 minutes
const QUESTION_COUNT = Number(process.env.CONTEST_QUESTION_COUNT) || 20; // Number of questions

// Email transporter
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  
  if (!process.env.SMTP_HOST) {
    console.warn("⚠️  SMTP configuration not found. Email notifications disabled.");
    console.warn("   Add SMTP settings to .env file to enable email notifications");
    return null;
  }

  try {
    transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      } : undefined,
    });

    // Verify the connection
    transporter.verify((error, success) => {
      if (error) {
        console.error("❌ SMTP connection failed:", error.message);
        transporter = null;
      } else {
        console.log("✅ SMTP server connection verified successfully");
      }
    });

    return transporter;
  } catch (error) {
    console.error("❌ Error creating email transporter:", error.message);
    return null;
  }
}

// Send contest notification emails to registered users
export async function sendContestNotification(contest) {
  try {
    const transport = getTransporter();
    if (!transport) {
      console.log("Email transporter not configured. Skipping notifications.");
      return;
    }

    // Get all registered users for this contest with email addresses
    const users = await User.find({ 
      _id: { $in: contest.registeredUsers },
      email: { $exists: true, $ne: null } 
    })
      .select("email name")
      .lean();

    if (!users || users.length === 0) {
      console.log("No users found for contest notification");
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const contestUrl = `${frontendUrl}/?contest=${contest._id}`;
    const contestTime = moment(contest.openTime).tz(TIMEZONE).format("dddd, MMMM Do, h:mm A");

    const emailTemplate = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@mathblitz.app",
      subject: `🏆 Math Contest Starting in 10 Minutes! - ${contestTime}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🏆 Contest Alert!</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">Weekly Math Contest</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Contest starts in 10 minutes!</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <p style="margin: 0; color: #666;"><strong>Start Time:</strong> ${contestTime} (${TIMEZONE})</p>
              <p style="margin: 10px 0 0 0; color: #666;"><strong>Duration:</strong> 10 minutes</p>
              <p style="margin: 10px 0 0 0; color: #666;"><strong>Questions:</strong> 20 math problems</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${contestUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Join Contest Now</a>
            </div>

            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1976d2;">🎯 How it works:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #666;">
                <li>Answer 20 math questions one by one</li>
                <li>Each question has different point values</li>
                <li>Submit your answers and see your score</li>
                <li>Compete on the live leaderboard</li>
                <li>Earn badges based on your performance</li>
              </ul>
            </div>

            <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
              Good luck! 🚀<br>
              <em>The Math Blitz Team</em>
            </p>
          </div>
        </div>
      `,
      text: `
Math Contest Starting Soon!

The weekly math contest starts in 10 minutes at ${contestTime} (${TIMEZONE}).

Contest Details:
- Duration: 10 minutes
- Questions: 20 math problems
- Earn badges and compete on the leaderboard

Join here: ${contestUrl}

Good luck!
The Math Blitz Team
      `
    };

    console.log(`📧 Sending contest notifications to ${users.length} users...`);

    let successCount = 0;
    let failureCount = 0;

    // Send emails in batches to avoid overwhelming the SMTP server
    const batchSize = 5; // Reduced batch size for better reliability
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      const emailPromises = batch.map(async (user) => {
        if (!user.email) return;
        
        try {
          await transport.sendMail({
            ...emailTemplate,
            to: user.email,
            html: emailTemplate.html.replace(/{{name}}/g, user.name || 'Contestant')
          });
          successCount++;
          console.log(`✅ Email sent to ${user.email}`);
        } catch (err) {
          failureCount++;
          console.error(`❌ Failed to send email to ${user.email}:`, err.message);
        }
      });

      await Promise.all(emailPromises);
      
      // Delay between batches to avoid rate limiting
      if (i + batchSize < users.length) {
        console.log(`📤 Batch ${Math.floor(i/batchSize) + 1} sent, waiting before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`📊 Email notification summary: ${successCount} sent, ${failureCount} failed`);
  } catch (error) {
    console.error("Error sending contest notifications:", error);
  }
}

// Send immediate email to a user who just registered for a contest
export async function sendImmediateContestNotification(contest, user) {
  try {
    const transport = getTransporter();
    if (!transport || !user.email) {
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const contestUrl = `${frontendUrl}/contest/${contest._id}`;
    const contestTime = moment(contest.openTime).tz(TIMEZONE).format("dddd, MMMM Do, h:mm A");
    const now = moment().tz(TIMEZONE);
    const contestStart = moment(contest.openTime).tz(TIMEZONE);
    const minutesUntilStart = contestStart.diff(now, 'minutes');

    let subject, message;
    if (minutesUntilStart <= 10 && minutesUntilStart > 0) {
      subject = `🏆 Contest Starting in ${minutesUntilStart} Minutes! - ${contestTime}`;
      message = `Contest starts in ${minutesUntilStart} minutes!`;
    } else if (minutesUntilStart <= 0 && now.isBefore(moment(contest.closeTime))) {
      subject = `🏆 Contest is LIVE NOW! - ${contestTime}`;
      message = `Contest is live right now! Join immediately!`;
    } else {
      subject = `🏆 Contest Registration Confirmed - ${contestTime}`;
      message = `You're registered for the upcoming contest!`;
    }

    const emailTemplate = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@mathblitz.app",
      to: user.email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🏆 Contest Alert!</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">Weekly Math Contest</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">${message}</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <p style="margin: 0; color: #666;"><strong>Start Time:</strong> ${contestTime} (${TIMEZONE})</p>
              <p style="margin: 10px 0 0 0; color: #666;"><strong>Duration:</strong> 10 minutes</p>
              <p style="margin: 10px 0 0 0; color: #666;"><strong>Questions:</strong> 20 math problems</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${contestUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Join Contest Now</a>
            </div>

            <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
              Good luck, ${user.name || 'Contestant'}! 🚀<br>
              <em>The Math Blitz Team</em>
            </p>
          </div>
        </div>
      `,
      text: `
Math Contest - ${message}

Contest Details:
- Start Time: ${contestTime} (${TIMEZONE})
- Duration: 10 minutes
- Questions: 20 math problems

Join here: ${contestUrl}

Good luck, ${user.name || 'Contestant'}!
The Math Blitz Team
      `
    };

    await transport.sendMail(emailTemplate);
    console.log(`✅ Immediate email sent to ${user.email} for contest ${contest._id}`);
  } catch (error) {
    console.error(`❌ Failed to send immediate email to ${user.email}:`, error.message);
  }
}

// Finalize contest and award badges
export async function finalizeContest(contest) {
  try {
    console.log(`Finalizing contest: ${contest._id}`);

    // Get all completed attempts
    const attempts = await ContestAttempt.find({ 
      contestId: contest._id,
      status: { $in: ['submitted', 'timeout'] }
    })
    .populate('userId', 'name email')
    .sort({ totalScore: -1, totalTimeSpent: 1, submittedAt: 1 });

    if (attempts.length === 0) {
      console.log("No completed attempts found for contest finalization");
      return;
    }

    // Calculate ranks and percentiles
    const totalParticipants = attempts.length;
    const updates = [];

    for (let i = 0; i < attempts.length; i++) {
      const attempt = attempts[i];
      const rank = i + 1;
      const percentile = Math.round(((totalParticipants - i) / totalParticipants) * 100);

      // Award additional badges based on rank
      const additionalBadges = [];
      if (rank === 1) additionalBadges.push('contest-winner');
      if (rank <= 3) additionalBadges.push('contest-top-3');
      if (rank <= 10) additionalBadges.push('contest-top-10');
      if (percentile >= 90) additionalBadges.push('contest-top-performer');

      // Update attempt with rank and percentile
      updates.push(
        ContestAttempt.findByIdAndUpdate(attempt._id, {
          rank,
          percentile,
          $addToSet: { badges: { $each: additionalBadges } }
        })
      );

      // Update user badges
      if (additionalBadges.length > 0) {
        updates.push(
          User.findByIdAndUpdate(attempt.userId._id, {
            $addToSet: { badges: { $each: additionalBadges } }
          })
        );
      }
    }

    await Promise.all(updates);

    // Update contest status
    contest.status = 'completed';
    await contest.save();

    console.log(`Contest finalized: ${attempts.length} participants, winner: ${attempts[0]?.userId?.name || 'Unknown'}`);
  } catch (error) {
    console.error("Error finalizing contest:", error);
  }
}

// Create next Thursday contest
export async function createNextFridayContest() {
  try {
    const now = moment().tz(TIMEZONE);
    let nextThursday = moment().tz(TIMEZONE).day(CONTEST_DAY).hour(CONTEST_HOUR).minute(CONTEST_MINUTE).second(0);

    // If today is Friday and the time has passed, or if it's after Friday, get next Friday
    if (nextThursday.isSameOrBefore(now)) {
      nextThursday = nextThursday.add(1, 'week');
    }

    const openAt = nextThursday.toDate();

    // Check if contest already exists for this time
    const existingContest = await Contest.findOne({
      openTime: {
        $gte: new Date(openAt.getTime() - 5 * 60 * 1000), // 5 minutes tolerance
        $lte: new Date(openAt.getTime() + 5 * 60 * 1000)
      }
    });

    if (existingContest) {
      console.log(`Contest already exists for ${nextThursday.format('YYYY-MM-DD HH:mm')}`);
      return existingContest;
    }

    const contest = await createContest({
      openAt,
      durationMinutes: 10,
      questionCount: 20,
      title: `Weekly Math Contest - ${nextThursday.format('MMM DD, YYYY')}`
    });

    console.log(`Created next Thursday contest: ${contest._id} at ${nextThursday.format('YYYY-MM-DD HH:mm')} ${TIMEZONE}`);
    return contest;
  } catch (error) {
    console.error("Error creating next Thursday contest:", error);
    throw error;
  }
}

// Create today's contest if it's Thursday and time hasn't passed
export async function createTodayContestIfFriday() {
  try {
    const now = moment().tz(TIMEZONE);
    
    // Check if today is Friday
    if (now.day() !== CONTEST_DAY) {
      console.log(`Today is not Friday, skipping today's contest creation`);
      return null;
    }

    const todayContestTime = moment().tz(TIMEZONE).hour(CONTEST_HOUR).minute(CONTEST_MINUTE).second(0);
    
    // If contest time has passed by more than 30 minutes, don't create
    if (now.isAfter(todayContestTime.clone().add(30, 'minutes'))) {
      console.log("Contest time has passed, skipping today's contest creation");
      return null;
    }

    // If we're within 30 minutes of start time, create contest starting now
    let startTime = todayContestTime.toDate();
    if (now.isAfter(todayContestTime)) {
      console.log("Starting contest immediately as we're past the scheduled time");
      startTime = now.toDate();
    }

    // Check if contest already exists
    const existingContest = await Contest.findOne({
      openTime: {
        $gte: new Date(startTime.getTime() - 5 * 60 * 1000),
        $lte: new Date(startTime.getTime() + 5 * 60 * 1000)
      }
    });

    if (existingContest) {
      console.log("Contest already exists for today");
      return existingContest;
    }

    const contest = await createContest({
      openAt: startTime,
      durationMinutes: 10,
      questionCount: 20,
      title: `Weekly Math Contest - ${now.format('MMM DD, YYYY')}`
    });

    console.log(`Created today's contest: ${contest._id}`);
    return contest;
  } catch (error) {
    console.error("Error creating today's contest:", error);
    return null;
  }
}

// Start the contest scheduler
export function startContestScheduler() {
  console.log(`Starting contest scheduler (timezone: ${TIMEZONE})`);

  // Create today's contest if it's Friday and time hasn't passed
  createTodayContestIfFriday().catch(console.error);

  // Ensure next Friday's contest exists (run once at startup)
  createNextFridayContest().catch(console.error);

  // Schedule weekly contest creation (every Friday at 15:30 to ensure next Friday's contest exists)
  cron.schedule("30 15 * * 5", () => {
    console.log("Running weekly contest creation check...");
    createNextFridayContest().catch(console.error);
  }, { timezone: TIMEZONE });

  // Contest status update job: Check every minute for contests that need status updates
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // Update contests to 'live' status
      await Contest.updateMany(
        {
          openTime: { $lte: now },
          closeTime: { $gt: now },
          status: 'upcoming'
        },
        { status: 'live' }
      );

      // Find contests that just ended and need finalization
      const contestsToFinalize = await Contest.find({
        closeTime: {
          $gte: new Date(now.getTime() - 60 * 1000), // Within last minute
          $lte: now
        },
        status: 'live'
      });

      for (const contest of contestsToFinalize) {
        await finalizeContest(contest);
      }
    } catch (error) {
      console.error("Error in contest status update job:", error);
    }
  }, { timezone: TIMEZONE });

  console.log("Contest scheduler started successfully");
  console.log(`Next contests will be created every Friday at 15:30 ${TIMEZONE}`);
  console.log(`Contests will last for ${DURATION_MINUTES} minutes`);
}
