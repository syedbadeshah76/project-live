import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaveDraft: () => void;
  onDiscard: () => void;
}

export const DraftConfirmationDialog = ({
  open,
  onOpenChange,
  onSaveDraft,
  onDiscard,
}: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Save as draft?</DialogTitle>
        <DialogDescription>
          You have unsaved changes. Save your progress as a draft, discard it,
          or keep editing.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2 sm:justify-end">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Continue Editing
        </Button>
        <Button
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50"
          onClick={onDiscard}
        >
          Discard
        </Button>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={onSaveDraft}>
          Save Draft
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
