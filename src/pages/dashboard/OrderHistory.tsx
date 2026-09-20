import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, ShoppingBag, Loader2, Gift } from "lucide-react";
import { motion } from "framer-motion";
import { generateInvoicePDF } from "@/lib/invoice-pdf";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { orderService, type Order, type OrderItem } from "@/services/order.service";

const DEFAULT_THUMBNAIL =
  "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=400&h=240&fit=crop";

/** Helper to extract actual course/product title from any raw backend item shape */
const resolveItemTitle = (item?: OrderItem | any): string => {
  if (!item) return "";
  if (typeof item === "string") return item;
  if (typeof item.course === "string") return item.course;
  if (typeof item.product === "string") return item.product;

  const candidate =
    item.courseName ??
    item.course_name ??
    item.courseTitle ??
    item.course_title ??
    item.title ??
    item.name ??
    item.productName ??
    item.product_name ??
    (typeof item.course === "object" ? item.course?.title || item.course?.name : undefined) ??
    (typeof item.product === "object" ? item.product?.title || item.product?.name : undefined);

  return typeof candidate === "string" ? candidate.trim() : "";
};

/** Helper to extract main course/product title from order level or items */
const resolveOrderTitle = (order?: Order | any): string => {
  if (!order) return "Course";

  const directTitle =
    order.courseTitle ??
    order.course_title ??
    order.courseName ??
    order.course_name ??
    order.title ??
    order.name ??
    order.productName ??
    order.product_name;

  if (typeof directTitle === "string" && directTitle.trim()) {
    return directTitle.trim();
  }

  const items = Array.isArray(order.items)
    ? order.items
    : Array.isArray(order.courses)
    ? order.courses
    : Array.isArray(order.orderItems)
    ? order.orderItems
    : [];

  for (const item of items) {
    const itemTitle = resolveItemTitle(item);
    if (itemTitle) return itemTitle;
  }

  return "Purchased Course";
};

