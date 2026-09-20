import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { meetingService } from "@/services/meeting.service";
import type { AttendanceRecord } from "@/types/meeting.types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Clock, CheckCircle, XCircle, AlertTriangle, LogOut } from "lucide-react";

interface AttendanceTableProps {
  meetingId: string;
  meetingTitle?: string;
}

const statusConfig: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  present: { label: "Present", className: "bg-green-100 text-green-700", icon: CheckCircle },
  absent: { label: "Absent", className: "bg-red-100 text-red-700", icon: XCircle },
  late: { label: "Late", className: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  left_early: { label: "Left Early", className: "bg-orange-100 text-orange-700", icon: LogOut },
};

export const AttendanceTable = ({ meetingId, meetingTitle }: AttendanceTableProps) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await meetingService.getAttendance(meetingId);
        if (res.success) setRecords(res.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [meetingId]);

  const presentCount = records.filter((r) => r.status === "present" || r.status === "late").length;
  const totalCount = records.length;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No attendance records available</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {meetingTitle && <h3 className="font-display font-semibold text-card-foreground">{meetingTitle}</h3>}
        <div className="flex gap-2 ml-auto">
          <Badge variant="outline" className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />{presentCount} Present
          </Badge>
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            <Users className="h-3 w-3 mr-1" />{totalCount} Total
          </Badge>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-card overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Join Time</TableHead>
                <TableHead>Leave Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record, idx) => {
                const config = statusConfig[record.status];
                const StatusIcon = config.icon;
                return (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {record.studentName.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm text-card-foreground">{record.studentName}</p>
                          <p className="text-xs text-muted-foreground hidden sm:block">{record.studentEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {record.joinTime || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {record.leaveTime || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{record.duration > 0 ? `${record.duration} min` : "—"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${config.className}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />{config.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </motion.div>
  );
};
