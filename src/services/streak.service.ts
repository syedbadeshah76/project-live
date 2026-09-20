import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/lib/api-client";

/**
 * Set to `false` once the Spring Boot `/api/streak` endpoints are live.
 * Backend contract:
 *   GET    /streak                -> StreakData
 *   POST   /streak/complete       -> { streak: number, coinsEarned: number }
 *   POST   /streak/claim/:id      -> { coins: number }
 *   GET    /streak/badges         -> Badge[]
 *
 * NOTE: Streak data is a STUDENT-ONLY feature. Backend should reject
 * requests from instructor/admin roles with 403.
 */
const MOCK_MODE = true;

// ============= Types =============
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  completedToday: number;
  streakProgress: number;
  coins: number;
  weeklyActivity: WeekDay[];
  todaysGoal: TodaysGoal | null;
  assignment: Assignment | null;
  milestones: Milestone;
  badges: Badge[];
  calendarStats: CalendarStats;
  monthlyComparison: number;
}

export interface WeekDay {
  day: string;
  shortName: string;
  active: boolean;
  date: string;
}

export interface TodaysGoal {
  courseTitle: string;
  lessonTitle: string;
  lessonNumber: number;
  duration: number;
  progress: number;
  courseId: string;
}

export interface Assignment {
  id: string;
  title: string;
  courseTitle: string;
  assignmentNumber: number;
  dueDate: string;
  courseId: string;
}

export interface Milestone {
  daysToNext: number;
  coinsReward: number;
  progress: number;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  earnedAt?: string;
  icon: string;
}

export interface CalendarStats {
  daysWithoutBreak: number;
  recordDays: number;
  classesCovered: number;
  assignmentsCompleted: number;
  currentDate: string;
}

export interface CompleteDayResponse {
  streak: number;
  coinsEarned: number;
}

// ============= Mock Data =============
// In-memory store so mock mutations are reflected during a session
const buildWeeklyActivity = (): WeekDay[] => {
  const today = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const shortNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  // Compute the current week starting Sunday
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  return days.map((day, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return {
      day,
      shortName: shortNames[i],
      // Days up to (and including) today are active in the mock
      active: d <= today,
      date: d.toISOString().split("T")[0],
    };
  });
};

const mockStreakData: StreakData = {
  // Snapchat-style daily streak. Backend resets to 1 if any full day is missed.
  currentStreak: 35,
  longestStreak: 42,
  completedToday: 3,
  streakProgress: 20,
  coins: 120,
  weeklyActivity: buildWeeklyActivity(),
  todaysGoal: {
    courseTitle: "Data Structures & Algorithms",
    lessonTitle: "Binary Trees",
    lessonNumber: 5,
    duration: 20,
    progress: 60,
    courseId: "1",
  },
  assignment: {
    id: "a1",
    title: "Advance problem solving in python",
    courseTitle: "Python Advanced",
    assignmentNumber: 5,
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    courseId: "2",
  },
  milestones: {
    daysToNext: 7,
    coinsReward: 100,
    progress: 60,
  },
  badges: [
    { id: "1", title: "7 Day Streak", description: "Completed 7 day streak", earned: true, earnedAt: "2024-06-10", icon: "trophy" },
    { id: "2", title: "First Course", description: "Completed first course", earned: true, earnedAt: "2024-05-15", icon: "trophy" },
    { id: "3", title: "Quiz Master", description: "Scored 100% in a quiz", earned: true, earnedAt: "2024-06-01", icon: "trophy" },
    { id: "4", title: "Early Bird", description: "Started learning before 7 AM", earned: true, earnedAt: "2024-06-05", icon: "trophy" },
    { id: "5", title: "14 Day Streak", description: "Complete 14 day streak", earned: false, icon: "trophy" },
    { id: "6", title: "Speed Learner", description: "Complete 5 lessons in a day", earned: false, icon: "trophy" },
    { id: "7", title: "Night Owl", description: "Study past midnight", earned: false, icon: "trophy" },
    { id: "8", title: "30 Day Streak", description: "Complete 30 day streak", earned: false, icon: "trophy" },
  ],
  calendarStats: {
    daysWithoutBreak: 5,
    recordDays: 10,
    classesCovered: 10,
    assignmentsCompleted: 4,
    currentDate: new Date().toISOString().split("T")[0],
  },
  monthlyComparison: 11.25,
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ============= Service =============
export const streakService = {
  async getStreakData(): Promise<ApiResponse<StreakData>> {
    if (MOCK_MODE) {
      await delay(400);
      // Refresh weekly activity each call so "today" stays accurate
      return { success: true, data: { ...mockStreakData, weeklyActivity: buildWeeklyActivity() } };
    }
    return apiClient.get<ApiResponse<StreakData>>("/streak");
  },

  async markDayComplete(): Promise<ApiResponse<CompleteDayResponse>> {
    if (MOCK_MODE) {
      await delay(300);
      mockStreakData.currentStreak += 1;
      mockStreakData.coins += 10;
      mockStreakData.completedToday += 1;
      return { success: true, data: { streak: mockStreakData.currentStreak, coinsEarned: 10 } };
    }
    return apiClient.post<ApiResponse<CompleteDayResponse>>("/streak/complete");
  },

  async claimReward(milestoneId: string): Promise<ApiResponse<{ coins: number }>> {
    if (MOCK_MODE) {
      await delay(300);
      mockStreakData.coins += 100;
      return { success: true, data: { coins: mockStreakData.coins } };
    }
    return apiClient.post<ApiResponse<{ coins: number }>>(`/streak/claim/${milestoneId}`);
  },

  async getBadges(): Promise<ApiResponse<Badge[]>> {
    if (MOCK_MODE) {
      await delay(200);
      return { success: true, data: mockStreakData.badges };
    }
    return apiClient.get<ApiResponse<Badge[]>>("/streak/badges");
  },

  /**
   * Record that the student watched at least one lesson today.
   * Snapchat-style rules (enforced server-side by Spring Boot):
   *  - First activity of the day  -> currentStreak += 1
   *  - Already counted today      -> no-op
   *  - Last activity > 24h + 1 day skipped -> currentStreak resets to 1
   * Endpoint: POST /streak/activity { lessonId?, courseId? }
   */
  async recordDailyActivity(payload?: { lessonId?: string; courseId?: string }) {
    if (MOCK_MODE) {
      await delay(150);
      return { success: true, data: { streak: mockStreakData.currentStreak } };
    }
    return apiClient.post<ApiResponse<{ streak: number }>>("/streak/activity", payload ?? {});
  },
};