const OrderHistory = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await orderService.listOrders();
        const data = Array.isArray(response) ? response : (response as any)?.data ?? [];
        setOrders(Array.isArray(data) ? data : []);
      } catch (error: any) {
        toast.error(error?.message || "Failed to load order history");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleDownloadInvoice = async (order: Order) => {
    setDownloadingId(order.id);
    try {
      // 1. Fetch full order details from GET /api/orders/{orderId} to get complete items payload
      let detailedOrder: any = order;
      try {
        const res: any = await orderService.getOrder(order.id);
        const detailData = res?.data ?? res;
        if (detailData && typeof detailData === "object") {
          detailedOrder = { ...order, ...detailData };
        }
      } catch {
        // Fall back to order in list
      }

      const items = Array.isArray(detailedOrder.items)
        ? detailedOrder.items
        : Array.isArray(detailedOrder.courses)
        ? detailedOrder.courses
        : Array.isArray(detailedOrder.orderItems)
        ? detailedOrder.orderItems
        : [];

      const fallbackTitle = resolveOrderTitle(detailedOrder);

      // 2. Map items with actual backend course title
      const invoiceCourses =
        items.length > 0
          ? items.map((item: any, idx: number) => ({
              id: String(item.courseId ?? item.productId ?? item.id ?? `item-${idx + 1}`),
              title: resolveItemTitle(item) || fallbackTitle,
              price: Number(item.price ?? item.discountedPrice ?? item.originalPrice ?? 0),
            }))
          : [
              {
                id: String(detailedOrder.id),
                title: fallbackTitle,
                price: Number(
                  detailedOrder.totalAmount ?? detailedOrder.amount ?? detailedOrder.subtotal ?? 0
                ),
              },
            ];

      generateInvoicePDF({
        orderId: String(detailedOrder.id),
        orderNumber: detailedOrder.orderNumber || detailedOrder.id,
        invoiceNumber: (detailedOrder.orderNumber || String(detailedOrder.id)).replace(/^ORD-/, "INV-"),
        paymentId: detailedOrder.paymentId || detailedOrder.id,
        paymentMethod: detailedOrder.paymentMethod || "Razorpay",
        status: detailedOrder.status || "COMPLETED",
        subtotal: Number(detailedOrder.subtotal ?? detailedOrder.totalAmount ?? detailedOrder.amount ?? 0),
        taxAmount: Number(detailedOrder.taxAmount ?? 0),
        totalAmount: Number(detailedOrder.totalAmount ?? detailedOrder.amount ?? detailedOrder.subtotal ?? 0),
        courses: invoiceCourses,
        paidAt: detailedOrder.purchaseDate || detailedOrder.createdAt || new Date().toISOString(),
        customerName: user?.name,
        customerEmail: user?.email,
      });

      toast.success("Invoice downloaded successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to download invoice");
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "20 May 2026";
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return dateStr;
    return parsed.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatAmount = (amount?: number, currency?: string) => {
    const val = amount ?? 0;
    const isUsd = currency === "USD";
    const symbol = isUsd ? "$" : "₹";
    const formattedVal = val.toFixed(2);
    return `${symbol}${formattedVal}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] py-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header Skeleton */}
          <div className="mb-6 space-y-1.5">
            <div className="h-8 w-48 bg-slate-200 rounded-md animate-pulse" />
            <div className="h-4 w-72 bg-slate-200 rounded-md animate-pulse" />
          </div>

          {/* Cards Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-3 animate-pulse"
              >
                <div className="flex flex-col sm:flex-row gap-3.5">
                  <div className="w-full sm:w-[130px] h-[92px] bg-slate-200 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-20 bg-slate-200 rounded" />
                    <div className="h-4 w-3/4 bg-slate-200 rounded" />
                    <div className="h-3.5 w-32 bg-slate-200 rounded" />
                    <div className="h-3.5 w-24 bg-slate-200 rounded" />
                  </div>
                  <div className="flex flex-col justify-between items-start sm:items-end gap-2 shrink-0">
                    <div className="h-5 w-14 bg-slate-200 rounded" />
                    <div className="h-8 w-20 bg-slate-200 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="mx-auto max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#2563EB] mb-4">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">No orders found</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            You haven’t purchased any courses yet.
          </p>
          <Button
            asChild
            className="mt-6 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg px-6 h-9 text-sm font-medium"
          >
            <Link to="/courses">Browse Courses</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB] py-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]">
            Order History
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            View, download, and manage your course purchase history
          </p>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {orders.map((order, index) => {
            const items = Array.isArray(order.items)
              ? order.items
              : Array.isArray(order.courses)
              ? order.courses
              : Array.isArray((order as any).orderItems)
              ? (order as any).orderItems
              : [];
            const firstItem = items[0];
            const title = resolveOrderTitle(order);
            const thumbnail =
              order.courseThumbnail ||
              order.thumbnail ||
              firstItem?.thumbnail ||
              DEFAULT_THUMBNAIL;
            const rawOrderNum = order.orderNumber
              ? order.orderNumber.replace(/^Order:\s*/i, "")
              : `order_mock_${order.id}`;
            const cleanOrderNum = rawOrderNum.startsWith("order_mock_")
              ? rawOrderNum
              : `order_mock_${rawOrderNum.replace(/^ORD-/, "")}`;
            
            const rawPayment = order.paymentMethod
              ? order.paymentMethod.replace(/^Payment:\s*/i, "")
              : "Razorpay";

            const displayAmount =
              order.amount ?? order.totalAmount ?? order.subtotal ?? 0;
            const isDownloading = downloadingId === order.id;

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: index * 0.03 }}
                className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs hover:shadow-md transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row gap-3.5 items-stretch sm:items-center justify-between">
                  {/* Left & Middle Container */}
                  <div className="flex flex-row items-center gap-3.5 min-w-0 flex-1">
                    {/* Thumbnail */}
                    <img
                      src={thumbnail}
                      alt={title}
                      className="w-[130px] h-[92px] rounded-xl object-cover shrink-0 bg-slate-100"
                    />

                    {/* Middle Info */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      {/* Date & Gift Badge */}
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs text-[#8E95A3] font-normal leading-none">
                          {formatDate(order.purchaseDate || order.createdAt)}
                        </p>
                        {(order.isGift || order.recipientName) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <Gift className="h-3 w-3" /> Gift
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm sm:text-[15px] font-bold text-[#2563EB] leading-tight line-clamp-2">
                        {title}
                      </h3>

                      {/* Recipient Details if Gift */}
                      {(order.recipientName || order.recipientEmail) && (
                        <p className="text-xs text-slate-700 pt-0.5 leading-snug">
                          <span className="font-semibold text-slate-900">Recipient:</span>{" "}
                          <span className="text-slate-600">
                            {order.recipientName || "Recipient"}
                            {order.recipientEmail ? ` (${order.recipientEmail})` : ""}
                          </span>
                        </p>
                      )}

                      {/* Order Number */}
                      <p className="text-xs text-slate-700 pt-0.5 leading-snug">
                        <span className="font-semibold text-slate-900">Order:</span>{" "}
                        <span className="text-slate-600">{cleanOrderNum}</span>
                      </p>

                      {/* Payment Method */}
                      <p className="text-xs text-slate-700 leading-snug">
                        <span className="font-semibold text-slate-900">Payment:</span>{" "}
                        <span className="text-slate-600">{rawPayment}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right Section (Price & Invoice Button) */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 self-stretch pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {/* Price */}
                    <p className="text-lg sm:text-xl font-bold text-[#2563EB] tracking-tight">
                      {formatAmount(displayAmount, order.currency)}
                    </p>

                    {/* Invoice Button */}
                    <Button
                      onClick={() => handleDownloadInvoice(order)}
                      disabled={isDownloading}
                      className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg px-3.5 h-8 text-xs font-semibold gap-1.5 shadow-xs shrink-0"
                    >
                      {isDownloading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          Invoice
                          <Download className="h-3.5 w-3.5 ml-0.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderHistory;
