import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp, TrendingDown, Flame, Users, Star, BarChart3, Lightbulb, Zap, Target, BookOpen,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

interface TrendingCourse {
  id: string;
  title: string;
  category: string;
  enrollmentsThisWeek: number;
  enrollmentsLastWeek: number;
  trend: number;
  rating: number;
  totalStudents: number;
  completionRate: number;
}

const mockTrendingCourses: TrendingCourse[] = [
  { id: "1", title: "Complete React Developer Course 2024", category: "Web Development", enrollmentsThisWeek: 342, enrollmentsLastWeek: 278, trend: 23, rating: 4.8, totalStudents: 5420, completionRate: 72 },
  { id: "2", title: "Python for Data Science & ML", category: "Data Science", enrollmentsThisWeek: 298, enrollmentsLastWeek: 210, trend: 42, rating: 4.9, totalStudents: 8750, completionRate: 68 },
  { id: "3", title: "AWS Certified Solutions Architect", category: "Cloud Computing", enrollmentsThisWeek: 256, enrollmentsLastWeek: 245, trend: 4.5, rating: 4.7, totalStudents: 3890, completionRate: 55 },
  { id: "4", title: "UI/UX Design Masterclass", category: "Design", enrollmentsThisWeek: 189, enrollmentsLastWeek: 220, trend: -14, rating: 4.6, totalStudents: 2340, completionRate: 78 },
  { id: "5", title: "Generative AI with LLMs", category: "Artificial Intelligence", enrollmentsThisWeek: 412, enrollmentsLastWeek: 180, trend: 129, rating: 4.5, totalStudents: 1890, completionRate: 45 },
  { id: "6", title: "Docker & Kubernetes Mastery", category: "DevOps", enrollmentsThisWeek: 178, enrollmentsLastWeek: 165, trend: 8, rating: 4.7, totalStudents: 4120, completionRate: 62 },
];

const categoryData = [
  { name: "Web Dev", enrollments: 1240, revenue: 89500 },
  { name: "Data Science", enrollments: 980, revenue: 78200 },
  { name: "AI/ML", enrollments: 850, revenue: 92100 },
  { name: "Cloud", enrollments: 620, revenue: 54300 },
  { name: "Design", enrollments: 540, revenue: 38900 },
  { name: "DevOps", enrollments: 480, revenue: 41200 },
];

const weeklyTrend = [
  { week: "Week 1", enrollments: 820 },
  { week: "Week 2", enrollments: 950 },
  { week: "Week 3", enrollments: 1120 },
  { week: "Week 4", enrollments: 1340 },
  { week: "Week 5", enrollments: 1580 },
  { week: "Week 6", enrollments: 1675 },
];

const pieData = [
  { name: "Beginner", value: 45 },
  { name: "Intermediate", value: 35 },
  { name: "Advanced", value: 20 },
];

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];

const insights = [
  { icon: Zap, title: "AI/ML courses surging", description: "129% increase in AI course enrollments this week. Consider featuring more AI content.", color: "text-amber-600 bg-amber-100" },
  { icon: Target, title: "Completion rates dropping", description: "Average course completion dropped by 5% this month. Consider shorter module formats.", color: "text-red-600 bg-red-100" },
  { icon: Lightbulb, title: "Weekend learning peak", description: "42% of students engage most on weekends. Schedule new content releases for Fridays.", color: "text-blue-600 bg-blue-100" },
];

const AdminAIInsights = () => {
  const sorted = [...mockTrendingCourses].sort((a, b) => b.trend - a.trend);

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">AI Insights</h1>
          <p className="text-muted-foreground">AI-powered analytics on trending courses, learner behavior, and growth opportunities.</p>
        </div>

        {/* Key Insights */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {insights.map((insight, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="shadow-card h-full">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl ${insight.color} shrink-0`}>
                      <insight.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-card-foreground text-sm">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Trending Courses */}
        <Card className="shadow-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-orange-500" />Trending Courses This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sorted.map((course, i) => (
                <div key={course.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-muted-foreground w-6 text-center">{i + 1}</span>
                    <div>
                      <p className="font-semibold text-card-foreground text-sm">{course.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="secondary" className="text-xs">{course.category}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />{course.rating}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />{course.totalStudents.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 ml-10 sm:ml-0">
                    <div className="text-right">
                      <p className="text-sm font-medium">{course.enrollmentsThisWeek}</p>
                      <p className="text-xs text-muted-foreground">this week</p>
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium ${course.trend >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {course.trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {course.trend >= 0 ? "+" : ""}{course.trend.toFixed(0)}%
                    </div>
                    <div className="hidden sm:block w-24">
                      <div className="flex items-center gap-2">
                        <Progress value={course.completionRate} className="h-2" />
                        <span className="text-xs text-muted-foreground">{course.completionRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Enrollments by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="enrollments" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-500" />Weekly Enrollment Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="enrollments" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Level Distribution */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-purple-500" />Student Level Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <ResponsiveContainer width={220} height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={4} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {pieData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-sm font-medium">{entry.name}</span>
                    <span className="text-sm text-muted-foreground">{entry.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AdminLayout>
  );
};

export default AdminAIInsights;
