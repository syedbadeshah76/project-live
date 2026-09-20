// src/pages/instructor/InstructorMeetings.tsx
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { meetingService } from "@/services/meeting.service";
import { liveClassService } from "@/services/liveClassService";
import { demoClassService } from "@/services/demoClass.service";
import { useAuth } from "@/contexts/AuthContext";
import type {
  Meeting,
  MeetingStatistics,
  PaginationMeta,
} from "@/types/meeting.types";
import { MeetingHeader } from "@/components/meetings/MeetingHeader";
import { LiveStatsCards } from "@/components/meetings/LiveStatsCards";
import {
  MeetingInfoBanner,
  AboutLiveClassesBanner,
} from "@/components/meetings/MeetingBanner";
import {
  MeetingFilters,
  type MeetingTab,
} from "@/components/meetings/MeetingFilters";
import { MeetingTable } from "@/components/meetings/MeetingTable";
import { MeetingPagination } from "@/components/meetings/MeetingPagination";
import { ScheduleDemoClassModal } from "@/components/meetings/ScheduleDemoClassModal";
import { useMeetingReminders } from "@/hooks/useMeetingReminders";
import { DEFAULT_PAGE_SIZE } from "@/constants/meeting.constants";

import InstructorResources from "./InstructorResources";
import InstructorResourceList from "./InstructorResourceList";
import InstructorAnnouncementsOverview from "./InstructorAnnouncementsOverview";

