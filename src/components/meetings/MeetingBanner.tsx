import { Info, BookOpen } from "lucide-react";
import { ABOUT_LIVE_CLASSES_BULLETS } from "@/constants/meeting.constants";

export const MeetingInfoBanner = () => (
  <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 text-sm text-blue-800">
    <Info className="h-4 w-4 mt-0.5 shrink-0" />
    <p>
      Live class requests are reviewed by Admin before going live. Approved
      classes appear in the Student Live Classes section automatically.
    </p>
  </div>
);

export const AboutLiveClassesBanner = () => (
  <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
    <div className="flex items-center gap-2 mb-2 text-blue-700 font-semibold text-sm">
      <BookOpen className="h-4 w-4" /> About Live Classes
    </div>
    <ul className="space-y-1.5">
      {ABOUT_LIVE_CLASSES_BULLETS.map((b) => (
        <li key={b} className="flex gap-2 text-sm text-blue-900/80">
          <span className="text-green-600">✓</span> {b}
        </li>
      ))}
    </ul>
  </div>
);
