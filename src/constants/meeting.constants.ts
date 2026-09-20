import type { MeetingPlatform, MeetingStatus } from "@/types/meeting.types";
import { Video, Globe, Monitor, MessageSquare } from "lucide-react";

export const MEETING_PLATFORMS: {
  value: MeetingPlatform;
  label: string;
  icon: typeof Video;
  description: string;
  enabled: boolean;
}[] = [
  {
    value: "zoom",
    label: "Zoom",
    icon: Video,
    description: "Zoom video conferencing",
    enabled: true,
  },
  {
    value: "google_meet",
    label: "Google Meet",
    icon: Globe,
    description: "Google Meet session",
    enabled: false,
  },
  {
    value: "microsoft_teams",
    label: "Microsoft Teams",
    icon: Monitor,
    description: "Teams meeting",
    enabled: false,
  },
  {
    value: "discord",
    label: "Discord",
    icon: MessageSquare,
    description: "Discord voice channel",
    enabled: false,
  },
];

export const PLATFORM_LABEL: Record<MeetingPlatform, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  microsoft_teams: "Teams",
  discord: "Discord",
};

export const STATUS_LABEL: Record<MeetingStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  live: "Live Now",
  completed: "Completed",
};

export const STATUS_PILL_CLASSES: Record<MeetingStatus, string> = {
  draft: "bg-gray-100 text-gray-700 border border-gray-200",
  pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  approved: "bg-green-100 text-green-700 border border-green-200",
  rejected: "bg-red-50 text-red-700 border border-red-300",
  cancelled: "bg-gray-100 text-gray-500 border border-gray-200",
  live: "bg-red-100 text-red-700 border border-red-200",
  completed: "bg-blue-100 text-blue-700 border border-blue-200",
};

export const PLATFORM_PILL_CLASSES: Record<MeetingPlatform, string> = {
  zoom: "bg-blue-100 text-blue-700",
  google_meet: "bg-green-100 text-green-700",
  microsoft_teams: "bg-indigo-100 text-indigo-700",
  discord: "bg-purple-100 text-purple-700",
};

export const DEFAULT_PAGE_SIZE = 10;

export const PLACEHOLDER_ZOOM_URL = "https://zoom.us/j/placeholder-meeting";

export const ABOUT_LIVE_CLASSES_BULLETS = [
  "Schedule live classes to engage students in real-time",
  "Classes must be approved by Admin before going live to students",
  "Students receive notifications about upcoming live classes",
  "All live class recordings are available for students to review later",
];
