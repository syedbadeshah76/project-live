import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface LogoutConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  loading?: boolean;
}

export const LogoutConfirmModal = ({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: LogoutConfirmModalProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[520px] rounded-3xl p-8 text-left">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-bold">
            Log Out
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed mt-2">
            You are about to log out of your account. To continue learning, you'll need to sign in again.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-6 flex-row justify-center gap-4 sm:justify-center">
          <AlertDialogAction
            onClick={async (e) => {
              e.preventDefault();
              await onConfirm();
            }}
            disabled={loading}
            className="w-40 bg-[#2457D6] hover:bg-[#1d46ad] text-white font-semibold rounded-lg h-11"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Yes I'm sure"
            )}
          </AlertDialogAction>

          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="w-40 rounded-lg h-11 border-[#2457D6] text-[#2457D6] font-bold"
          >
            Go, back
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LogoutConfirmModal;
