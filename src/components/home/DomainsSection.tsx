import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Cpu,
  Code2,
  TrendingUp,
  Smartphone,
  Briefcase,
  Palette,
  BookOpen,
  GraduationCap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface FieldItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  description: string;
}

const fields: FieldItem[] = [
  {
    icon: Brain,
    label: "Data Analytics",
    color: "from-violet-500 to-indigo-500",
    description:
      "Analyze business data, create dashboards, and generate insights using Excel, SQL, Power BI, and Python.",
  },
  {
    icon: Brain,
    label: "Artificial Intelligence",
    color: "from-violet-500 to-indigo-500",
    description:
      "Learn data-driven systems, automation, and predictive models through advanced online AI and machine learning courses.",
  },
  {
    icon: Cpu,
    label: "DevOps",
    color: "from-sky-500 to-blue-500",
    description:
      "Learn Docker, Kubernetes, CI/CD, AWS, Azure, Linux, Jenkins, and automation for modern software delivery.",
  },
  {
    icon: Brain,
    label: "Data Science",
    color: "from-violet-500 to-indigo-500",
    description:
      "Master statistics, machine learning, Python, visualization, and real-world data science projects.",
  },
  {
    icon: Code2,
    label: "React.JS",
    color: "from-blue-500 to-indigo-500",
    description:
      "Master modern React.js, Hooks, Context API, routing, state management, and build scalable web applications.",
  },
  {
    icon: TrendingUp,
    label: "Cybersecurity",
    color: "from-blue-500 to-cyan-500",
    description:
      "Learn ethical hacking, penetration testing, network security, cloud security, and cyber defense practices.",
  },
  {
    icon: Code2,
    label: "Web Development",
    color: "from-blue-500 to-indigo-500",
    description:
      "Learn to build websites with our curated web development courses from basic frontend to full-stack with real-world projects.",
  },
  {
    icon: Code2,
    label: "Java - Core & Advance",
    color: "from-blue-500 to-indigo-500",
    description:
      "Learn Core Java, Advanced Java, JDBC, Servlets, Spring Boot, REST APIs, and enterprise application development.",
  },
  {
    icon: Smartphone,
    label: "App Development",
    color: "from-indigo-500 to-purple-500",
    description:
      "Design and deploy software applications for iOS, Android, and computers with application development courses.",
  },
  {
    icon: Smartphone,
    label: "React Native",
    color: "from-indigo-500 to-purple-500",
    description:
      "Build cross-platform Android and iOS mobile applications using React Native with real-world projects.",
  },
  {
    icon: Briefcase,
    label: "Business & Marketing",
    color: "from-purple-500 to-fuchsia-500",
    description:
      "Explore branding strategies for business promotions, growth, and marketing with our best online marketing courses.",
  },
  {
    icon: Palette,
    label: "Design & Creativity",
    color: "from-pink-500 to-purple-500",
    description:
      "Expert online graphic design courses to transform ideas into visual storytelling, digital media, and content creation.",
  },
  {
    icon: Cpu,
    label: "Information Technology",
    color: "from-sky-500 to-blue-500",
    description:
      "Build digital skills in software, systems, networking, cybersecurity, cloud, and more with expert-led online IT courses.",
  },
  {
    icon: BookOpen,
    label: "Academic Learning",
    color: "from-fuchsia-500 to-purple-500",
    description:
      "Comprehensive online courses with certificates designed to strengthen subject knowledge and practical understanding.",
  },
  {
    icon: GraduationCap,
    label: "Career Roadmaps",
    color: "from-emerald-500 to-teal-500",
    description:
      "From beginner to professional, we guide your career journey through structured training programmes and industry-relevant skills.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] },
};

export const DomainsSection = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  useEffect(() => {
    const checkMediaQuery = () => {
      setIsDesktop(window.matchMedia("(min-width: 1024px)").matches);
    };
    checkMediaQuery();
    window.addEventListener("resize", checkMediaQuery);
    return () => window.removeEventListener("resize", checkMediaQuery);
  }, []);

  const visibleLimit = isDesktop ? 6 : 3;
  const displayedFields = isExpanded ? fields : fields.slice(0, visibleLimit);

  return (
    <section className="relative py-16 sm:py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div {...fadeUp} className="max-w-3xl">
          <span className="inline-block rounded-full bg-gradient-soft px-4 py-1.5 text-xs font-semibold text-primary">
            A Centralised Learning Hub
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Edvanz brings together every field of study into one place{" "}
            <span className="text-gradient">Easy to access and learn.</span>
          </h2>
        </motion.div>

        {/* FIELDS GRID WITH SEE MORE / SEE LESS TOGGLE */}
        <div className="mt-10 sm:mt-14 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {displayedFields.map((f, i) => (
              <motion.div
                key={f.label}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  duration: 0.4,
                  delay: isExpanded ? 0 : i * 0.05,
                  layout: { type: "spring", stiffness: 300, damping: 30 },
                }}
                className="glow-card rounded-2xl p-6 border border-border bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all"
              >
                <div
                  className={`h-12 w-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white shadow-md`}
                >
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-semibold text-lg text-foreground">{f.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="mt-10 flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border bg-background hover:bg-muted text-sm font-medium text-foreground shadow-sm hover:shadow transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
          >
            <span>{isExpanded ? "See Less" : "See More"}</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
            )}
          </button>
        </div>
      </div>
    </section>
  );
};