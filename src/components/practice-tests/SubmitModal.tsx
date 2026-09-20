interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
}

export function SubmitModal({ open, onCancel, onConfirm, submitting }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-[#1F2937]">Submit Assessment</h3>
        <p className="mt-2 text-sm text-[#6B7280]">
          Are you sure you want to submit your assessment? Once submitted, you will not be able to change your answers.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-[#E5E9F2] bg-white px-4 py-2 text-sm font-semibold text-[#4B5563] hover:bg-[#F3F4F6]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="rounded-lg bg-[#2D4BFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1E3AE6] disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Assessment"}
          </button>
        </div>
      </div>
    </div>
  );
}
