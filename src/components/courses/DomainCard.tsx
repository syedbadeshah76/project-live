import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Globe,
  Smartphone,
  Palette,
  BarChart3,
  Brain,
  Shield,
  Cloud,
  GitBranch,
  Megaphone,
  LucideIcon,
} from "lucide-react";
import { ITDomain } from "@/data/courses";

const iconMap: Record<string, LucideIcon> = {
  Globe,
  Smartphone,
  Palette,
  BarChart3,
  Brain,
  Shield,
  Cloud,
  GitBranch,
  Megaphone,
};

interface DomainCardProps {
  domain: ITDomain;
  index?: number;
}

export const DomainCard = ({ domain, index = 0 }: DomainCardProps) => {
  const Icon = iconMap[domain.icon] || Globe;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Link
        to={`/courses?category=${domain.id}`}
        className="block group"
      >
        <div className="bg-card rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 h-full border border-transparent hover:border-primary/20">
          <div
            className={`w-14 h-14 rounded-xl bg-gradient-to-br ${domain.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
          >
            <Icon className="h-7 w-7 text-white" />
          </div>
          <h3 className="font-display font-semibold text-lg text-card-foreground mb-2 group-hover:text-primary transition-colors">
            {domain.name}
          </h3>
          <p className="text-muted-foreground text-sm mb-4">{domain.description}</p>
          <p className="text-primary font-medium text-sm">
            {domain.courseCount} Courses →
          </p>
        </div>
      </Link>
    </motion.div>
  );
};
