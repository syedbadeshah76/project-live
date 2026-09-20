import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { CourseCard } from "@/components/courses/CourseCard";
import { courses, itDomains } from "@/data/courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, X, PlayCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Courses = () => {
  const { isAuthenticated, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  if (isAuthenticated && user?.role === "student") {
    return <Navigate to="/dashboard/search" replace />;
  }


  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.instructor.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" ||
        course.category.toLowerCase().replace(/\s+/g, "-").includes(selectedCategory);

      const matchesLevel = selectedLevel === "all" || course.level === selectedLevel;

      return matchesSearch && matchesCategory && matchesLevel;
    });
  }, [searchQuery, selectedCategory, selectedLevel]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedLevel("all");
  };

  const hasActiveFilters =
    searchQuery || selectedCategory !== "all" || selectedLevel !== "all";

  return (
    <MainLayout>
      {/* Header */}
      <section className="gradient-hero py-16 md:py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
              Explore Our Courses
            </h1>
            <p className="text-white/80 text-lg mb-8">
              Browse our comprehensive collection of courses designed to help you master
              the latest technologies.
            </p>

            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search courses, topics, or instructors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg rounded-xl bg-white border-0 shadow-lg"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured intro video */}
      <section className="py-10 md:py-14 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
                <PlayCircle className="h-3.5 w-3.5" />
                Watch Intro
              </div>
              <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground mb-4">
                Discover the future of IT learning
              </h2>
              <p className="text-muted-foreground text-base md:text-lg mb-6 max-w-xl">
                Get a quick tour of how Edvanz combines hands-on projects, live mentorship, and industry-ready
                curricula across web development, AI, cybersecurity, cloud, and more.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  Project-based learning across 10+ in-demand IT domains
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  Live classes and mentor support from senior engineers
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  Verifiable certificates and a portfolio you can showcase
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative aspect-video rounded-2xl overflow-hidden shadow-xl border border-border bg-card"
            >
              <video
                className="w-full h-full object-cover"
                controls
                playsInline
                preload="metadata"
                poster="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1280&h=720&fit=crop"
                aria-label="Edvanz IT learning intro video"
              >
                <source
                  src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Filters & Results */}
      <section className="py-12">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {filteredCourses.length}
                </span>{" "}
                courses found
              </p>
            </div>

            <div
              className={`flex flex-col md:flex-row gap-4 w-full md:w-auto ${
                showFilters ? "block" : "hidden md:flex"
              }`}
            >
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {itDomains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      {domain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters} className="text-destructive">
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Course Grid */}
          {filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCourses.map((course, index) => (
                <CourseCard key={course.id} course={course} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg mb-4">
                No courses found matching your criteria.
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
};

export default Courses;
