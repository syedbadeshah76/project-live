import { motion } from "framer-motion";
import { Clock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] },
};

export const CTASection = ({
  onNavigate,
}: { onNavigate?: (page: string) => void } = {}) => {
  const navigate = useNavigate();

  const handleAboutClick = () => {
    if (onNavigate) {
      onNavigate("about");
    } else {
      navigate("/about");
    }
  };

  const handleContactClick = () => {
    if (onNavigate) {
      onNavigate("contact");
    } else {
      navigate("/contact");
    }
  };

  return (
    <section className="py-16 sm:py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 sm:p-14 lg:p-20 text-center text-white shadow-2xl">
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 70%, white 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          <motion.div {...fadeUp} className="relative z-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white mb-4">
              <Clock className="h-6 w-6" />
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              Start Your Learning Journey
              <br />
              with Edvanz
            </h2>
            <p className="mt-5 text-base sm:text-lg text-white/85 max-w-2xl mx-auto leading-relaxed">
              Step into a smarter, more modern way of learning. Your future starts here.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 sm:gap-4">
              <button
                onClick={handleAboutClick}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-semibold text-indigo-700 hover:scale-[1.04] transition-transform shadow-lg cursor-pointer"
              >
                Learn Skills That Actually Move You Forward. <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={handleContactClick}
                className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-semibold backdrop-blur hover:bg-white/10 transition-colors text-white cursor-pointer"
              >
                Contact Us
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
