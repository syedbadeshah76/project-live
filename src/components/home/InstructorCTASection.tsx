import { Users, DollarSign, Sparkles, Award, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const InstructorCTASection = ({
  onNavigate,
}: { onNavigate?: (page: string) => void } = {}) => {
  const navigate = useNavigate();

  const handleInstructorClick = () => {
    if (onNavigate) {
      onNavigate("contact");
    } else {
      navigate("/contact");
    }
  };

  return (
    <section className="py-16 sm:py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 sm:p-12 lg:p-16 text-white shadow-2xl">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />

          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-block rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold backdrop-blur text-white">
                For Instructors
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                Know something worth sharing? Come teach it.
              </h2>
              <p className="mt-4 text-white/85 text-base sm:text-lg max-w-xl leading-relaxed">
                Edvanz isn't just for learners. If you're a student who's figured something out, a professional with real experience, or a creator with a skill to share, you can build a course and teach it here.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={handleInstructorClick}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-indigo-700 hover:scale-[1.03] transition-transform shadow-lg cursor-pointer"
                >
                  Become an Instructor <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Users, t: "Global Learners", s: "Help learners worldwide through your knowledge and experience." },
                { icon: DollarSign, t: "Build Authority", s: "Build credibility and grow your professional online presence." },
                { icon: Sparkles, t: "Advanced Tools", s: "Easy tools to create, manage, and deliver courses smoothly." },
                { icon: Award, t: "Earn Income", s: "Earn through teaching while growing your personal brand online." },
              ].map((b) => (
                <div
                  key={b.t}
                  className="rounded-2xl bg-white/15 backdrop-blur p-5 border border-white/20"
                >
                  <b.icon className="h-6 w-6 text-white" />
                  <div className="mt-3 font-semibold text-white">{b.t}</div>
                  <div className="mt-1 text-xs sm:text-sm text-white/80 leading-relaxed">{b.s}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
