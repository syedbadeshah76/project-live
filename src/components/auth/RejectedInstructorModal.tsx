import { XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RejectedInstructorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBackToHome: () => void;
  supportHref?: string;
}

export const RejectedInstructorModal = ({
  open,
  onOpenChange,
  onBackToHome,
  supportHref = "/contact",
}: RejectedInstructorModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[9999] sm:max-w-[460px] rounded-2xl p-8 text-center"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="items-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-7 w-7 text-destructive" aria-hidden="true" />
          </div>
          <DialogTitle className="text-xl">
            Application Not Approved
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Thank you for your interest in becoming an Instructor on EDVANZ.
            Unfortunately your application could not be approved at this time.
            If you believe this is incorrect or would like to apply again in the
            future, please contact our support team.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-row sm:justify-center gap-2">
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <a href={supportHref}>Contact Support</a>
          </Button>
          <Button className="w-full sm:w-auto" onClick={onBackToHome}>
            Back To Home
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RejectedInstructorModal;
