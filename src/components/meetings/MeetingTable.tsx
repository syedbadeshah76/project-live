import type { Meeting } from "@/types/meeting.types";
import { PLATFORM_LABEL, PLATFORM_PILL_CLASSES } from "@/constants/meeting.constants";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MeetingStatusBadge } from "./MeetingStatusBadge";
import { MeetingActionButton } from "./MeetingActionButton";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarX } from "lucide-react";

interface Props {
  meetings: Meeting[];
  loading?: boolean;
  onChanged?: () => void;
}

const formatDateTime = (m: Meeting) => {
  const d = new Date(`${m.date}T${m.startTime}:00`);
  const today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
};

export const MeetingTable = ({ meetings, loading, onChanged }: Props) => {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="py-16 text-center">
        <CalendarX className="h-10 w-10 mx-auto text-gray-300" />
        <p className="mt-3 text-gray-500 text-sm">No live classes found</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-50/50">
          <TableHead className="text-xs uppercase tracking-wider text-gray-500">Title</TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-gray-500">Course</TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-gray-500">Platform</TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-gray-500">Date & Time</TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-gray-500">Students</TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-gray-500">Status</TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-gray-500 text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {meetings.map((m) => (
          <TableRow key={m.id} className="hover:bg-gray-50/60">
            <TableCell className="font-medium text-gray-900">{m.title}</TableCell>
            <TableCell className="text-gray-600">{m.courseName}</TableCell>
            <TableCell>
              <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${PLATFORM_PILL_CLASSES[m.meetingType]}`}>
                {PLATFORM_LABEL[m.meetingType]}
              </span>
            </TableCell>
            <TableCell className="text-gray-600">{formatDateTime(m)}</TableCell>
            <TableCell className="text-gray-600">{m.enrolledStudents ?? 0}</TableCell>
            <TableCell><MeetingStatusBadge status={m.status} /></TableCell>
            <TableCell className="text-right"><MeetingActionButton meeting={m} onChanged={onChanged} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
