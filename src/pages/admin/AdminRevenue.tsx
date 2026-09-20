import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DollarSign, TrendingUp, ArrowUpRight, Users, BookOpen, RefreshCw, Settings,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts";
import { revenueService, type RevenueOverview, type CourseRevenue, type InstructorRevenue, type MonthlyRevenue, type RevenueConfig } from "@/services/revenue.service";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const AdminRevenue = () => {
  const { toast } = useToast();
  const [overview, setOverview] = useState<RevenueOverview | null>(null);
  const [courseRevenue, setCourseRevenue] = useState<CourseRevenue[]>([]);
  const [instructorRevenue, setInstructorRevenue] = useState<InstructorRevenue[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenue[]>([]);
  const [config, setConfig] = useState<RevenueConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<RevenueConfig | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, courseRes, instructorRes, monthlyRes, configRes] = await Promise.all([
          revenueService.getOverview(),
          revenueService.getCourseBreakdown(),
          revenueService.getInstructorRevenue(),
          revenueService.getMonthlyRevenue(),
          revenueService.getConfig(),
        ]);
        setOverview(overviewRes.data);
        setCourseRevenue(courseRes.data);
        setInstructorRevenue(instructorRes.data);
        setMonthlyData(monthlyRes.data);
        setConfig(configRes.data);
      } catch {
        toast({ title: "Error", description: "Failed to load revenue data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveConfig = async () => {
    if (!editConfig) return;
    try {
      const res = await revenueService.updateConfig(editConfig);
      setConfig(res.data);
      setConfigDialogOpen(false);
      toast({ title: "Saved", description: "Revenue configuration updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save configuration.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AdminLayout>
    );
  }

  const stats = [
    { label: "Total Revenue", value: `$${(overview?.totalRevenue ?? 0).toLocaleString()}`, icon: DollarSign, color: "bg-green-500", change: `+${overview?.growthPercentage ?? 0}%` },
    { label: "Platform Share", value: `$${(overview?.platformShare ?? 0).toLocaleString()}`, icon: TrendingUp, color: "bg-blue-500", change: `${config?.platformPercentage ?? 30}%` },
    { label: "Instructor Earnings", value: `$${(overview?.instructorEarnings ?? 0).toLocaleString()}`, icon: Users, color: "bg-purple-500", change: `${config?.instructorPercentage ?? 70}%` },
    { label: "This Month", value: `$${(overview?.revenueThisMonth ?? 0).toLocaleString()}`, icon: BookOpen, color: "bg-orange-500", change: `+${overview?.growthPercentage ?? 0}%` },
  ];

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">Revenue Management</h1>
            <p className="text-muted-foreground">Track revenue, instructor earnings, and platform share.</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => { setEditConfig(config); setConfigDialogOpen(true); }}>
            <Settings className="h-4 w-4" />
            Revenue Config
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.1 }}>
              <Card className="shadow-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-3 rounded-xl ${stat.color}`}><stat.icon className="h-5 w-5 text-white" /></div>
                    <span className="flex items-center text-sm font-medium text-green-600">{stat.change}<ArrowUpRight className="h-4 w-4 ml-1" /></span>
                  </div>
                  <p className="text-2xl font-bold text-card-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Monthly Revenue Chart */}
        <Card className="shadow-card mb-6">
          <CardHeader><CardTitle className="font-display text-lg">Monthly Revenue Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="platformShare" name="Platform Share" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="instructorShare" name="Instructor Share" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Course Revenue */}
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display text-lg">Revenue by Course</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Course</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Platform</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseRevenue.map((cr) => (
                    <TableRow key={cr.courseId}>
                      <TableCell>
                        <p className="font-medium text-sm line-clamp-1">{cr.courseTitle}</p>
                        <p className="text-xs text-muted-foreground">{cr.instructor} · {cr.enrollments} enrollments</p>
                      </TableCell>
                      <TableCell className="text-right font-medium">${cr.totalRevenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-muted-foreground">${cr.platformShare.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Instructor Earnings */}
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display text-lg">Instructor Earnings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {instructorRevenue.map((ir) => (
                <div key={ir.instructorId} className="flex items-center gap-4 p-3 rounded-xl border">
                  <Avatar>
                    <AvatarImage src={ir.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary">{ir.instructorName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{ir.instructorName}</p>
                    <p className="text-xs text-muted-foreground">{ir.courses} courses · {ir.students.toLocaleString()} students</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">${ir.netEarnings.toLocaleString()}</p>
                    {ir.pendingPayout > 0 && (
                      <Badge variant="outline" className="text-xs mt-1">
                        <RefreshCw className="h-3 w-3 mr-1" />Pending ${ir.pendingPayout.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Config Dialog */}
        <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revenue Configuration</DialogTitle>
              <DialogDescription>Configure revenue split between platform and instructors.</DialogDescription>
            </DialogHeader>
            {editConfig && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Platform Share (%)</Label>
                    <Input type="number" min="0" max="100" value={editConfig.platformPercentage} onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setEditConfig({ ...editConfig, platformPercentage: val, instructorPercentage: 100 - val });
                    }} />
                  </div>
                  <div className="space-y-2">
                    <Label>Instructor Share (%)</Label>
                    <Input type="number" value={editConfig.instructorPercentage} disabled />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Minimum Payout ($)</Label>
                  <Input type="number" min="0" value={editConfig.minPayout} onChange={(e) => setEditConfig({ ...editConfig, minPayout: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Payout Frequency</Label>
                  <Select value={editConfig.payoutFrequency} onValueChange={(v: any) => setEditConfig({ ...editConfig, payoutFrequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveConfig}>Save Configuration</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AdminLayout>
  );
};

export default AdminRevenue;
