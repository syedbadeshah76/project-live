// src/components/courses/BookFreeDemoModal.tsx
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Loader2, CheckCircle2 } from "lucide-react";
import type { DemoClassItem } from "@/types/demoClass";
import { demoClassService } from "@/services/demoClass.service";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface BookFreeDemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demoClasses: DemoClassItem[];
  courseTitle?: string;
  courseDescription?: string;
  onBookingSuccess?: (demoClassId: string) => void;
}

export const BookFreeDemoModal: React.FC<BookFreeDemoModalProps> = ({
  open,
  onOpenChange,
  demoClasses,
  courseTitle = "Live Course",
  courseDescription = "Live course sessions and practical training.",
  onBookingSuccess,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [booking, setBooking] = useState(false);

  const activeDemo: DemoClassItem | undefined =
    demoClasses && demoClasses.length > 0
      ? demoClasses[selectedIndex] || demoClasses[0]
      : undefined;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Scheduled Soon";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dateFormatted = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeFormatted = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateFormatted}, ${timeFormatted}`;
  };

  const handleBook = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to book a free demo class.",
      });
      navigate("/login");
      return;
    }

    if (!activeDemo?.id) {
      toast({
        title: "No Demo Class Available",
        description: "No active demo class found for this course.",
        variant: "destructive",
      });
      return;
    }

    setBooking(true);
    try {
      const res = await demoClassService.bookDemoClass(activeDemo.id);

      try {
        const prevDemos = JSON.parse(localStorage.getItem("edvanz_booked_demos") || "[]");
        if (Array.isArray(prevDemos) && !prevDemos.includes(activeDemo.id)) {
          prevDemos.push(activeDemo.id);
          localStorage.setItem("edvanz_booked_demos", JSON.stringify(prevDemos));
        }
      } catch {}

      toast({
        title: "Demo Class Booked",
        description: res.message || "Demo class booked successfully.",
      });
      sonnerToast.success(res.message || "Demo class booked successfully.");

      if (onBookingSuccess) {
        onBookingSuccess(activeDemo.id);
      }
      onOpenChange(false);
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to book demo class.";
      toast({
        title: "Booking Failed",
        description: errMsg,
        variant: "destructive",
      });
      sonnerToast.error(errMsg);
    } finally {
      setBooking(false);
    }
  };

  const isBooked = !!activeDemo?.booked;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-6 sm:p-7 rounded-2xl bg-white border border-slate-100 shadow-2xl">
        <DialogHeader className="pb-1 text-left">
          <span className="text-xs font-semibold text-[#2563EB] tracking-wide block">
            Instructor demo
          </span>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Book a free course demo
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Share a few details and our learning team will help you plan a live course that fits your goals.
          </p>
        </DialogHeader>

        {/* Demo Slots Selector (if multiple slots exist) */}
        {demoClasses.length > 1 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs font-bold text-slate-700">Available Demo Sessions:</p>
            <div className="flex flex-wrap gap-2">
              {demoClasses.map((d, i) => (
                <button
                  key={d.id || i}
                  type="button"
                  onClick={() => setSelectedIndex(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedIndex === i
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200/80"
                  }`}
                >
                  Slot {i + 1} ({formatDate(d.scheduledStartAt || (d as any).scheduledAt).split(",")[0]})
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 pt-2 text-left">
          {/* Course title */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              Course title :
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {activeDemo?.title || courseTitle}
            </p>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              Description
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">
              {activeDemo?.description || courseDescription}
            </p>
          </div>

          {/* Start date & End date row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-1.5">
                Start date
              </h4>
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                <span>{formatDate(activeDemo?.scheduledStartAt || (activeDemo as any)?.scheduledAt)}</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-1.5">
                End date
              </h4>
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                <span>{formatDate(activeDemo?.scheduledEndAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl px-6 h-10 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Button>

          {isBooked ? (
            <Button
              type="button"
              disabled
              className="rounded-xl px-6 h-10 bg-emerald-600 text-white font-semibold shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Booked
            </Button>
          ) : (
            <Button
              type="button"
              disabled={booking || !activeDemo}
              onClick={handleBook}
              className="rounded-xl px-6 h-10 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold shadow-xs transition-colors"
            >
              {booking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                "Book"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
