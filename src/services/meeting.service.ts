import type { ApiResponse } from "@/types/api.types";
import type {
  Meeting,
  CreateMeetingRequest,
  ApproveMeetingRequest,
  RejectMeetingRequest,
  RescheduleMeetingRequest,
  AttendanceRecord,
  RecordAttendanceRequest,
  MeetingStatistics,
  MeetingFilters,
  PaginationQuery,
  PaginatedResponse,
  DraftMeetingPayload,
  InstructorCourseOption,
  MeetingAnnouncement,
  MeetingResource,
  AnnouncementSummary,
  ResourceUploadPayload,
} from "@/types/meeting.types";
import { PLACEHOLDER_ZOOM_URL } from "@/constants/meeting.constants";

// ============= Mock Store (backend-ready shape) =============
// let mockMeetings: Meeting[] = [
//   {
//     id: "mtg-1",
//     title: "UI/UX Mastery Q&A",
//     description:
//       "Live Q&A session for UI/UX Mastery students covering current design challenges.",
//     courseId: "1",
//     courseName: "UI/UX Mastery",
//     instructorId: "inst-1",
//     instructorName: "Instructor User",
//     instructorEmail: "instructor@edvanz.com",
//     date: new Date().toISOString().slice(0, 10),
//     startTime: "15:00",
//     duration: 60,
//     status: "approved",
//     meetingType: "zoom",
//     zoomJoinUrl: PLACEHOLDER_ZOOM_URL,
//     enrolledStudents: 89,
//     createdAt: new Date().toISOString(),
//     updatedAt: new Date().toISOString(),
//     approvedAt: new Date().toISOString(),
//   },
//   {
//     id: "mtg-2",
//     title: "React Hooks Deep Dive",
//     description:
//       "Advanced React hooks including useCallback, useMemo, and custom hooks with practical demos.",
//     courseId: "2",
//     courseName: "React Advanced",
//     instructorId: "inst-1",
//     instructorName: "Instructor User",
//     instructorEmail: "instructor@edvanz.com",
//     date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
//     startTime: "10:00",
//     duration: 90,
//     status: "approved",
//     meetingType: "google_meet",
//     enrolledStudents: 124,
//     createdAt: new Date().toISOString(),
//     updatedAt: new Date().toISOString(),
//   },
//   {
//     id: "mtg-3",
//     title: "Design Systems WS",
//     description:
//       "Workshop on building scalable design systems and component libraries.",
//     courseId: "3",
//     courseName: "Design Systems",
//     instructorId: "inst-1",
//     instructorName: "Instructor User",
//     instructorEmail: "instructor@edvanz.com",
//     date: "2026-06-30",
//     startTime: "14:00",
//     duration: 120,
//     status: "approved",
//     meetingType: "zoom",
//     enrolledStudents: 67,
//     createdAt: new Date().toISOString(),
//     updatedAt: new Date().toISOString(),
//   },
//   {
//     id: "mtg-4",
//     title: "Figma Tips Session",
//     description:
//       "Practical Figma tips, tricks, and shortcuts for design productivity.",
//     courseId: "1",
//     courseName: "UI/UX Mastery",
//     instructorId: "inst-1",
//     instructorName: "Instructor User",
//     instructorEmail: "instructor@edvanz.com",
//     date: "2026-07-02",
//     startTime: "16:00",
//     duration: 60,
//     status: "pending",
//     meetingType: "microsoft_teams",
//     enrolledStudents: 45,
//     createdAt: new Date().toISOString(),
//     updatedAt: new Date().toISOString(),
//   },
//   {
//     id: "mtg-5",
//     title: "Component Library Talk",
//     description:
//       "Talk on structuring a reusable component library across teams.",
//     courseId: "4",
//     courseName: "Figma Tips",
//     instructorId: "inst-1",
//     instructorName: "Instructor User",
//     instructorEmail: "instructor@edvanz.com",
//     date: "2026-07-05",
//     startTime: "11:00",
//     duration: 60,
//     status: "draft",
//     meetingType: "zoom",
//     enrolledStudents: 88,
//     createdAt: new Date().toISOString(),
//     updatedAt: new Date().toISOString(),
//   },
// ];

