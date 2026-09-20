import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    text: "Edvanz made it so easy to switch from design into AI. The structure is incredible.",
    role: "Aspiring AI Designer",
  },
  {
    text: "I love that I can explore web dev and business courses in the same place.",
    role: "Career Switcher",
  },
  {
    text: "The interface is so clean — I actually look forward to opening lessons.",
    role: "Lifelong Learner",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] },
};

export const TestimonialsSection = () => {
  return (
    <section className="py-16 sm:py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Loved by <span className="text-gradient">curious minds</span>
          </h2>
        </motion.div>

        <div className="mt-12 sm:mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glow-card rounded-2xl p-7 bg-card border border-border/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex gap-1 text-indigo-600">
                  {[...Array(5)].map((_, k) => (
                    <Star key={k} className="h-4 w-4 fill-indigo-600 text-indigo-600" />
                  ))}
                </div>
                <p className="mt-4 text-foreground/90 leading-relaxed text-sm sm:text-base">
                  "{t.text}"
                </p>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 shrink-0" />
                <div className="text-xs sm:text-sm font-semibold text-muted-foreground">{t.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
