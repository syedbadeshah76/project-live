import { motion } from "framer-motion";
import { Rocket } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Blobs from "./Blobs";
import EnquiryForm from "./EnquiryForm";
import heroLearning from "@/assets/hero-learning.png";
import { usePageMeta } from "@/lib/use-page-meta";

const homeSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://edvanz.co/#website",
      "url": "https://edvanz.co/",
      "name": "Edvanz",
      "publisher": {
        "@id": "https://edvanz.co/#organization"
      }
    },
    {
      "@type": "Organization",
      "@id": "https://edvanz.co/#organization",
      "name": "Edvanz",
      "url": "https://edvanz.co/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://edvanz.co/assets/edvanz%20logo-B63BYItQ.png"
      }
    },
    {
      "@type": "WebPage",
      "@id": "https://edvanz.co/#webpage",
      "url": "https://edvanz.co/",
      "name": "Edvanz | Online IT, Software & Programming Courses",
      "isPartOf": {
        "@id": "https://edvanz.co/#website"
      },
      "about": {
        "@id": "https://edvanz.co/#organization"
      }
    }
  ]
};

export const HeroSection = ({
  onNavigate,
}: { onNavigate?: (page: string) => void } = {}) => {
  usePageMeta({
    title: "Edvanz.co | Online IT, Software & Programming Courses",
    description:
      "Learn in-demand IT, software & programming skills with Edvanz. Explore online courses designed to help learners build practical knowledge & advance their careers. Sign up Now!",
    keywords:
      "Edvanz.co, Online IT Courses, Online Software Courses, Online Programming Courses",
    url: "https://edvanz.co/",
    path: "/",
    schema: homeSchema,
  });

  const navigate = useNavigate();

  const handleExploreClick = () => {
    if (onNavigate) {
      onNavigate("contact");
    } else {
      navigate("/contact");
    }
  };

  return (
    <section className="relative overflow-hidden pt-10 sm:pt-14 lg:pt-20 pb-16 sm:pb-20 lg:pb-24">
      <Blobs />
      <div className="absolute inset-0 grid-pattern opacity-60" aria-hidden />

      <div className="relative container mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] gap-10 lg:gap-12 items-center">
          {/* LEFT — copy */}
          <div className="min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-[11px] sm:text-xs font-semibold text-primary mb-4"
            >
              <Rocket className="h-3.5 w-3.5" />
              Learn. Teach. Build
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="text-[2.25rem] leading-[1.1] sm:text-5xl lg:text-[3.5rem] xl:text-[3.85rem] font-bold tracking-tight text-foreground"
            >
              Edvanz - <span className="text-gradient">Your Way for Modern Learning.</span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-5 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed space-y-3"
            >
              <p>
                Got stuck on where to start your career? Whether you want to learn code, just get better at something, or curious about choosing the right career path that truly makes sense, you are at the right place.
              </p>
              <p className="text-gradient font-semibold">
                We've built Edvanz for you.
              </p>
              <p className="text-sm sm:text-base text-muted-foreground/90">
                An advanced online learning platform designed for curious minds to find real courses, gain practical skills, and share knowledge through meaningful experiences.
              </p>
            </motion.div>

            <div className="mt-8 sm:mt-10 flex justify-start">
              <button
                onClick={handleExploreClick}
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 px-6 sm:px-8 py-3.5 sm:py-4 text-base sm:text-lg font-bold text-white shadow-[0_10px_30px_rgba(109,40,217,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(109,40,217,0.45)] active:scale-95 cursor-pointer"
              >
                🚀 Explore Courses • Join Edvanz
              </button>
            </div>
          </div>

          {/* RIGHT — enquiry form */}
                   <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="relative min-w-0 w-full flex items-center justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-[620px]">
              <img
                src={heroLearning}
                alt="Edvanz online learning platform"
                className="w-full h-auto object-contain drop-shadow-[0_25px_50px_rgba(79,70,229,0.25)]"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
