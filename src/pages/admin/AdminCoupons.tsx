import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Plus, Search, Eye, Pencil, Trash2, Copy, CheckCircle2,
  Clock, Bell, Eye as EyeIcon, ArrowLeft, X,
} from "lucide-react";
import {
  couponService,
  type Coupon,
  type CourseLite,
  type DiscountType,
  type ApplicableTo,
  type CreateCouponPayload,
} from "@/services/coupon.service";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 6;

type ViewMode = "list" | "create" | "edit";

// --- FormState / emptyForm
interface FormState {
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: string;
  applicableTo: ApplicableTo;
  courseIds: string[];
  minPurchase: string;
  maxDiscount: string;
  usageLimit: string;
  perUserLimit: string;       // NEW
  validFrom: string;
  expiryDate: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  code: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  applicableTo: "all",
  courseIds: [],
  minPurchase: "0",
  maxDiscount: "100",
  usageLimit: "1000",
  perUserLimit: "1",          // NEW
  validFrom: "",
  expiryDate: "",
  isActive: true,
};

export default function AdminCoupons() {
  const { toast } = useToast();

  // data
const [allCoupons, setAllCoupons] = useState<Coupon[]>([]);
const [courses, setCourses] = useState<CourseLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  // ui state
const [summary, setSummary] = useState<{ active: number; revenue: number; redeemed: number; avgDiscount: number } | null>(null);
const [mode, setMode] = useState<ViewMode>("list");
const [viewCoupon, setViewCoupon] = useState<Coupon | null>(null);
const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
const [editingId, setEditingId] = useState<string | null>(null);
const [form, setForm] = useState<FormState>(emptyForm);

// --- Load (summary + list + courses)
const loadCoupons = useCallback(async () => {
  const res = await couponService.getCoupons({ page: 1, pageSize: 1000 });
  setAllCoupons(res.data.items);
}, []);

useEffect(() => {
  (async () => {
    try {
      setLoading(true);
      const [, courseRes, summaryRes] = await Promise.all([
        loadCoupons(),
        couponService.getCourses().catch(() => ({ data: [] as CourseLite[] })),
        couponService.getCouponSummary().catch(() => null),
      ]);
      setCourses(courseRes.data);
      if (summaryRes) {
        setSummary({
          active: summaryRes.data.activeCoupons,
          revenue: summaryRes.data.totalRevenue,
          redeemed: summaryRes.data.totalRedeemed,
          avgDiscount: summaryRes.data.avgDiscount,
        });
      }
    } catch {
      toast({ title: "Error", description: "Failed to load coupons.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  })();
}, [toast, loadCoupons]);

  // ---- Derived
// --- stats: prefer the backend summary, fall back to local aggregation
const stats = useMemo(() => {
  if (summary) return summary;
  const active = allCoupons.filter((c) => c.isActive).length;
  const revenue = allCoupons.reduce((s, c) => s + (c.revenue ?? 0), 0);
  const redeemed = allCoupons.reduce((s, c) => s + c.usedCount, 0);
  const pct = allCoupons.filter((c) => c.discountType === "percentage");
  const avgDiscount = pct.length ? pct.reduce((s, c) => s + c.discountValue, 0) / pct.length : 0;
  return { active, revenue, redeemed, avgDiscount };
}, [allCoupons, summary]);


  const filteredCoupons = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return allCoupons.filter((c) => {
      const matchQ =
        !q ||
        c.code.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && c.isActive) ||
        (statusFilter === "expired" && !c.isActive);
      return matchQ && matchStatus;
    });
  }, [allCoupons, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCoupons.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedCoupons = filteredCoupons.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // ---- Helpers
  const resetForm = () => setForm(emptyForm);

 const validateForm = (): string | null => {
  if (!form.code.trim()) return "Coupon code is required.";
  if (!/^[A-Z0-9_-]{3,32}$/.test(form.code.trim().toUpperCase()))
    return "Code must be 3–32 characters (letters, numbers, - or _).";
  const value = Number(form.discountValue);
  if (!form.discountValue || Number.isNaN(value) || value <= 0) return "Enter a valid discount value.";
  if (form.discountType === "percentage" && value > 100) return "Percentage discount cannot exceed 100.";
  if (!form.usageLimit || Number(form.usageLimit) <= 0) return "Enter a valid usage limit.";
  if (!form.perUserLimit || Number(form.perUserLimit) <= 0) return "Enter a valid per-user limit.";
  if (!form.expiryDate) return "Valid Until date is required.";
  if (form.validFrom && form.validFrom > form.expiryDate) return "Valid From must be before Valid Until.";
  if (form.applicableTo === "specific" && form.courseIds.length === 0) return "Select at least one course.";
  return null;
};

  const buildPayload = (): CreateCouponPayload => ({
  code: form.code.trim().toUpperCase(),
  description: form.description.trim(),
  discountType: form.discountType,
  discountValue: Number(form.discountValue),
  applicableTo: form.applicableTo,
  courseIds: form.applicableTo === "specific" ? form.courseIds : [],
  minPurchase: form.minPurchase ? Number(form.minPurchase) : 0,
  maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
  usageLimit: Number(form.usageLimit),
  perUserLimit: Number(form.perUserLimit),
  validFrom: form.validFrom || undefined,
  expiryDate: form.expiryDate,
  isActive: form.isActive,
});
const apiError = (e: unknown, fallback: string) => {
  const err = e as { message?: string; response?: { data?: { message?: string } } };
  return err?.response?.data?.message || err?.message || fallback;
};

const handleCreate = async () => {
  const err = validateForm();
  if (err) return toast({ title: "Validation Error", description: err, variant: "destructive" });
  try {
    setSubmitting(true);
    await couponService.createCoupon(buildPayload());
    await loadCoupons();
    toast({ title: "Created", description: "Coupon created successfully." });
    resetForm();
    setMode("list");
  } catch (e) {
    toast({ title: "Error", description: apiError(e, "Failed to create coupon."), variant: "destructive" });
  } finally {
    setSubmitting(false);
  }
};

 const handleUpdate = async () => {
  if (!editingId) return;
  const err = validateForm();
  if (err) return toast({ title: "Validation Error", description: err, variant: "destructive" });
  try {
    setSubmitting(true);
    await couponService.updateCoupon(editingId, buildPayload());
    await loadCoupons();
    toast({ title: "Updated", description: "Coupon updated successfully." });
    resetForm();
    setEditingId(null);
    setMode("list");
  } catch (e) {
    toast({ title: "Error", description: apiError(e, "Failed to update coupon."), variant: "destructive" });
  } finally {
    setSubmitting(false);
  }
};
 const handleDelete = async () => {
  if (!deleteTarget) return;
  const target = deleteTarget;
  try {
    await couponService.deleteCoupon(target.id);
    setAllCoupons((prev) => prev.filter((c) => c.id !== target.id));
    setSelectedIds((prev) => prev.filter((x) => x !== target.id));
    toast({ title: "Deleted", description: `Coupon "${target.code}" deleted.` });
  } catch (e) {
    toast({ title: "Error", description: apiError(e, "Failed to delete coupon."), variant: "destructive" });
  } finally {
    setDeleteTarget(null);
  }
};

const startEdit = (coupon: Coupon) => {
  setForm({
    code: coupon.code,
    description: coupon.description ?? "",
    discountType: coupon.discountType,
    discountValue: String(coupon.discountValue),
    applicableTo: coupon.applicableTo,
    courseIds: coupon.courseIds ?? [],
    minPurchase: coupon.minPurchase != null ? String(coupon.minPurchase) : "0",
    maxDiscount: coupon.maxDiscount != null ? String(coupon.maxDiscount) : "",
    usageLimit: String(coupon.usageLimit),
    perUserLimit: String(coupon.perUserLimit ?? 1),
    validFrom: coupon.validFrom ?? "",
    expiryDate: coupon.expiryDate ?? "",
    isActive: coupon.isActive,
  });
  setEditingId(coupon.id);
  setMode("edit");
  setViewCoupon(null);
};

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied", description: `Coupon code "${code}" copied.` });
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleCourse = (id: string) =>
    setForm((f) => ({
      ...f,
      courseIds: f.courseIds.includes(id)
        ? f.courseIds.filter((x) => x !== id)
        : [...f.courseIds, id],
    }));

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  };

  const statCards = [
    { label: "Active Coupons", value: stats.active, icon: CheckCircle2, tone: "bg-emerald-500" },
    { label: "Total Revenue", value: `$${stats.revenue.toLocaleString()}`, icon: Clock, tone: "bg-blue-500" },
    { label: "Total Redeemed", value: stats.redeemed.toLocaleString(), icon: Bell, tone: "bg-gradient-to-br from-pink-500 to-fuchsia-500" },
    { label: "Avg Discount", value: `${stats.avgDiscount.toFixed(1)}%`, icon: EyeIcon, tone: "bg-gradient-to-br from-orange-500 to-amber-500" },
  ];

  // =====================================================
  //                CREATE / EDIT FORM VIEW
  // =====================================================
  if (mode === "create" || mode === "edit") {
    const isEdit = mode === "edit";
    return (
      <AdminLayout>
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => { setMode("list"); setEditingId(null); resetForm(); }}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Coupons
          </button>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight">{isEdit ? "Edit Coupon" : "Create Coupon"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isEdit ? "Update this promotional coupon" : "Add a new promotional coupon"}
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <Label htmlFor="code">Coupon Code</Label>
                <Input
                  id="code"
                  placeholder="e.g., WELCOME20"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Short description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>Discount Type</Label>
                  <Select
                    value={form.discountType}
                    onValueChange={(v) => setForm({ ...form, discountType: v as DiscountType })}
                  >
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choose option..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="discountValue">Discount Value</Label>
                  <Input
                    id="discountValue"
                    type="number"
                    placeholder="20"
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label>Applicable To</Label>
                <RadioGroup
                  value={form.applicableTo}
                  onValueChange={(v) => setForm({ ...form, applicableTo: v as ApplicableTo })}
                  className="mt-2 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="font-normal">All Courses</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="specific" id="specific" />
                    <Label htmlFor="specific" className="font-normal">Specific Course</Label>
                  </div>
                </RadioGroup>
              </div>

              {form.applicableTo === "specific" && (
                <div className="border-t pt-4">
                  <Label>Select Courses</Label>
                  <div className="mt-2 space-y-2">
                    {courses.map((course) => (
                      <label key={course.id} className="flex cursor-pointer items-center gap-2">
                        <Checkbox
                          checked={form.courseIds.includes(course.id)}
                          onCheckedChange={() => toggleCourse(course.id)}
                        />
                        <span className="text-sm">{course.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="minPurchase">Minimum Purchase ($)</Label>
                  <Input
                    id="minPurchase"
                    type="number"
                    placeholder="0"
                    value={form.minPurchase}
                    onChange={(e) => setForm({ ...form, minPurchase: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="maxDiscount">Max Discount ($)</Label>
                  <Input
                    id="maxDiscount"
                    type="number"
                    placeholder="100"
                    value={form.maxDiscount}
                    onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>

            <div>
  <Label htmlFor="perUserLimit">Per User Limit</Label>
  <Input
    id="perUserLimit"
    type="number"
    min={1}
    placeholder="1"
    value={form.perUserLimit}
    onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })}
    className="mt-1.5"
  />
</div>


              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="validFrom">Valid From</Label>
                  <Input
                    id="validFrom"
                    type="date"
                    value={form.validFrom}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="expiryDate">Valid Until</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => { setMode("list"); setEditingId(null); resetForm(); }}
                className="sm:w-32"
              >
                Cancel
              </Button>
              <Button
                onClick={isEdit ? handleUpdate : handleCreate}
                disabled={submitting}
                className="bg-blue-600 text-white hover:bg-blue-700 sm:min-w-40"
              >
                <Pencil className="mr-1 h-4 w-4" />
                {submitting ? "Saving..." : isEdit ? "Update Coupon" : "Create Coupon"}
              </Button>
            </div>
          </motion.div>
        </div>
      </AdminLayout>
    );
  }

  // =====================================================
  //                       LIST VIEW
  // =====================================================
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Coupons</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create and manage promotional coupons for courses
            </p>
          </div>
          <Button
            onClick={() => { resetForm(); setEditingId(null); setMode("create"); }}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="mr-1 h-4 w-4" /> Create Coupon
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight">{s.value}</p>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${s.tone}`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Search / Filter */}
        <div className="rounded-xl border bg-blue-50/60 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-sm font-medium">Search Coupons..</Label>
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search coupon codes..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="bg-white pl-9"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }}
              >
                <SelectTrigger className="mt-1.5 bg-white">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredCoupons.length}</span> of{" "}
            <span className="font-semibold text-foreground">{allCoupons.length}</span> coupons
          </p>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading coupons…</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Validity Until</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedCoupons.map((coupon) => {
                      const pct = Math.min(100, Math.round((coupon.usedCount / Math.max(1, coupon.usageLimit)) * 100));
                      return (
                        <TableRow key={coupon.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(coupon.id)}
                              onCheckedChange={() => toggleSelect(coupon.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                              {coupon.code}
                              <button
                                type="button"
                                onClick={() => copyCode(coupon.code)}
                                className="text-muted-foreground hover:text-foreground"
                                aria-label="Copy code"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {coupon.discountType === "percentage"
                                ? `${coupon.discountValue}%`
                                : `$${coupon.discountValue}`}
                            </div>
                            {coupon.maxDiscount != null && (
                              <div className="text-xs text-muted-foreground">Max: $ {coupon.maxDiscount}</div>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">$ {(coupon.revenue ?? 0).toLocaleString()}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{formatDate(coupon.expiryDate)}</TableCell>
                          <TableCell>
                            <div className="min-w-[110px]">
                              <div className="text-sm">{coupon.usedCount} / {coupon.usageLimit}</div>
                              <Progress value={pct} className="mt-1 h-1.5" />
                            </div>
                          </TableCell>
                          <TableCell>
                            {coupon.isActive ? (
                              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50" variant="outline">
                                Active
                              </Badge>
                            ) : (
                              <Badge className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50" variant="outline">
                                Expired
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setViewCoupon(coupon)} aria-label="View">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => startEdit(coupon)} aria-label="Edit">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(coupon)} aria-label="Delete">
                                <Trash2 className="h-4 w-4 text-rose-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {filteredCoupons.length === 0 && (
                <div className="p-10 text-center text-sm text-muted-foreground">No coupons found.</div>
              )}

              {/* Pagination */}
              <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{pagedCoupons.length}</span> of{" "}
                  <span className="font-semibold text-foreground">{filteredCoupons.length}</span> coupons
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant={currentPage === i + 1 ? "default" : "outline"}
                      className={currentPage === i + 1 ? "bg-blue-600 text-white hover:bg-blue-700" : ""}
                      onClick={() => setPage(i + 1)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* View Coupon Dialog */}
      <Dialog open={!!viewCoupon} onOpenChange={(open) => !open && setViewCoupon(null)}>
        <DialogContent className="max-w-lg">
          {viewCoupon && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">{viewCoupon.code}</DialogTitle>
                <DialogDescription>
                  Created on {formatDate(viewCoupon.createdAt)} by {viewCoupon.createdBy ?? "Admin"}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Discount</p>
                  <p className="mt-1 font-semibold">
                    {viewCoupon.discountType === "percentage"
                      ? `${viewCoupon.discountValue}%`
                      : `$${viewCoupon.discountValue}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Applicable To</p>
                  <p className="mt-1 font-semibold">
                    {viewCoupon.applicableTo === "all" ? "All Courses" : "Specific Courses"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Minimum Purchase</p>
                  <p className="mt-1 font-semibold">$ {viewCoupon.minPurchase ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Max Discount</p>
                  <p className="mt-1 font-semibold">$ {viewCoupon.maxDiscount ?? 0}</p>
                </div>
              </div>

              <div className="mt-2">
                <p className="font-semibold">Performance</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-xs text-muted-foreground">Redeemed</p>
                    <p className="mt-1 text-lg font-bold">{viewCoupon.usedCount}</p>
                    <p className="text-xs text-muted-foreground">of {viewCoupon.usageLimit} limit</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-xs text-muted-foreground">Revenue Generated</p>
                    <p className="mt-1 text-lg font-bold text-blue-600">$ {(viewCoupon.revenue ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-xs text-muted-foreground">Valid Until</p>
                    <p className="mt-1 text-lg font-bold">{formatDate(viewCoupon.expiryDate)}</p>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setViewCoupon(null)} className="sm:min-w-32">
                  Close
                </Button>
                <Button
                  onClick={() => startEdit(viewCoupon)}
                  className="bg-blue-600 text-white hover:bg-blue-700 sm:min-w-32"
                >
                  <Pencil className="mr-1 h-4 w-4" /> Edit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Coupon</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete coupon "{deleteTarget?.code}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
