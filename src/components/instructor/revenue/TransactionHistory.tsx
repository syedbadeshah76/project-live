import type { RevenueTransaction, TransactionStatus } from "@/types/revenue.types";
import { cn } from "@/lib/utils";

interface Props {
  data: RevenueTransaction[];
}

const statusStyles: Record<TransactionStatus, string> = {
  completed: "bg-blue-50 text-blue-600",
  pending: "bg-amber-50 text-amber-600",
  refunded: "bg-red-50 text-red-500",
  failed: "bg-red-50 text-red-500",
};

function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        statusStyles[status],
      )}
    >
      {status}
    </span>
  );
}

export function TransactionHistory({ data }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-foreground">Transaction History</h3>

      {!data || data.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No transactions yet.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 font-medium">Student</th>
                <th className="py-2 font-medium">Course</th>
                <th className="py-2 font-medium">Amount</th>
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((t) => (
                <tr key={t.id}>
                  <td className="py-3 font-medium text-foreground">{t.studentName}</td>
                  <td className="py-3 text-muted-foreground">{t.courseTitle}</td>
                  <td className="py-3 font-semibold text-emerald-600">
                    ${t.amount}
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {t.date
                      ? new Date(t.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
