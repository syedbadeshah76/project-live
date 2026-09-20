// src/components/meetings/MeetingHeader.tsx
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Props {
  onSchedule?: () => void;
  onScheduleDemo?: () => void;
}

export const MeetingHeader = ({ onSchedule, onScheduleDemo }: Props) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Live</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage and organize all courses on your platform
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button
          className="bg-[#2563EB] hover:bg-blue-700 text-white h-10 px-5 rounded-xl font-medium shadow-xs"
          onClick={onScheduleDemo}
        >
          Schedule Demo Class
        </Button>
        <Button
          className="bg-[#2563EB] hover:bg-blue-700 text-white h-10 px-5 rounded-xl font-medium shadow-xs"
          onClick={() =>
            onSchedule ? onSchedule() : navigate("/instructor/meetings/schedule")
          }
        >
          Schedule Class
        </Button>
      </div>
    </div>
  );
};
