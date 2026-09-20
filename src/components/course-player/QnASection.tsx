// src/components/course-player/QnASection.tsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ThumbsUp, MessageSquare, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { qnaService, type QnaQuestion } from "@/services/qna.service";

interface Props {
  courseId: string;
  courseName?: string;
  /** The id of the instructor who OWNS this course. Only they can reply. */
  courseInstructorId?: string;
  /** Optional list of lecture titles for the "All Lectures" filter. */
  lectures?: { id: string; title: string }[];
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

export const QnASection = ({
  courseId,
  courseName,
  courseInstructorId,
  lectures = [],
}: Props) => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<QnaQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lectureFilter, setLectureFilter] = useState<string>("all");
  const [sort, setSort] = useState<"recommended" | "recent" | "top">(
    "recommended",
  );

  const [addOpen, setAddOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});

  const isInstructorOfCourse =
    !!user &&
    user.role === "instructor" &&
    !!courseInstructorId &&
    user.id === courseInstructorId;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    qnaService
      .listByCourse(courseId)
      .then((res) => {
        if (alive && res.success) setQuestions(res.data);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [courseId]);

  const filtered = useMemo(() => {
    let list = [...questions];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (x) =>
          x.title.toLowerCase().includes(q) ||
          x.content.toLowerCase().includes(q) ||
          x.authorName.toLowerCase().includes(q),
      );
    }
    if (sort === "recent") {
      list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    } else if (sort === "top") {
      list.sort((a, b) => b.likesCount - a.likesCount);
    } else {
      // "recommended": answered first, then by likes
      list.sort((a, b) => {
        const ab = a.answer ? 1 : 0;
        const bb = b.answer ? 1 : 0;
        if (ab !== bb) return bb - ab;
        return b.likesCount - a.likesCount;
      });
    }
    return list;
  }, [questions, search, sort]);

  const handleLike = async (q: QnaQuestion) => {
    if (!isAuthenticated) {
      toast({ title: "Please sign in to like questions" });
      return;
    }
    // Optimistic update
    setQuestions((prev) =>
      prev.map((x) =>
        x.id === q.id
          ? {
              ...x,
              likedByMe: !x.likedByMe,
              likesCount: Math.max(0, x.likesCount + (x.likedByMe ? -1 : 1)),
            }
          : x,
      ),
    );
    const res = await qnaService.toggleLike(q.id);
    if (!res.success) {
      // rollback
      setQuestions((prev) =>
        prev.map((x) => (x.id === q.id ? q : x)),
      );
    }
  };

  const handleAsk = async () => {
    if (!isAuthenticated || !user) {
      toast({ title: "Please sign in to ask a question" });
      return;
    }
    if (user.role !== "student") {
      toast({
        title: "Only enrolled students can ask questions",
        variant: "destructive",
      });
      return;
    }
    if (!draftTitle.trim() || !draftContent.trim()) {
      toast({ title: "Please add a title and details" });
      return;
    }
    setSubmitting(true);
    const res = await qnaService.ask({
      courseId,
      courseName,
      title: draftTitle.trim(),
      content: draftContent.trim(),
      author: {
        id: user.id,
        name: user.name,
        email: (user as any).email,
        avatar: user.avatar,
      },
    });
    setSubmitting(false);
    if (res.success) {
      setQuestions((prev) => [res.data, ...prev]);
      setDraftTitle("");
      setDraftContent("");
      setAddOpen(false);
      toast({ title: "Question posted" });
    } else {
      toast({ title: res.message || "Could not post", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search from courses..."
            className="pl-9 h-10 rounded-xl"
          />
        </div>

        <Select value={lectureFilter} onValueChange={setLectureFilter}>
          <SelectTrigger className="h-10 rounded-xl w-[160px]">
            <SelectValue placeholder="All Lectures" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lectures</SelectItem>
            {lectures.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v: any) => setSort(v)}>
          <SelectTrigger className="h-10 rounded-xl w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recommended">Recommended</SelectItem>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="top">Top Voted</SelectItem>
          </SelectContent>
        </Select>

        {user?.role === "student" && (
          <Button
            variant="outline"
            className="h-10 rounded-xl border-primary text-primary hover:bg-primary/5"
            onClick={() => setAddOpen(true)}
          >
            Add a comment
          </Button>
        )}
      </div>

      <h3 className="font-semibold text-card-foreground">
        Featured questions in this course
      </h3>

      {/* List */}
      <div className="space-y-4">
        {loading && (
          <div className="text-sm text-muted-foreground py-6 text-center">
            Loading questions…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-sm text-muted-foreground py-6 text-center">
            No questions yet. Be the first to ask!
          </div>
        )}

        <AnimatePresence initial={false}>
          {filtered.map((q) => {
            const showReplies = !!openReplies[q.id];
            return (
              <motion.article
                key={q.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={q.authorAvatar} />
                    <AvatarFallback>
                      {q.authorName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-card-foreground">
                        {q.title}
                      </p>
                      <button
                        onClick={() => handleLike(q)}
                        className={`flex items-center gap-1 text-sm shrink-0 ${
                          q.likedByMe ? "text-primary" : "text-muted-foreground"
                        } hover:text-primary`}
                        aria-label="Like question"
                      >
                        <ThumbsUp
                          className={`h-4 w-4 ${q.likedByMe ? "fill-primary" : ""}`}
                        />
                        <span className="font-medium">{q.likesCount}</span>
                      </button>
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                      {q.content}
                    </p>

                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{q.authorName}</span>
                      <span>·</span>
                      <span>{timeAgo(q.createdAt)}</span>
                    </div>

                    {/* Only instructor of this course can reply.
                        Everyone (student who asked + other enrolled students)
                        can view the answer via "See Replies". */}
                    <div className="mt-3 flex items-center gap-4">
                      {q.answer && (
                        <button
                          onClick={() =>
                            setOpenReplies((s) => ({
                              ...s,
                              [q.id]: !s[q.id],
                            }))
                          }
                          className="text-primary text-sm font-medium hover:underline"
                        >
                          {showReplies ? "Hide Replies" : "See Replies"}
                        </button>
                      )}

                      {isInstructorOfCourse && (
                        <InstructorReplyInline
                          questionId={q.id}
                          hasAnswer={!!q.answer}
                          onAnswered={(ans) =>
                            setQuestions((prev) =>
                              prev.map((x) =>
                                x.id === q.id ? { ...x, answer: ans } : x,
                              ),
                            )
                          }
                        />
                      )}
                    </div>

                    {showReplies && q.answer && (
                      <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={q.answer.authorAvatar} />
                            <AvatarFallback>
                              {q.answer.authorName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-semibold">
                            {q.answer.authorName}
                          </span>
                          <span className="text-[11px] rounded-full bg-primary/10 text-primary px-2 py-0.5">
                            Instructor
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {timeAgo(q.answer.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-card-foreground whitespace-pre-wrap">
                          {q.answer.content}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Ask dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ask a question</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Question title"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
            />
            <Textarea
              rows={5}
              placeholder="Describe your question in detail..."
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAsk}
                disabled={submitting}
                className="gap-1"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Posting..." : "Post question"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// -------- Inline instructor reply (Course Player) --------
const InstructorReplyInline = ({
  questionId,
  hasAnswer,
  onAnswered,
}: {
  questionId: string;
  hasAnswer: boolean;
  onAnswered: (a: NonNullable<QnaQuestion["answer"]>) => void;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user || !text.trim()) return;
    setBusy(true);
    const res = await qnaService.answer(questionId, {
      content: text.trim(),
      author: { id: user.id, name: user.name, avatar: user.avatar },
    });
    setBusy(false);
    if (res.success) {
      onAnswered(res.data);
      setText("");
      setOpen(false);
      toast({ title: "Reply posted" });
    } else {
      toast({ title: res.message || "Failed", variant: "destructive" });
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-primary text-sm font-medium hover:underline"
      >
        {hasAnswer ? "Edit Reply" : "Reply as Instructor"}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reply to Question</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your reply..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy || !text.trim()}>
              {busy ? "Sending..." : "Send Reply"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QnASection;
