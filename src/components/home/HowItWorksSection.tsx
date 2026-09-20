import { motion } from "framer-motion";
import { Brain, Zap, Award, TrendingUp } from "lucide-react";

const experiences = [
  {
    icon: Brain,
    title: "Smart Learning",
    text: "Structured lessons designed for clear and flexible learning experiences.",
  },
  {
    icon: Zap,
    title: "Interactive Experience",
    text: "Practical activities and projects that build real-world experience.",
  },
  {
    icon: Award,
    title: "Educational Innovation",
    text: "Industry-focused learning connected to practical skills and applications.",
  },
  {
    icon: TrendingUp,
    title: "Digital Growth",
    text: "Explore new skills and learning opportunities with every course.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] },
};

export const HowItWorksSection = () => {
  return (
    <section className="py-16 sm:py-24 relative overflow-hidden bg-gradient-to-b from-indigo-50/60 via-purple-50/40 to-background dark:from-background dark:to-background">
      <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" aria-hidden="true" />
      <div className="relative container mx-auto px-4 lg:px-8">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
            An <span className="text-gradient">experience</span> built for the future
          </h2>
        </motion.div>

        <div className="mt-12 sm:mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {experiences.map((e, i) => (
            <motion.div
              key={e.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glow-card rounded-3xl p-6 sm:p-7 text-center bg-card border border-border/50 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-between"
            >
              <div>
                <div className="mx-auto h-14 w-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <e.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-semibold text-lg sm:text-xl text-foreground">{e.title}</h3>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {e.text}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
