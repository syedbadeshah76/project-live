import { apiClient } from "@/lib/api-client";

// ============= Reminders Service =============
// POST /api/course/reminder/create   body: { courseId, reminderDays?, reminderTime? }
// GET  /api/course/reminder/get

export interface CourseReminderDTO {
  id: string;
  course_id: string;
  reminder_days: number[] | string | null;
  reminder_time: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CourseReminder {
  id: string;
  courseId: string;
  reminder_days: number[];
  reminder_time: string | null;
  isActive: boolean;
  createdAt: string;
}

const parseDays = (v: CourseReminderDTO["reminder_days"]): number[] => {
  if (Array.isArray(v)) return v.map(Number).filter((n) => !Number.isNaN(n));
  if (typeof v === "string" && v.trim())
    return v.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
  return [];
};

const unwrap = <T,>(res: any): T => (res && typeof res === "object" && "data" in res ? res.data : res);

const toReminder = (d: CourseReminderDTO): CourseReminder => ({
  id: d.id,
  courseId: d.course_id,
  reminder_days: parseDays(d.reminder_days),
  reminder_time: d.reminder_time ?? null,
  isActive: d.is_active !== false,
  createdAt: d.created_at,
});

export interface CreateReminderInput {
  courseId: string;
  /** 0 = Sunday … 6 = Saturday */
  reminderDays?: number[] | string;
  /** "HH:mm" 24-hour, e.g. "18:30" */
  reminderTime?: string;
  timezone?: string;
}

export const remindersService = {
  async create(input: CreateReminderInput): Promise<CourseReminder> {
    const body: Record<string, unknown> = {
      courseId: input.courseId,
    };
    if (input.reminderDays !== undefined) body.reminderDays = input.reminderDays;
    if (input.reminderTime) body.reminderTime = input.reminderTime;
    if (input.timezone) body.timezone = input.timezone;

    const res = await apiClient.post<CourseReminderDTO>("/course/reminder/create", body);
    return toReminder(unwrap<CourseReminderDTO>(res));
  },

  async createReminder(courseId: string): Promise<CourseReminder> {
    return this.create({ courseId });
  },

  async list(): Promise<CourseReminder[]> {
    const res = await apiClient.get<CourseReminderDTO[]>("/course/reminder/get");
    const data = unwrap<CourseReminderDTO[] | { content?: CourseReminderDTO[] }>(res);
    const arr = Array.isArray(data) ? data : (data as any)?.content ?? [];
    return arr.map(toReminder);
  },

  async getByCourse(courseId: string): Promise<CourseReminder | null> {
    const all = await this.list();
    return all.find((r) => r.courseId === courseId) ?? null;
  },

  async getReminderForCourse(courseId: string): Promise<CourseReminder | null> {
    return this.getByCourse(courseId);
  },
};
