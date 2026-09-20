import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { meetingService } from "@/services/meeting.service";
import type { InstructorCourseOption } from "@/types/meeting.types";

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ApprovedCourseDropdown = ({
  value,
  onChange,
  disabled,
  placeholder = "Choose option...",
}: Props) => {
  const [courses, setCourses] = useState<InstructorCourseOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    meetingService.getApprovedCourses().then((r) => {
      if (!alive) return;
      if (r.success) setCourses(r.data);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled || loading}
    >
      <SelectTrigger className="w-full h-11 bg-white">
        <SelectValue
          placeholder={loading ? "Loading courses..." : placeholder}
        />
      </SelectTrigger>
      <SelectContent>
        {courses.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
