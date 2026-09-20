import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Meeting } from "@/types/meeting.types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meeting: Meeting | null;
}

export const RejectedMeetingDialog = ({
  open,
  onOpenChange,
  meeting,
}: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Rejected Live Class</DialogTitle>
        <DialogDescription>
          Readonly details of the rejected request.
        </DialogDescription>
      </DialogHeader>
      {meeting && (
        <div className="space-y-3 text-sm">
          <Row label="Title" value={meeting.title} />
          <Row label="Course" value={meeting.courseName} />
          <Row
            label="Created"
            value={new Date(meeting.createdAt).toLocaleString()}
          />
          <Row label="Description" value={meeting.description} />
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">
              Admin Rejection Reason
            </p>
            <p className="text-red-900">
              {meeting.rejectionReason ?? "No reason provided"}
            </p>
          </div>
        </div>
      )}
    </DialogContent>
  </Dialog>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
      {label}
    </p>
    <p className="text-gray-900 mt-0.5">{value}</p>
  </div>
);
