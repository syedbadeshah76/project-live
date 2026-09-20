import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, Mail, Phone, Calendar, MapPin, LayoutDashboard, ArrowLeft,
  Users, BookOpen, DollarSign, Activity, Settings, Edit3, CheckCircle2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { usersService } from "@/services/users.service";
import type { UserProfile } from "@/types/api.types";

const AdminProfile = () => {
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
        console.error("Failed to load admin profile:", err);
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Total Users", value: "12,840", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Active Courses", value: "486", icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Revenue (MTD)", value: "$48.2K", icon: DollarSign, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "System Health", value: "99.9%", icon: Activity, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  const recentActions = [
    { action: "Approved instructor application", target: "Sarah Johnson", time: "2 hours ago" },
    { action: "Published broadcast notification", target: "All Students", time: "5 hours ago" },
    { action: "Updated platform commission rate", target: "Settings", time: "1 day ago" },
    { action: "Reviewed revenue report", target: "March 2026", time: "2 days ago" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg transition-colors" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base md:text-lg font-semibold">Admin Profile</h1>
          <Button onClick={() => navigate("/admin")} size="sm" className="gap-2 rounded-full">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
        {/* Hero Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-border bg-card">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
          <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-card shadow-lg">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md">
                <Shield className="h-4 w-4" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-2xl md:text-3xl font-bold">{user?.name}</h2>
                <Badge className="gap-1 bg-primary/15 text-primary border-primary/30 hover:bg-primary/20">
                  <CheckCircle2 className="h-3 w-3" /> Verified Admin
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Platform Administrator · Edvanz</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" />{user?.email}</span>
                <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" />+1 555 0102</span>
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />San Francisco, USA</span>
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />Joined {new Date(user?.createdAt || "").toLocaleDateString()}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2 shrink-0">
              <Edit3 className="h-4 w-4" /> Edit
            </Button>
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

        {/* Two-column section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Recent Activity</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin/analytics")}>View all</Button>
            </div>
            <ul className="space-y-3">
              {recentActions.map((a, i) => (
                <li key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm"><span className="font-medium">{a.action}</span> · <span className="text-muted-foreground">{a.target}</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-4"><Settings className="h-4 w-4 text-primary" /> Quick Actions</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/admin/users")}>
                <Users className="h-4 w-4 mr-2" /> Manage Users
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/admin/instructor-approvals")}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Pending Approvals
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/admin/revenue")}>
                <DollarSign className="h-4 w-4 mr-2" /> Revenue Reports
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/admin/settings")}>
                <Settings className="h-4 w-4 mr-2" /> Platform Settings
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminProfile;
