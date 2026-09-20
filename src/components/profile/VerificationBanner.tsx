import { AlertTriangle } from "lucide-react";

interface VerificationBannerProps {
  message: string;
  linkText: string;
  onLinkClick: () => void;
}

export const VerificationBanner = ({ message, linkText, onLinkClick }: VerificationBannerProps) => (
  <div className="w-full bg-[#604BD6] text-primary-foreground py-2.5 px-4 flex items-center justify-center gap-2 text-sm">
    <AlertTriangle className="h-4 w-4 shrink-0" />
    <span>
      Verify your{" "}
      <button onClick={onLinkClick} className="font-semibold underline underline-offset-2 hover:opacity-80">
        {linkText}
      </button>{" "}
      {message}
    </span>
  </div>
);
