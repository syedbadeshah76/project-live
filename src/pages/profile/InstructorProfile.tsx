import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GraduationCap, Mail, Phone, Calendar, MapPin, LayoutDashboard, ArrowLeft,
  BookOpen, Users, Star, DollarSign, Edit3, CheckCircle2, Award, TrendingUp,
  Linkedin, Github, Globe,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { usersService } from "@/services/users.service";
import type { UserProfile } from "@/types/api.types";

const InstructorProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await usersService.getProfile();
        if (res.success) setProfile(res.data);
      } catch (err) {
        console.error("Failed to load instructor profile:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-48 rounded-2xl mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Courses Created", value: "14", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Total Students", value: "2,389", icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Avg Rating", value: "4.8", icon: Star, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Earnings (MTD)", value: "$3.2K", icon: DollarSign, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  const expertise = ["React", "Node.js", "TypeScript", "System Design", "MongoDB", "AWS"];

  const topCourses = [
    { title: "Complete React Mastery", students: 1240, rating: 4.9, completion: 87 },
    { title: "Advanced Node.js Backend", students: 856, rating: 4.7, completion: 78 },
    { title: "TypeScript Deep Dive", students: 612, rating: 4.8, completion: 82 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg transition-colors" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base md:text-lg font-semibold">Instructor Profile</h1>
          <Button onClick={() => navigate("/instructor")} size="sm" className="gap-2 rounded-full">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-border bg-card">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
          <div className="relative p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="relative shrink-0">
                <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-card shadow-lg">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{user?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md">
                  <GraduationCap className="h-4 w-4" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-2xl md:text-3xl font-bold">{user?.name}</h2>
                  <Badge className="gap-1 bg-primary/15 text-primary border-primary/30 hover:bg-primary/20">
                    <CheckCircle2 className="h-3 w-3" /> Verified Instructor
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">Senior React Developer · 10+ years experience</p>
                <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
                  Passionate educator helping developers build production-ready applications. Specialized in modern JavaScript frameworks and scalable architecture.
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" />{user?.email}</span>
                  <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" />+1 555 0199</span>
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />New York, USA</span>
                  <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />Joined {new Date(user?.createdAt || "").toLocaleDateString()}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => navigate("/instructor/settings")}>
                <Edit3 className="h-4 w-4" /> Edit
              </Button>
            </div>

            {/* Socials */}
            <div className="flex items-center gap-2 mt-6 pt-6 border-t border-border/60">
              <span className="text-xs text-muted-foreground mr-2">Connect:</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="LinkedIn"><Linkedin className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="GitHub"><Github className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Website"><Globe className="h-4 w-4" /></Button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-2xl p-4 md:p-5"
            >
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className="text-xl md:text-2xl font-bold">{s.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Courses */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Top Performing Courses</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate("/instructor/courses")}>View all</Button>
            </div>
            <div className="space-y-4">
              {topCourses.map((c, i) => (
                <div key={i} className="p-4 rounded-xl border border-border/60 hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{c.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.students.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{c.rating}</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-primary shrink-0">{c.completion}%</span>
                  </div>
                  <Progress value={c.completion} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>

          {/* Expertise & Quick actions */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-4"><Award className="h-4 w-4 text-primary" /> Areas of Expertise</h3>
              <div className="flex flex-wrap gap-2">
                {expertise.map((skill) => (
                  <Badge key={skill} variant="secondary" className="px-3 py-1">{skill}</Badge>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/instructor/courses/new")}>
                  <BookOpen className="h-4 w-4 mr-2" /> Create New Course
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/instructor/students")}>
                  <Users className="h-4 w-4 mr-2" /> View Students
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/instructor/analytics")}>
                  <TrendingUp className="h-4 w-4 mr-2" /> Analytics
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InstructorProfile;
