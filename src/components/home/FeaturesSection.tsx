import { motion } from "framer-motion";
import {
  Globe,
  Layers,
  Sparkles,
  MessageCircle,
  BookOpen,
  Rocket,
} from "lucide-react";

const reasons = [
  {
    icon: Globe,
    title: "Flexible Learning",
    text: "No fixed schedule. Pick up a lesson when you have 20 minutes, or binge a whole section on a Sunday. It's up to you.",
  },
  {
    icon: Layers,
    title: "Every Field in One Place",
    text: "Tech, design, business, AI, you don't need five different platforms. It's all here.",
  },
  {
    icon: Sparkles,
    title: "Simplified Experiences",
    text: "No confusing interfaces or complicated setups. Just open a lesson and go.",
  },
  {
    icon: MessageCircle,
    title: "Real-time Support",
    text: "Got stuck? Our experts are here to guide you through your journey. You're not learning alone.",
  },
  {
    icon: BookOpen,
    title: "Structured Materials",
    text: "Notes, lessons, and resources are laid out clearly so you can find what you need without digging around.",
  },
  {
    icon: Rocket,
    title: "Skills that Matter",
    text: "Every course is built around what's actually relevant in today's job market and industries.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] },
};

export const FeaturesSection = () => {
  return (
    <section className="relative py-16 sm:py-24 bg-gradient-soft overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-50" aria-hidden />
      <div className="relative container mx-auto px-4 lg:px-8">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Learning <span className="text-gradient">that actually fits your life.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            You've got classes, maybe a part-time job, and things pulling your attention everywhere. Edvanz is built around that reality, not against it.
          </p>
        </motion.div>

        <div className="mt-12 sm:mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reasons.map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="glow-card rounded-2xl p-7 bg-card border border-border/60 shadow-card hover:shadow-card-hover transition-all"
            >
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <r.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-foreground">{r.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{r.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