let mockMeetings: Meeting[] = [];
let mockAttendance: AttendanceRecord[] = [];
let mockResources: MeetingResource[] = [];
let mockAnnouncements: AnnouncementSummary[] = [];

const mockCourses: InstructorCourseOption[] = [];

const ok = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  message,
});

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

const CURRENT_INSTRUCTOR_ID = "inst-1";

const isLive = (m: Meeting) => {
  if (m.status !== "approved") return false;
  const start = new Date(`${m.date}T${m.startTime}:00`);
  const end = new Date(start.getTime() + m.duration * 60000);
  const now = new Date();
  return now >= start && now <= end;
};

const isCompleted = (m: Meeting) => {
  const start = new Date(`${m.date}T${m.startTime}:00`);
  const end = new Date(start.getTime() + m.duration * 60000);
  return m.status === "approved" && new Date() > end;
};

const paginate = <T>(
  items: T[],
  { page, pageSize }: PaginationQuery,
): PaginatedResponse<T> => {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    meta: { page, pageSize, totalItems, totalPages },
  };
};

const applyFilters = (
  items: Meeting[],
  filters?: MeetingFilters,
): Meeting[] => {
  if (!filters) return items;
  return items.filter((m) => {
    if (
      filters.status &&
      filters.status !== "all" &&
      m.status !== filters.status
    )
      return false;
    if (filters.courseId && m.courseId !== filters.courseId) return false;
    if (filters.platform && m.meetingType !== filters.platform) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !m.title.toLowerCase().includes(q) &&
        !m.courseName.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });
};

