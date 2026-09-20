import { useEffect, useState } from "react";
import { DollarSign, Hourglass, CalendarDays, Receipt } from "lucide-react";
import revenueService from "@/services/instructor/revenueService";
import type {
  RevenueOverview,
  RevenueTransaction,
} from "@/types/revenue.types";
import { StatCard } from "./StatCard";
import { RevenueByCourse } from "./RevenueByCourse";
import { PayoutBreakdownCard } from "./PayoutBreakdownCard";
import { TransactionHistory } from "./TransactionHistory";
import { RevenueTrend } from "./RevenueTrend";

export function InstructorRevenue() {
  const [overview, setOverview] = useState<RevenueOverview | null>(null);
  const [transactions, setTransactions] = useState<RevenueTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [ov, tx] = await Promise.all([
          revenueService.getOverview(),
          revenueService.getTransactions({ page: 1, limit: 10 }),
        ]);
        if (cancelled) return;
        setOverview(ov);
        setTransactions(tx.items);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load revenue");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading revenue…</div>
    );
  }
  if (error || !overview) {
    return <div className="p-6 text-sm text-red-500">{error ?? "No data"}</div>;
  }

  const { stats, breakdown, revenueByCourse, trend } = overview;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Revenue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage all payouts and refunds here
          </p>
        </header>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
          />
          <StatCard
            label="Pending Payouts"
            value={`$${stats.pendingPayout.toLocaleString()}`}
            icon={Hourglass}
          />
          <StatCard
            label="This Month"
            value={`$${stats.thisMonthRevenue.toLocaleString()}`}
            icon={CalendarDays}
          />
          <StatCard
            label="Transactions"
            value={stats.transactions.toLocaleString()}
            icon={Receipt}
          />
        </div>

        {/* Info banner */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          Payouts processed by Admin Portal · Admin → Revenue → Instructor Payouts
        </div>

        {/* Middle row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueByCourse data={revenueByCourse} />
          </div>
          <PayoutBreakdownCard data={breakdown} />
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TransactionHistory data={transactions} />
          </div>
          <RevenueTrend data={trend} />
        </div>
      </div>
    </div>
  );
}

export default InstructorRevenue;
