import { Megaphone } from "lucide-react";

export const AnnouncementEmptyState = () => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 text-center">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
      <Megaphone className="h-6 w-6" />
    </div>
    <p className="text-sm font-semibold text-gray-900">
      No announcements created yet
    </p>
    <p className="mt-1 max-w-xs text-xs text-gray-500">
      Create your first announcement to communicate with your students.
    </p>
  </div>
);
