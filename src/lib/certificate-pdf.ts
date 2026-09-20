// ============= Certificate PDF & Image Exporter =============
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import type { Certificate } from "@/types/api.types";

/**
 * Downloads a high-resolution PDF directly from a rendered Certificate DOM element.
 */
export async function downloadCertificateFromElement(
  element: HTMLElement,
  fileName = "certificate.pdf"
): Promise<boolean> {
  try {
    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: "#ffffff",
    });

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
    pdf.save(fileName);
    return true;
  } catch (err) {
    console.error("Failed to generate certificate PDF from element:", err);
    return false;
  }
}

/**
 * Downloads a high-resolution PNG image directly from a rendered Certificate DOM element.
 */
export async function downloadCertificateImageFromElement(
  element: HTMLElement,
  fileName = "certificate.png"
): Promise<boolean> {
  try {
    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: "#ffffff",
    });

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (err) {
    console.error("Failed to generate certificate image:", err);
    return false;
  }
}

/**
 * Capture and download certificate using element ID.
 */
export async function captureAndDownloadCertificatePDF(
  elementId: string,
  fileName: string = "Certificate.pdf"
): Promise<boolean> {
  const node = document.getElementById(elementId);
  if (!node) return false;
  return downloadCertificateFromElement(node, fileName);
}
