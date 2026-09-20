import { Home, ArrowLeft, Search, BookOpen } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">

      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-blue-500/10" />

      {/* Blur circles */}
      <div className="absolute left-10 top-20 h-72 w-72 animate-pulse rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute bottom-10 right-10 h-72 w-72 animate-pulse rounded-full bg-cyan-500/20 blur-3xl delay-1000" />

      {/* Floating icons */}
      <BookOpen className="absolute left-20 top-24 h-10 w-10 animate-bounce text-primary/30" />
      <Search className="absolute right-28 top-36 h-8 w-8 animate-pulse text-blue-400/40" />

      {/* Card */}
      <div className="relative max-w-2xl rounded-3xl border bg-card/80 p-12 text-center shadow-2xl backdrop-blur-xl">

        {/* Badge */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Search className="h-8 w-8 text-primary" />
        </div>

        {/* 404 */}
        <h1 className="bg-gradient-to-r from-primary via-blue-500 to-cyan-500 bg-clip-text text-8xl font-extrabold text-transparent">
          404
        </h1>

        <h2 className="mt-5 text-3xl font-bold">
          Oops! This page went on vacation.
        </h2>

        <p className="mt-4 text-muted-foreground leading-7">
          Looks like the page you're trying to visit doesn't exist anymore,
          has been moved, or the URL might be incorrect.
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          Requested URL:
          <span className="ml-2 rounded bg-muted px-2 py-1 font-mono text-primary">
            {location.pathname}
          </span>
        </p>

        {/* Buttons */}
        <div className="mt-10 flex flex-wrap justify-center gap-4">

          <Button
            size="lg"
            onClick={() => navigate("/")}
            className="rounded-full px-8"
          >
            <Home className="mr-2 h-5 w-5" />
            Home
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate(-1)}
            className="rounded-full px-8"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Go Back
          </Button>

          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate("/explore")}
            className="rounded-full px-8"
          >
            <BookOpen className="mr-2 h-5 w-5" />
            Explore Courses
          </Button>

        </div>

        {/* Bottom Text */}
        <div className="mt-10 border-t pt-6 text-sm text-muted-foreground">
          💡 Don't worry! Even the best explorers take a wrong turn sometimes.
        </div>

      </div>
    </div>
  );
};

export default NotFound;