export const meetingService = {
  // ============ Instructor ============
  async getInstructorMeetings(
    filters?: MeetingFilters,
    pagination: PaginationQuery = { page: 1, pageSize: 10 },
  ): Promise<ApiResponse<PaginatedResponse<Meeting>>> {
    const items = applyFilters(
      mockMeetings.filter((m) => m.instructorId === CURRENT_INSTRUCTOR_ID),
      filters,
    ).map((m) => ({
      ...m,
      status: isLive(m) ? "live" : isCompleted(m) ? "completed" : m.status,
    }));
    return ok(paginate(items, pagination));
  },

  async getMeetingStatistics(): Promise<ApiResponse<MeetingStatistics>> {
    const mine = mockMeetings.filter(
      (m) => m.instructorId === CURRENT_INSTRUCTOR_ID,
    );
    const stats: MeetingStatistics = {
      totalClasses: mine.length,
      liveNow: mine.filter(isLive).length,
      upcoming: mine.filter(
        (m) =>
          m.status === "approved" &&
          new Date(`${m.date}T${m.startTime}:00`) > new Date(),
      ).length,
      completed: mine.filter(isCompleted).length,
      pending: mine.filter((m) => m.status === "pending").length,
      rejected: mine.filter((m) => m.status === "rejected").length,
      drafts: mine.filter((m) => m.status === "draft").length,
    };
    return ok(stats);
  },

  async getMeetingById(id: string): Promise<ApiResponse<Meeting | null>> {
    return ok(mockMeetings.find((m) => m.id === id) ?? null);
  },

  async getRejectedMeeting(id: string): Promise<ApiResponse<Meeting | null>> {
    const m =
      mockMeetings.find((x) => x.id === id && x.status === "rejected") ?? null;
    return ok(m);
  },

  async createMeeting(
    payload: CreateMeetingRequest,
  ): Promise<ApiResponse<Meeting>> {
    const now = new Date().toISOString();
    const meeting: Meeting = {
      id: uid("mtg"),
      ...payload,
      courseName:
        mockCourses.find((c) => c.id === payload.courseId)?.title ?? "Course",
      instructorId: CURRENT_INSTRUCTOR_ID,
      instructorName: "Instructor User",
      instructorEmail: "instructor@edvanz.com",
      status: "pending",
      enrolledStudents: 0,
      createdAt: now,
      updatedAt: now,
    };
    mockMeetings = [meeting, ...mockMeetings];
    return ok(meeting, "Submitted for admin approval");
  },

  async saveDraft(payload: DraftMeetingPayload): Promise<ApiResponse<Meeting>> {
    const now = new Date().toISOString();
    if (payload.id) {
      const idx = mockMeetings.findIndex((m) => m.id === payload.id);
      if (idx >= 0) {
        mockMeetings[idx] = {
          ...mockMeetings[idx],
          ...payload,
          status: "draft",
          updatedAt: now,
        } as Meeting;
        return ok(mockMeetings[idx], "Draft saved");
      }
    }
    const draft: Meeting = {
      id: uid("draft"),
      title: payload.title ?? "Untitled Draft",
      description: payload.description ?? "",
      courseId: payload.courseId ?? "",
      courseName:
        mockCourses.find((c) => c.id === payload.courseId)?.title ?? "—",
      instructorId: CURRENT_INSTRUCTOR_ID,
      instructorName: "Instructor User",
      instructorEmail: "instructor@edvanz.com",
      date: payload.date ?? "",
      startTime: payload.startTime ?? "",
      duration: payload.duration ?? 60,
      meetingType: payload.meetingType ?? "zoom",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    mockMeetings = [draft, ...mockMeetings];
    return ok(draft, "Draft saved");
  },

  async updateDraft(
    payload: DraftMeetingPayload & { id: string },
  ): Promise<ApiResponse<Meeting>> {
    return this.saveDraft(payload);
  },

  async submitForApproval(id: string): Promise<ApiResponse<Meeting>> {
    const idx = mockMeetings.findIndex((m) => m.id === id);
    if (idx < 0) throw new Error("Meeting not found");
    mockMeetings[idx] = {
      ...mockMeetings[idx],
      status: "pending",
      updatedAt: new Date().toISOString(),
    };
    return ok(mockMeetings[idx], "Submitted for admin approval");
  },

  async deleteDraft(id: string): Promise<ApiResponse<{ id: string }>> {
    mockMeetings = mockMeetings.filter(
      (m) => !(m.id === id && m.status === "draft"),
    );
    return ok({ id }, "Draft deleted");
  },

  async joinMeeting(id: string): Promise<ApiResponse<{ url: string }>> {
    const m = mockMeetings.find((x) => x.id === id);
    return ok({ url: m?.zoomJoinUrl ?? PLACEHOLDER_ZOOM_URL });
  },

  async startMeeting(id: string): Promise<ApiResponse<{ url: string }>> {
    return this.joinMeeting(id);
  },

  async getInstructorCourses(): Promise<ApiResponse<InstructorCourseOption[]>> {
    return ok(mockCourses);
  },

  // ============ Admin ============
  async getAdminMeetings(
    filters?: MeetingFilters,
    pagination: PaginationQuery = { page: 1, pageSize: 10 },
  ): Promise<ApiResponse<PaginatedResponse<Meeting>>> {
    return ok(paginate(applyFilters(mockMeetings, filters), pagination));
  },

  async approveMeeting(
    req: ApproveMeetingRequest,
  ): Promise<ApiResponse<Meeting>> {
    const idx = mockMeetings.findIndex((m) => m.id === req.meetingId);
    if (idx < 0) throw new Error("Meeting not found");
    mockMeetings[idx] = {
      ...mockMeetings[idx],
      status: "approved",
      approvedAt: new Date().toISOString(),
      approvedBy: req.adminId,
      zoomJoinUrl: mockMeetings[idx].zoomJoinUrl ?? PLACEHOLDER_ZOOM_URL,
      updatedAt: new Date().toISOString(),
    };
    return ok(mockMeetings[idx], "Meeting approved");
  },

  async rejectMeeting(
    req: RejectMeetingRequest,
  ): Promise<ApiResponse<Meeting>> {
    const idx = mockMeetings.findIndex((m) => m.id === req.meetingId);
    if (idx < 0) throw new Error("Meeting not found");
    mockMeetings[idx] = {
      ...mockMeetings[idx],
      status: "rejected",
      rejectedAt: new Date().toISOString(),
      rejectedBy: req.adminId,
      rejectionReason: req.reason,
      updatedAt: new Date().toISOString(),
    };
    return ok(mockMeetings[idx], "Meeting rejected");
  },

  async rescheduleMeeting(
    req: RescheduleMeetingRequest,
  ): Promise<ApiResponse<Meeting>> {
    const idx = mockMeetings.findIndex((m) => m.id === req.meetingId);
    if (idx < 0) throw new Error("Meeting not found");
    mockMeetings[idx] = {
      ...mockMeetings[idx],
      date: req.date,
      startTime: req.startTime,
      duration: req.duration ?? mockMeetings[idx].duration,
      status: "approved",
      approvedAt: new Date().toISOString(),
      approvedBy: req.adminId,
      updatedAt: new Date().toISOString(),
    };
    return ok(mockMeetings[idx], "Meeting rescheduled");
  },

  // ============ Student ============
  async getApprovedMeetings(
    pagination: PaginationQuery = { page: 1, pageSize: 20 },
  ): Promise<ApiResponse<PaginatedResponse<Meeting>>> {
    const approved = mockMeetings
      .filter((m) => m.status === "approved" || isLive(m))
      .map((m) => ({ ...m, status: isLive(m) ? "live" : m.status }));
    return ok(paginate(approved, pagination));
  },

  async getUpcomingLiveClasses(): Promise<ApiResponse<Meeting[]>> {
    const now = new Date();
    return ok(
      mockMeetings.filter(
        (m) =>
          m.status === "approved" &&
          new Date(`${m.date}T${m.startTime}:00`) >= now,
      ),
    );
  },

  async joinApprovedMeeting(id: string): Promise<ApiResponse<{ url: string }>> {
    return this.joinMeeting(id);
  },

  // ============ Attendance ============
  async getAttendance(
    meetingId: string,
  ): Promise<ApiResponse<AttendanceRecord[]>> {
    return ok(mockAttendance.filter((a) => a.meetingId === meetingId));
  },

  async recordAttendance(
    req: RecordAttendanceRequest,
  ): Promise<ApiResponse<AttendanceRecord>> {
    const rec: AttendanceRecord = {
      id: uid("att"),
      meetingId: req.meetingId,
      studentId: req.studentId,
      studentName: "Student",
      studentEmail: "student@edvanz.com",
      joinTime: req.joinTime,
      leaveTime: req.leaveTime,
      duration: 0,
      status: req.status,
    };
    mockAttendance = [...mockAttendance, rec];
    return ok(rec);
  },
  async getApprovedCourses(): Promise<ApiResponse<InstructorCourseOption[]>> {
    // TODO backend: filter by instructorId + approved status
    return ok(mockCourses);
  },

  async uploadResource(
    payload: ResourceUploadPayload,
  ): Promise<ApiResponse<MeetingResource>> {
    const course = mockCourses.find((c) => c.id === payload.courseId);
    const resource: MeetingResource = {
      id: uid("res"),
      title: payload.title,
      description: payload.description,
      type: "pdf",
      fileName: payload.file.name,
      fileUrl: URL.createObjectURL(payload.file),
      fileSize: payload.file.size,
      courseId: payload.courseId,
      courseName: course?.title ?? "Course",
      instructorId: CURRENT_INSTRUCTOR_ID,
      uploadedAt: new Date().toISOString(),
      downloads: 0,
    };
    mockResources = [resource, ...mockResources];
    return ok(resource, "Resource uploaded");
  },

  async getResources(
    courseId?: string,
  ): Promise<ApiResponse<MeetingResource[]>> {
    const list = mockResources
      .filter((r) => r.instructorId === CURRENT_INSTRUCTOR_ID)
      .filter((r) => (courseId ? r.courseId === courseId : true))
      .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));
    return ok(list);
  },

  async downloadResource(id: string): Promise<ApiResponse<{ url: string }>> {
    const r = mockResources.find((x) => x.id === id);
    if (!r) throw new Error("Resource not found");
    r.downloads += 1;
    return ok({ url: r.fileUrl }, "Download ready");
  },

  async deleteResource(id: string): Promise<ApiResponse<{ id: string }>> {
    mockResources = mockResources.filter((r) => r.id !== id);
    return ok({ id }, "Resource deleted");
  },

  // ============ Announcements ============
  async getAnnouncementsSummary(): Promise<ApiResponse<AnnouncementSummary[]>> {
    return ok(
      [...mockAnnouncements].sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      ),
    );
  },
};
