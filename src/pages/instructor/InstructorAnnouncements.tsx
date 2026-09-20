// src/pages/instructor/InstructorAnnouncements.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { Megaphone } from "lucide-react";
import { AnnouncementForm } from "@/components/announcements/AnnouncementForm";
import { AnnouncementList } from "@/components/announcements/AnnouncementList";
import { AnnouncementEmptyState } from "@/components/announcements/AnnouncementEmptyState";
import {
  useAnnouncements,
  useAnnouncementMutations,
  useEligibleCourses,
} from "@/hooks/useAnnouncements";
import type { Announcement } from "@/types/announcement.types";
import type { AnnouncementFormValues } from "@/lib/announcement.schema";

const InstructorAnnouncements = () => {
  const { data: courses, isLoading: coursesLoading } = useEligibleCourses();
  const {
    data: announcements,
    isLoading,
    error,
    addLocal,
    updateLocal,
    removeLocal,
  } = useAnnouncements(coursesLoading ? undefined : courses);
  const { create, update, remove, isSubmitting } = useAnnouncementMutations(courses);
  const [editing, setEditing] = useState<Announcement | null>(null);

  const handleSubmit = async (values: AnnouncementFormValues): Promise<boolean> => {
    if (editing) {
      const updated = await update(editing.id, values.htmlContent, editing.courseId);
      if (!updated) return false;
      updateLocal({ ...editing, ...updated });
      setEditing(null);
      return true;
    }
    const created = await create({
      courseId: values.courseId,
      htmlContent: values.htmlContent,
    });
    if (!created) return false;
    addLocal(created);
    return true;
  };

  const handleDelete = async (a: Announcement) => {
    if (!window.confirm("Delete this announcement?")) return;
    const ok = await remove(a.id);
    if (ok) {
      removeLocal(a.id);
      if (editing?.id === a.id) setEditing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
        → Announcements posted here are received by students in their Course Learning Page
        notifications
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left — Create */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-semibold text-gray-900">
              {editing ? "Edit Announcement" : "Create Announcement"}
            </h3>
          </div>

          <AnnouncementForm
            courses={courses}
            coursesLoading={coursesLoading}
            isSubmitting={isSubmitting}
            editing={editing}
            onCancelEdit={() => setEditing(null)}
            onSubmit={handleSubmit}
          />
        </motion.section>

        {/* Right — Recent */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Recent Announcements</h3>
          </div>

          {isLoading ? (
            <p className="py-10 text-center text-sm text-gray-500">Loading…</p>
          ) : error ? (
            <p className="py-10 text-center text-sm text-red-600">{error}</p>
          ) : announcements.length === 0 ? (
            <AnnouncementEmptyState />
          ) : (
            <AnnouncementList
              items={announcements}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          )}
        </motion.section>
      </div>
    </div>
  );
};

export default InstructorAnnouncements;
