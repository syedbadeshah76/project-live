import { Hourglass } from "lucide-react";
import type { PayoutBreakdown } from "@/types/revenue.types";

interface Props {
  data: PayoutBreakdown;
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={valueClass ?? "font-semibold text-foreground"}>{value}</span>
    </div>
  );
}

export function PayoutBreakdownCard({ data }: Props) {
  const parsedDate = data.nextPayoutDate ? new Date(data.nextPayoutDate) : null;
  const nextDate = parsedDate && !isNaN(parsedDate.getTime())
    ? parsedDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "—";

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-foreground">Payout Breakdown</h3>
      <div className="mt-4 divide-y divide-border">
        <Row label="Total Revenue" value={`$${data.totalRevenue.toLocaleString()}`} />
        <Row
          label={`Platform Fee (${data.platformFeePercent}%)`}
          value={`-$${data.platformFee.toLocaleString()}`}
          valueClass="font-semibold text-red-500"
        />
        <Row
          label="Your Earnings"
          value={`$${data.instructorEarnings.toLocaleString()}`}
          valueClass="font-semibold text-emerald-600"
        />
        <Row
          label="Completed Payouts"
          value={`$${data.completedPayouts.toLocaleString()}`}
          valueClass="font-semibold text-blue-600"
        />
        <Row
          label="Pending Payout"
          value={`$${data.pendingPayout.toLocaleString()}`}
          valueClass="font-semibold text-amber-500"
        />
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
        <Hourglass className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div>
            Admin processes payout every {data.payoutCycleDays} days.
          </div>
          <div className="font-medium">Next: {nextDate}</div>
        </div>
      </div>
    </div>
  );
}