const InstructorMeetings = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState<MeetingStatistics>();
  const [loading, setLoading] = useState(true);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const [tab, setTab] = useState<MeetingTab>("all");

  // upload form OR list
  const [resourceView, setResourceView] = useState<"upload" | "list">("upload");

  const [page, setPage] = useState(1);

  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
  });

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [liveDash, demoClassesList] = await Promise.all([
        liveClassService.getInstructorDashboard().catch(() => null),
        demoClassService.getInstructorDemoClasses(user).catch(() => []),
      ]);

      const meetingMap = new Map<string, Meeting>();

      if (liveDash && (liveDash.liveClasses?.length > 0 || liveDash.totalClasses > 0)) {
        (liveDash.liveClasses || []).forEach((item: any) => {
          const dateObj = item.scheduledAt || item.scheduledStartAt ? new Date(item.scheduledAt || item.scheduledStartAt) : new Date();
          const id = String(item.id || "");
          if (!id) return;
          meetingMap.set(id, {
            id,
            title: item.title || "Live Class",
            description: item.description || "",
            courseId: item.liveCourseId || item.courseId || "",
            courseName: item.courseTitle || item.title || "Live Course",
            instructorId: item.hostInstructorId || "",
            instructorName: "Instructor",
            instructorEmail: "",
            date: !isNaN(dateObj.getTime()) ? dateObj.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            startTime: !isNaN(dateObj.getTime()) ? dateObj.toTimeString().slice(0, 5) : "10:00",
            duration: item.durationMinutes || item.duration || 90,
            status: item.status === "SCHEDULED" ? "approved" : (item.status?.toLowerCase() as any || "pending"),
            meetingType: "zoom",
            zoomJoinUrl: item.startUrl || item.joinUrl,
            startUrl: item.startUrl,
            scheduledStartAt: item.scheduledAt || item.scheduledStartAt,
            enrolledStudents: item.enrolledStudents || 0,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
          });
        });
      } else {
        // Fallback to meetingService
        const [list, s] = await Promise.all([
          meetingService.getInstructorMeetings(undefined, {
            page,
            pageSize: DEFAULT_PAGE_SIZE,
          }).catch(() => ({ success: false, data: { items: [], meta: { page: 1, pageSize: DEFAULT_PAGE_SIZE, totalItems: 0, totalPages: 1 } } })),
          meetingService.getMeetingStatistics().catch(() => ({ success: false, data: undefined })),
        ]);

        if (list.success && Array.isArray(list.data?.items)) {
          list.data.items.forEach((m: Meeting) => {
            if (m.id) meetingMap.set(m.id, m);
          });
          setMeta(list.data.meta);
        }
        if (s.success && s.data) {
          setStats(s.data);
        }
      }

      // Add demo classes from GET /api/demo-classes/course/{liveCourseId}
      if (Array.isArray(demoClassesList) && demoClassesList.length > 0) {
        demoClassesList.forEach((item: any) => {
          const id = String(item.id || "");
          if (!id) return;
          const dateObj = item.scheduledStartAt || item.scheduledAt ? new Date(item.scheduledStartAt || item.scheduledAt) : new Date();
          meetingMap.set(id, {
            id,
            title: item.title || "Free Demo Class",
            description: item.description || "",
            courseId: item.liveCourseId || "",
            courseName: item.courseTitle || item.title || "Live Course",
            instructorId: item.hostInstructorId || user?.id || "",
            instructorName: user?.name || "Instructor",
            instructorEmail: user?.email || "",
            date: !isNaN(dateObj.getTime()) ? dateObj.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            startTime: !isNaN(dateObj.getTime()) ? dateObj.toTimeString().slice(0, 5) : "10:00",
            duration: item.durationMinutes || item.duration || 90,
            status: item.status === "SCHEDULED" ? "approved" : (item.status?.toLowerCase() as any || "approved"),
            meetingType: "zoom",
            zoomJoinUrl: item.startUrl || item.joinUrl,
            startUrl: item.startUrl,
            scheduledStartAt: item.scheduledStartAt || item.scheduledAt,
            enrolledStudents: item.enrolledStudents || 0,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
            isDemo: true,
          } as any);
        });
      }

      const allMeetings = Array.from(meetingMap.values());
      setMeetings(allMeetings);

      // Compute stats
      const totalCount = allMeetings.length;
      const liveCount = allMeetings.filter((m) => m.status === "live").length;
      const upcomingCount = allMeetings.filter((m) => m.status === "approved" || m.status === "SCHEDULED" || m.status === "upcoming").length;
      const completedCount = allMeetings.filter((m) => m.status === "completed").length;

      setStats({
        totalClasses: liveDash?.totalClasses ? Math.max(liveDash.totalClasses, totalCount) : totalCount,
        liveNow: liveDash?.liveNow ?? liveCount,
        upcoming: liveDash?.upcoming ? Math.max(liveDash.upcoming, upcomingCount) : upcomingCount,
        completed: liveDash?.completed ?? completedCount,
        pending: 0,
        rejected: 0,
        drafts: 0,
      });

      setMeta({
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        totalItems: allMeetings.length,
        totalPages: 1,
      });
    } catch (err) {
      console.error("Error loading instructor meetings:", err);
    } finally {
      setLoading(false);
    }
  }, [page, user]);

  useEffect(() => {
    load();
  }, [load]);

  useMeetingReminders({ meetings });

  const handleTabChange = (value: MeetingTab) => {
    if (value === "upload") {
      setResourceView("upload");
      setTab("resources");
      return;
    }

    setTab(value);

    if (value !== "resources") {
      setResourceView("upload");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6 bg-gray-50/40 min-h-screen"
    >
      <MeetingHeader onScheduleDemo={() => setIsDemoModalOpen(true)} />

      <LiveStatsCards stats={stats} loading={loading} />
      <MeetingInfoBanner />

      <MeetingFilters
        value={tab}
        onChange={handleTabChange}
        showUploadTab={resourceView === "list"}
      />

      {tab === "all" && (
        <>
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <MeetingTable
              meetings={meetings}
              loading={loading}
              onChanged={load}
            />

            <MeetingPagination meta={meta} onPageChange={setPage} />
          </div>

          <AboutLiveClassesBanner />
        </>
      )}

      {tab === "resources" &&
        (resourceView === "upload" ? (
          <InstructorResources onViewAll={() => setResourceView("list")} />
        ) : (
          <InstructorResourceList onUpload={() => setResourceView("upload")} />
        ))}

      {tab === "announcements" && <InstructorAnnouncementsOverview />}

      <ScheduleDemoClassModal
        open={isDemoModalOpen}
        onOpenChange={setIsDemoModalOpen}
        onSuccess={load}
      />
    </motion.div>
  );
};

export default InstructorMeetings;
