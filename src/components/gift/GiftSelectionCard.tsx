import { BookOpen, Clock, Star, Plus, Minus } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export interface GiftSelectionCardProps {
  thumbnail: string;
  title: string;
  description: string;
  lessons: number;
  duration: string;
  rating: number;
  ratingCount: number;
  price: number;
  originalPrice?: number;
  currency?: string;
  isSelected: boolean;
  onToggle: () => void;
}

export function GiftSelectionCard({
  thumbnail,
  title,
  description,
  lessons,
  duration,
  rating,
  ratingCount,
  price,
  originalPrice,
  currency,
  isSelected,
  onToggle,
}: GiftSelectionCardProps) {
  return (
    <div className="flex gap-3 rounded-xl border border-border/60 p-3">
      <img
        src={thumbnail}
        alt={title}
        className="h-20 w-28 rounded-lg object-cover shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm line-clamp-2">{title}</h4>
          <button
            onClick={onToggle}
            className={`h-7 w-7 grid place-items-center rounded-md border shrink-0 transition-colors ${
              isSelected
                ? "bg-primary border-primary text-primary-foreground"
                : "border-primary text-primary hover:bg-primary/10"
            }`}
            aria-label={isSelected ? "Remove from gift selection" : "Add to gift selection"}
          >
            {isSelected ? (
              <Minus className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {description}
        </p>
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              {lessons} Lessons
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {duration}
            </span>
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              {rating}{" "}
              <span className="text-muted-foreground">({ratingCount})</span>
            </span>
          </div>
          <div>
            <span className="font-bold text-primary">
              {formatPrice(price, currency)}
            </span>
            {originalPrice && originalPrice > price && (
              <span className="ml-1 text-muted-foreground line-through">
                {formatPrice(originalPrice, currency)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
