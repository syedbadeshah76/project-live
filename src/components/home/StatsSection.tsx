import { motion } from "framer-motion";

const stats = [
  { value: "100+", label: "Learning Topics" },
  { value: "10+", label: "categories" },
  { value: "∞", label: "Endless ways to grow" },
  { value: "100%", label: "Advanced E-learning" },
];

export const StatsSection = () => {
  return (
    <section className="py-12 sm:py-16 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glow-card rounded-2xl p-6 sm:p-8 text-center bg-card border border-border/50 shadow-sm hover:shadow-md transition-all"
            >
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gradient">
                {s.value}
              </div>
              <div className="mt-2 text-xs sm:text-sm text-muted-foreground font-medium">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
