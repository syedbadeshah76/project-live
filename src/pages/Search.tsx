import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CourseCard } from "@/components/courses/CourseCard";
import { Search, SlidersHorizontal, X, Star, Filter } from "lucide-react";
import { searchService } from "@/services/search.service";
import { enrollmentService } from "@/services/enrollment.service";
import { categoriesService } from "@/services/categories.service";
import type { Course, Category, SearchFilters } from "@/types/api.types";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const levels = ["Beginner", "Intermediate", "Advanced"];
const ratings = [4.5, 4.0, 3.5, 3.0];
const durations = [
  { label: "0-2 Hours", value: "0-2" },
  { label: "2-5 Hours", value: "2-5" },
  { label: "5-10 Hours", value: "5-10" },
  { label: "10+ Hours", value: "10+" },
];

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalResults, setTotalResults] = useState(0);

  // Filter state
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200]);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("relevance");
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());

  // Pre-fetch enrolled course IDs once on mount
  useEffect(() => {
    enrollmentService.getEnrolledCourseIds().then(setEnrolledIds).catch(() => {});
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoriesService.getCategories();
        setCategories(response.data);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
  }, []);

  // Search courses
  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const filters: SearchFilters = {
          query: query || undefined,
          category: selectedCategories.length > 0 ? selectedCategories.join(",") : undefined,
          level: selectedLevels.length > 0 ? selectedLevels.join(",") : undefined,
          priceMin: priceRange[0] > 0 ? priceRange[0] : undefined,
          priceMax: priceRange[1] < 200 ? priceRange[1] : undefined,
          rating: minRating || undefined,
          duration: selectedDuration || undefined,
          sortBy: sortBy as any,
        };

        const response = await searchService.search(query || "", filters);
        setCourses(response.data.courses);
        setTotalResults(response.data.totalResults);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [query, selectedCategories, selectedLevels, priceRange, minRating, selectedDuration, sortBy]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: query });
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleLevel = (level: string) => {
    setSelectedLevels((prev) =>
      prev.includes(level)
        ? prev.filter((l) => l !== level)
        : [...prev, level]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedLevels([]);
    setPriceRange([0, 200]);
    setMinRating(null);
    setSelectedDuration(null);
    setSortBy("relevance");
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategories.length > 0) count++;
    if (selectedLevels.length > 0) count++;
    if (priceRange[0] > 0 || priceRange[1] < 200) count++;
    if (minRating) count++;
    if (selectedDuration) count++;
    return count;
  }, [selectedCategories, selectedLevels, priceRange, minRating, selectedDuration]);

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Categories */}
      <Accordion type="single" collapsible defaultValue="categories">
        <AccordionItem value="categories">
          <AccordionTrigger>Categories</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={category.id}
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={() => toggleCategory(category.id)}
                  />
                  <Label htmlFor={category.id} className="flex-1 cursor-pointer text-sm">
                    {category.name}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    ({category.courseCount})
                  </span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Level */}
      <Accordion type="single" collapsible defaultValue="level">
        <AccordionItem value="level">
          <AccordionTrigger>Level</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {levels.map((level) => (
                <div key={level} className="flex items-center space-x-2">
                  <Checkbox
                    id={level}
                    checked={selectedLevels.includes(level)}
                    onCheckedChange={() => toggleLevel(level)}
                  />
                  <Label htmlFor={level} className="cursor-pointer text-sm">
                    {level}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Price Range */}
      <Accordion type="single" collapsible defaultValue="price">
        <AccordionItem value="price">
          <AccordionTrigger>Price Range</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 px-1">
              <Slider
                min={0}
                max={200}
                step={10}
                value={priceRange}
                onValueChange={(v) => setPriceRange(v as [number, number])}
              />
              <div className="flex items-center justify-between text-sm">
                <span>${priceRange[0]}</span>
                <span>${priceRange[1]}+</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Rating */}
      <Accordion type="single" collapsible defaultValue="rating">
        <AccordionItem value="rating">
          <AccordionTrigger>Ratings</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {ratings.map((rating) => (
                <button
                  key={rating}
                  onClick={() => setMinRating(minRating === rating ? null : rating)}
                  className={`flex w-full items-center gap-2 rounded-lg p-2 text-sm transition-colors ${
                    minRating === rating
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                  <span>{rating} & up</span>
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Duration */}
      <Accordion type="single" collapsible defaultValue="duration">
        <AccordionItem value="duration">
          <AccordionTrigger>Duration</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {durations.map((duration) => (
                <button
                  key={duration.value}
                  onClick={() =>
                    setSelectedDuration(
                      selectedDuration === duration.value ? null : duration.value
                    )
                  }
                  className={`w-full rounded-lg p-2 text-left text-sm transition-colors ${
                    selectedDuration === duration.value
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {duration.label}
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <Button variant="outline" className="w-full" onClick={clearFilters}>
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Search Courses</h1>
          <p className="mt-2 text-muted-foreground">
            Find the perfect course to advance your skills
          </p>
          
          <form onSubmit={handleSearch} className="mt-6 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search for courses..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar - Desktop */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <Card>
              <CardContent className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold">Filters</h3>
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary">{activeFiltersCount} active</Badge>
                  )}
                </div>
                <FilterContent />
              </CardContent>
            </Card>
          </aside>

          {/* Results */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Mobile Filter Button */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden">
                      <Filter className="mr-2 h-4 w-4" />
                      Filters
                      {activeFiltersCount > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80">
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">
                      <FilterContent />
                    </div>
                  </SheetContent>
                </Sheet>

                <p className="text-muted-foreground">
                  {loading ? "Searching..." : `${totalResults} results found`}
                </p>
              </div>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Most Relevant</SelectItem>
                  <SelectItem value="popularity">Most Popular</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters */}
            {activeFiltersCount > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {selectedCategories.map((catId) => {
                  const cat = categories.find((c) => c.id === catId);
                  return (
                    <Badge key={catId} variant="secondary" className="gap-1">
                      {cat?.name}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => toggleCategory(catId)}
                      />
                    </Badge>
                  );
                })}
                {selectedLevels.map((level) => (
                  <Badge key={level} variant="secondary" className="gap-1">
                    {level}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => toggleLevel(level)}
                    />
                  </Badge>
                ))}
                {(priceRange[0] > 0 || priceRange[1] < 200) && (
                  <Badge variant="secondary" className="gap-1">
                    ${priceRange[0]} - ${priceRange[1]}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setPriceRange([0, 200])}
                    />
                  </Badge>
                )}
                {minRating && (
                  <Badge variant="secondary" className="gap-1">
                    {minRating}★ & up
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setMinRating(null)}
                    />
                  </Badge>
                )}
              </div>
            )}

            {/* Course Grid */}
            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="aspect-video animate-pulse bg-muted" />
                    <CardContent className="p-4">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : courses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Search className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No courses found</h3>
                  <p className="mt-1 text-muted-foreground">
                    Try adjusting your search or filters
                  </p>
                  <Button variant="outline" className="mt-4" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course as any} enrolledCourseIds={enrolledIds} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default SearchPage;
