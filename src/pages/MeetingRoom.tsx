import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { meetingService } from "@/services/meeting.service";
import type { Meeting } from "@/types/meeting.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MessageSquare,
  Users,
  Phone,
  Clock,
  Send,
  ArrowLeft,
  Maximize,
  Settings,
} from "lucide-react";

// Mock participants
const mockParticipants = [
  { id: "p-1", name: "Sarah Johnson", role: "Instructor", avatar: "SJ" },
  { id: "p-2", name: "John Doe", role: "Student", avatar: "JD" },
  { id: "p-3", name: "Jane Smith", role: "Student", avatar: "JS" },
  { id: "p-4", name: "Alex Kumar", role: "Student", avatar: "AK" },
  { id: "p-5", name: "Emily Davis", role: "Student", avatar: "ED" },
];

const mockChat = [
  { id: "c-1", sender: "Sarah Johnson", message: "Welcome everyone! Let's get started.", time: "10:00" },
  { id: "c-2", sender: "John Doe", message: "Excited for today's session!", time: "10:01" },
  { id: "c-3", sender: "Jane Smith", message: "Can you explain useCallback again?", time: "10:05" },
];

const MeetingRoom = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [videoOn, setVideoOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState(mockChat);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const fetch = async () => {
      if (!meetingId) return;
      try {
        const res = await meetingService.getMeetingById(meetingId);
        if (res.success) setMeeting(res.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [meetingId]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const sendMessage = () => {
    if (!chatMessage.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { id: `c-${Date.now()}`, sender: "You", message: chatMessage, time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) },
    ]);
    setChatMessage("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-96 w-full max-w-4xl rounded-2xl" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Video className="h-16 w-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold text-foreground">Meeting not found</h2>
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" />Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(220_50%_8%)] text-white flex flex-col">
      {/* Top Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 py-3 bg-[hsl(220_45%_12%)] border-b border-[hsl(220_35%_20%)]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-semibold text-sm md:text-base truncate">{meeting.title}</h1>
            <p className="text-xs text-white/50 truncate">{meeting.courseName} • {meeting.instructorName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge className="bg-red-500/20 text-red-300 border-red-500/30 font-mono">
            <Clock className="h-3 w-3 mr-1" />{formatTimer(elapsed)}
          </Badge>
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 hidden sm:flex">
            <span className="relative flex h-2 w-2 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            Live
          </Badge>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 flex flex-col">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex-1 relative m-2 md:m-4 rounded-2xl overflow-hidden bg-[hsl(220_40%_15%)] flex items-center justify-center min-h-[200px]"
          >
            {videoOn ? (
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220_50%_18%)] to-[hsl(230_40%_12%)] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Video className="h-10 w-10 md:h-14 md:w-14 text-primary" />
                  </div>
                  <p className="text-white/60 text-sm">Video preview area</p>
                  <p className="text-white/30 text-xs mt-1">Zoom SDK will be integrated here</p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <VideoOff className="h-16 w-16 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">Camera is off</p>
              </div>
            )}

            {/* Self view */}
            <div className="absolute bottom-4 right-4 w-32 md:w-44 aspect-video rounded-xl bg-[hsl(220_45%_20%)] border border-white/10 flex items-center justify-center overflow-hidden">
              <div className="text-center">
                <Avatar className="h-8 w-8 mx-auto mb-1">
                  <AvatarFallback className="bg-primary/30 text-primary text-xs">You</AvatarFallback>
                </Avatar>
                <p className="text-[10px] text-white/40">You</p>
              </div>
            </div>

            {/* Fullscreen */}
            <Button variant="ghost" size="icon" className="absolute top-3 right-3 h-8 w-8 text-white/40 hover:text-white hover:bg-white/10">
              <Maximize className="h-4 w-4" />
            </Button>
          </motion.div>

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-2 md:gap-3 px-4 py-3 md:py-4"
          >
            <Button
              variant="ghost"
              size="icon"
              className={`h-12 w-12 rounded-full ${micOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500/20 text-red-400 hover:bg-red-500/30"}`}
              onClick={() => setMicOn(!micOn)}
            >
              {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-12 w-12 rounded-full ${videoOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500/20 text-red-400 hover:bg-red-500/30"}`}
              onClick={() => setVideoOn(!videoOn)}
            >
              {videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20">
              <Monitor className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-12 w-12 rounded-full ${showChat ? "bg-primary/30 text-primary" : "bg-white/10 text-white hover:bg-white/20"}`}
              onClick={() => { setShowChat(!showChat); setShowParticipants(false); }}
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-12 w-12 rounded-full ${showParticipants ? "bg-primary/30 text-primary" : "bg-white/10 text-white hover:bg-white/20"}`}
              onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); }}
            >
              <Users className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20 hidden md:flex">
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 text-white ml-2"
              onClick={() => navigate(-1)}
            >
              <Phone className="h-5 w-5 rotate-[135deg]" />
            </Button>
          </motion.div>
        </div>

        {/* Side Panel: Chat or Participants */}
        {(showChat || showParticipants) && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full lg:w-80 bg-[hsl(220_45%_12%)] border-l border-[hsl(220_35%_20%)] flex flex-col max-h-[40vh] lg:max-h-full"
          >
            {showChat && (
              <>
                <div className="p-3 border-b border-[hsl(220_35%_20%)] font-semibold text-sm">
                  Chat
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {chatMessages.map((msg) => (
                    <div key={msg.id}>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-primary">{msg.sender}</span>
                        <span className="text-[10px] text-white/30">{msg.time}</span>
                      </div>
                      <p className="text-sm text-white/80">{msg.message}</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-[hsl(220_35%_20%)] flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
                  />
                  <Button size="icon" className="shrink-0 bg-primary hover:bg-primary/80 h-9 w-9" onClick={sendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {showParticipants && (
              <>
                <div className="p-3 border-b border-[hsl(220_35%_20%)] font-semibold text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" /> Participants ({mockParticipants.length})
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {mockParticipants.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs">{p.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-[10px] text-white/40">{p.role}</p>
                      </div>
                      {p.role === "Instructor" && (
                        <Badge className="bg-primary/20 text-primary text-[10px] border-primary/30">Host</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MeetingRoom;
