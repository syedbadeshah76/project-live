// ============= Certificates Service =============
import { apiClient } from '@/lib/api-client';
import type { ApiResponse, PaginationMeta } from '@/lib/api-client';
import type { Certificate, PaginationParams, VerifyCertificateResponse } from '@/types/api.types';

const LS_UNLOCKED_CERTS = "edvanz.unlocked_certificates";

export function getLocalUnlockedCertificates(): Certificate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_UNLOCKED_CERTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalUnlockedCertificate(cert: Certificate) {
  if (typeof window === "undefined") return;
  try {
    const list = getLocalUnlockedCertificates();
    const existingIdx = list.findIndex(
      (c) => String(c.courseId) === String(cert.courseId) || c.id === cert.id
    );
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...cert };
    } else {
      list.unshift(cert);
    }
    localStorage.setItem(LS_UNLOCKED_CERTS, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

const mockCertificates: Certificate[] = [
  {
    id: 'cert-1', userId: '1', courseId: '1',
    course: { id: '1', title: 'Complete React Developer Course 2024', thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=200&h=120&fit=crop' },
    instructor: { id: 'sarah-johnson', name: 'Sarah Johnson' },
    issueDate: '2024-01-20', certificateNumber: 'CERT-2024-001234',
    downloadUrl: '/certificates/CERT-2024-001234.pdf', verificationUrl: 'https://Edvanz.com/verify/CERT-2024-001234',
    status: 'completed' as const,
  },
  {
    id: 'cert-2', userId: '1', courseId: '2',
    course: { id: '2', title: 'Python for Data Science & Machine Learning', thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&h=120&fit=crop' },
    instructor: { id: 'michael-chen', name: 'Michael Chen' },
    issueDate: '2024-01-15', certificateNumber: 'CERT-2024-001189',
    downloadUrl: '/certificates/CERT-2024-001189.pdf', verificationUrl: 'https://Edvanz.com/verify/CERT-2024-001189',
    status: 'completed' as const,
  },
  {
    id: 'cert-3', userId: '1', courseId: '3',
    course: { id: '3', title: 'AWS Cloud Practitioner Certification Prep', thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&h=120&fit=crop' },
    instructor: { id: 'david-kumar', name: 'David Kumar' },
    issueDate: '2024-02-10', certificateNumber: 'CERT-2024-001567',
    downloadUrl: '/certificates/CERT-2024-001567.pdf', verificationUrl: 'https://Edvanz.com/verify/CERT-2024-001567',
    status: 'completed' as const,
  },
];

export const certificatesService = {
  async getMyCertificates(_pagination?: PaginationParams): Promise<ApiResponse<Certificate[]> & { meta: PaginationMeta }> {
    const localCerts = getLocalUnlockedCertificates();

    return {
      success: true,
      data: localCerts,
      meta: {
        currentPage: 1,
        totalPages: 1,
        totalItems: localCerts.length,
        itemsPerPage: 50,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  async getCertificate(certificateId: string): Promise<ApiResponse<Certificate>> {
    const localCerts = getLocalUnlockedCertificates();
    const match = localCerts.find((c) => c.id === certificateId || String(c.courseId) === String(certificateId));
    if (match) {
      return { success: true, data: match };
    }

    const mockMatch = mockCertificates.find((c) => c.id === certificateId || String(c.courseId) === String(certificateId));
    if (mockMatch) {
      return { success: true, data: mockMatch };
    }

    throw { success: false, message: 'Certificate not found', statusCode: 404 };
  },

  async verifyCertificate(certificateNumber: string): Promise<ApiResponse<VerifyCertificateResponse>> {
    const cleanNum = certificateNumber.trim();
    const localCerts = getLocalUnlockedCertificates();
    const localMatch = localCerts.find(
      (c) => c.certificateNumber?.toLowerCase() === cleanNum.toLowerCase()
    );

    if (localMatch) {
      return {
        success: true,
        data: {
          valid: true,
          studentName: "Student",
          courseTitle: localMatch.course?.title || (localMatch as any).courseTitle || "Course",
          completedDate: localMatch.completedDate || localMatch.issueDate,
          certificate: localMatch,
        },
      };
    }

    const cert = mockCertificates.find(
      (c) => c.certificateNumber.toLowerCase() === cleanNum.toLowerCase()
    );

    if (cert || cleanNum === "CERT-2026-0012323") {
      const targetCert = cert ?? {
        id: "cert-demo",
        userId: "1",
        courseId: "python-101",
        course: { id: "python-101", title: "100 Days of Code: The Complete Python Pro Bootcamp", category: "Programming" },
        instructor: { id: "angela-yu", name: "Dr. Angela Yu" },
        issueDate: "2025-03-12",
        completedDate: "2025-03-12",
        certificateNumber: "CERT-2026-0012323",
        downloadUrl: "/certificates/CERT-2026-0012323.pdf",
        verificationUrl: "https://Edvanz.com/verify/CERT-2026-0012323",
        status: "completed" as const,
      };
      return {
        success: true,
        data: {
          valid: true,
          studentName: "John Doe",
          courseTitle: targetCert.course.title,
          completedDate: targetCert.completedDate || targetCert.issueDate,
          certificate: targetCert,
        },
      };
    }

    return {
      success: true,
      data: {
        valid: false,
        message: "Certificate not found",
      },
    };
  },

  async downloadCertificate(certificateId: string): Promise<Blob> {
    return new Blob([], { type: "application/pdf" });
  },

  async shareCertificate(certificateId: string, platform: 'linkedin' | 'twitter' | 'email'): Promise<ApiResponse<{ shareUrl: string }>> {
    const cert = (await this.getCertificate(certificateId).catch(() => null))?.data;
    let shareUrl = '';
    if (platform === 'linkedin') shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${cert?.verificationUrl || window.location.href}`;
    else if (platform === 'twitter') shareUrl = `https://twitter.com/intent/tweet?text=I earned a certificate!&url=${cert?.verificationUrl || window.location.href}`;
    else shareUrl = `mailto:?subject=Check out my certificate&body=${cert?.verificationUrl || window.location.href}`;
    return { success: true, data: { shareUrl } };
  },

  async requestCertificate(
    courseId: string,
    meta?: { courseTitle?: string; studentName?: string; thumbnail?: string; instructorName?: string }
  ): Promise<ApiResponse<Certificate>> {
    const localList = getLocalUnlockedCertificates();
    const existing = localList.find((c) => String(c.courseId) === String(courseId));
    if (existing) {
      if (meta?.courseTitle && (existing.course?.title === 'Course Completion Assessment' || !existing.course?.title || existing.course?.title === 'Course')) {
        existing.course = { ...existing.course, id: courseId, title: meta.courseTitle, thumbnail: existing.course?.thumbnail || '' };
        (existing as any).courseTitle = meta.courseTitle;
        saveLocalUnlockedCertificate(existing);
      }
      return { success: true, data: existing };
    }

    const year = new Date().getFullYear();
    const randDigits = Math.floor(100000 + Math.random() * 900000);
    const certNum = `EDV-${year}-${randDigits}`;
    const nowIso = new Date().toISOString();

    const newCert: Certificate = {
      id: `cert-${courseId}-${Date.now()}`,
      userId: '1',
      courseId,
      course: {
        id: courseId,
        title: meta?.courseTitle || 'Course',
        thumbnail: meta?.thumbnail || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=240&fit=crop',
      },
      instructor: { id: 'instructor', name: meta?.instructorName || 'Edvanz Certified Instructor' },
      issueDate: nowIso,
      completedDate: nowIso,
      certificateNumber: certNum,
      downloadUrl: `/certificates/${certNum}.pdf`,
      verificationUrl: `https://Edvanz.com/verify/${certNum}`,
      status: 'completed' as const,
    };

    saveLocalUnlockedCertificate(newCert);

    return { success: true, data: newCert };
  },
};
