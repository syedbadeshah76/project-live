import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const AnnouncementEmptyState = () => {
  const navigate = useNavigate();
  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm py-16 flex flex-col items-center text-center">
      <MessageSquare
        className="w-10 h-10 text-gray-800 mb-4"
        strokeWidth={1.5}
      />
      <h3 className="text-2xl font-semibold text-gray-900">
        Class Announcements
      </h3>
      <p className="text-gray-500 mt-2 max-w-md">
        Send important updates and announcements to all your students
      </p>
      <Button
        className="mt-6 bg-blue-600 hover:bg-blue-700"
        onClick={() => navigate("/instructor/announcements")}
      >
        <MessageSquare className="w-4 h-4 mr-2" /> View Announcements
      </Button>
    </div>
  );
};
