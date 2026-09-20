import jsPDF from "jspdf";

interface InvoiceCourse {
  id: string;
  title: string;
  price: number;
}

interface InvoiceData {
  orderId: string;
  orderNumber?: string;
  invoiceNumber: string;
  paymentId: string;
  paymentMethod?: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency?: string;
  courses: InvoiceCourse[];
  paidAt: string;
  customerName?: string;
  customerEmail?: string;
}

export function generateInvoicePDF(data: InvoiceData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const symbol = data.currency === "USD" ? "$" : "INR ";

  // Header
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 45, "F");
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(20, 45, pageWidth - 20, 45);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Edvanz", 20, 18);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("MODULE B5 6TH FLOOR, QUADRANT 1,", 20, 26);
  doc.text("CYBER TOWERS, HITECH CITY,", 20, 30);
  doc.text("HYDERABAD - 500081,", 20, 34);
  doc.text("TELANGANA, INDIA", 20, 38);
  doc.text("GSTIN: 36AAHCH0936J1ZH", 20, 42);

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("TAX INVOICE", pageWidth - 20, 18, { align: "right" });

  let y = 55;

  // Billed To / Invoice Details
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Billed To", 20, y);
  doc.text("Invoice Details", pageWidth / 2 + 10, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  const billedName = data.customerName || "Student";
  const billedEmail = data.customerEmail || "";
  doc.text(billedName, 20, y);
  if (billedEmail) {
    doc.text(billedEmail, 20, y + 6);
  }

  const invoiceLeftX = pageWidth / 2 + 10;
  const detailStartY = y;
  doc.text("Invoice #:", invoiceLeftX, detailStartY);
  doc.text(data.invoiceNumber, invoiceLeftX + 25, detailStartY);
  doc.text("Order #:", invoiceLeftX, detailStartY + 6);
  doc.text(data.orderNumber ?? data.orderId, invoiceLeftX + 25, detailStartY + 6);
  doc.text("Date:", invoiceLeftX, detailStartY + 12);
  doc.text(new Date(data.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), invoiceLeftX + 25, detailStartY + 12);
  doc.text("Status:", invoiceLeftX, detailStartY + 18);
  doc.text(data.status, invoiceLeftX + 25, detailStartY + 18);

  y += billedEmail ? 20 : 14;
  y += 10;

  // Table header
  doc.setFillColor(245, 247, 250);
  doc.rect(20, y - 5, pageWidth - 40, 12, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("S.No", 25, y + 4);
  doc.text("Description", 40, y + 4);
  doc.text("Price", pageWidth - 25, y + 4, { align: "right" });
  y += 14;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  data.courses.forEach((course, index) => {
    const title = course.title.length > 60 ? `${course.title.slice(0, 57)}...` : course.title;
    doc.text(`${index + 1}`, 25, y);
    doc.text(title, 40, y);
    doc.text(`${symbol}${course.price.toFixed(2)}`, pageWidth - 25, y, { align: "right" });
    y += 8;
  });

  y += 6;
  doc.setDrawColor(220, 220, 220);
  doc.line(20, y, pageWidth - 20, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Subtotal", pageWidth - 70, y);
  doc.setTextColor(0, 0, 0);
  doc.text(`${symbol}${data.subtotal.toFixed(2)}`, pageWidth - 25, y, { align: "right" });
  y += 7;

  doc.setTextColor(100, 100, 100);
  doc.text("Tax", pageWidth - 70, y);
  doc.setTextColor(0, 0, 0);
  doc.text(`${symbol}${data.taxAmount.toFixed(2)}`, pageWidth - 25, y, { align: "right" });
  y += 7;

  doc.setDrawColor(200, 200, 200);
  doc.line(pageWidth - 90, y, pageWidth - 20, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Total", pageWidth - 70, y);
  doc.setTextColor(37, 99, 235);
  doc.text(`${symbol}${data.totalAmount.toFixed(2)}`, pageWidth - 25, y, { align: "right" });

  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Payment Information", 20, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Payment ID:", 20, y);
  doc.setTextColor(0, 0, 0);
  doc.text(data.paymentId, 55, y);
  y += 6;

  doc.setTextColor(100, 100, 100);
  doc.text("Method:", 20, y);
  doc.setTextColor(0, 0, 0);
  doc.text(data.paymentMethod || "N/A", 55, y);
  y += 6;

  doc.setTextColor(100, 100, 100);
  doc.text("Status:", 20, y);
  doc.setTextColor(0, 0, 0);
  doc.text(data.status, 55, y);
  y += 6;

  doc.setTextColor(100, 100, 100);
  doc.text("Paid on:", 20, y);
  doc.setTextColor(0, 0, 0);
  doc.text(new Date(data.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), 55, y);

  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(220, 220, 220);
  doc.line(20, footerY, pageWidth - 20, footerY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text("This is a computer-generated invoice and does not require a signature.", pageWidth / 2, footerY + 6, { align: "center" });
  doc.text("EDVANZ • support@edvanz.com • www.edvanz.com", pageWidth / 2, footerY + 11, { align: "center" });

  doc.save(`${data.invoiceNumber}.pdf`);
}
