interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
}

export function ExitModal({ open, onCancel, onConfirm, submitting }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-[#1F2937]">End Assessment</h3>
        <p className="mt-2 text-sm text-[#6B7280]">
          Leaving the assessment will submit your current answers. Any unanswered questions will be marked as incorrect. You will not be able to continue this attempt.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-[#E5E9F2] bg-white px-4 py-2 text-sm font-semibold text-[#4B5563] hover:bg-[#F3F4F6]"
          >
            Continue Assessment
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="rounded-lg bg-[#EF4444] px-4 py-2 text-sm font-semibold text-white hover:bg-[#DC2626] disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit & Exit"}
          </button>
        </div>
      </div>
    </div>
  );
}
