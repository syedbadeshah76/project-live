// src/services/notes.service.ts
// ============= Student Notes Service (backend-integrated) =============
// Backend contract (Spring Boot gateway) — from Postman:
//   POST   /api/student_notes                                    { courseId, moduleId?, lessonId?, title, noteContent }
//   GET    /api/student_notes/{noteId}
//   PUT    /api/student_notes/{noteId}                           { title, noteContent }
//   GET    /api/student_notes/course/{courseId}
//   GET    /api/student_notes/course/{courseId}/module/{moduleId}
//   GET    /api/student_notes/course/{courseId}/lesson/{lessonId}
//   DELETE /api/student_notes/{noteId}
//
// NOTE: the backend has no `timestamp` column. The player shows a video
// timestamp badge, so we encode it into the note title as a "[t:<seconds>] "
// prefix and strip/parse it on read. Titles created outside the app simply
// come back with timestamp = 0.

import { apiClient } from '@/lib/api-client';
import type { ApiResponse, Note } from '@/types/api.types';

const BASE = '/student_notes';

/* ---------- Backend DTOs ---------- */

export interface StudentNoteDTO {
  id?: string;
  noteId?: string;
  tenantId?: string;
  userId?: string;
  studentId?: string;
  courseId?: string;
  moduleId?: string | null;
  lessonId?: string | null;
  title?: string;
  noteContent?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
  [k: string]: any;
}

export interface CreateNoteRequest {
  courseId: string;
  moduleId?: string;
  lessonId?: string;
  title: string;
  noteContent: string;
}

export interface UpdateNoteRequest {
  title?: string;
  noteContent?: string;
}

/* ---------- Helpers ---------- */

/** Unwrap `{ data: ... }` / `{ success, data }` envelopes, or return raw. */
function unwrap<T>(raw: any): T {
  if (raw && typeof raw === 'object' && 'data' in raw && (raw as any).data !== undefined) {
    return (raw as any).data as T;
  }
  return raw as T;
}

/** Accept arrays, Spring `Page` objects, or single objects. */
function toArray<T>(raw: any): T[] {
  const data = unwrap<any>(raw);
  if (Array.isArray(data)) return data as T[];
  if (data && Array.isArray(data.content)) return data.content as T[];
  if (data && Array.isArray(data.items)) return data.items as T[];
  return [];
}

/** Spring often sends LocalDateTime without a zone — make it valid ISO. */
function safeIsoDate(value?: string | null): string {
  if (!value) return new Date().toISOString();
  const normalized = /Z|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

const TS_PREFIX = /^\[t:(\d+)\]\s*/;

export function encodeNoteTitle(title: string, timestamp?: number): string {
  const seconds = Math.max(0, Math.floor(timestamp ?? 0));
  const clean = (title || 'Note').replace(TS_PREFIX, '').trim() || 'Note';
  return seconds > 0 ? `[t:${seconds}] ${clean}` : clean;
}

export function decodeNoteTitle(title?: string): { title: string; timestamp: number } {
  const raw = title ?? '';
  const match = raw.match(TS_PREFIX);
  return {
    title: raw.replace(TS_PREFIX, '').trim(),
    timestamp: match ? Number(match[1]) : 0,
  };
}

/** Map a backend note DTO to the frontend `Note` shape used by the player. */
export function normalizeNote(dto: StudentNoteDTO): Note {
  const { title, timestamp } = decodeNoteTitle(dto.title);
  return {
    id: String(dto.id ?? dto.noteId ?? ''),
    userId: String(dto.userId ?? dto.studentId ?? ''),
    courseId: dto.courseId ? String(dto.courseId) : '',
    moduleId: dto.moduleId ? String(dto.moduleId) : undefined,
    lessonId: dto.lessonId ? String(dto.lessonId) : '',
    title,
    content: dto.noteContent ?? dto.content ?? '',
    timestamp,
    createdAt: safeIsoDate(dto.createdAt),
    updatedAt: safeIsoDate(dto.updatedAt ?? dto.createdAt),
  } as unknown as Note;
}

const sortNotes = (notes: Note[]): Note[] =>
  [...notes].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

/* ---------- Service ---------- */

export const notesService = {
  /** POST /api/student_notes */
  async create(payload: {
    courseId: string;
    moduleId?: string;
    lessonId?: string;
    title: string;
    content: string;
    timestamp?: number;
  }): Promise<ApiResponse<Note>> {
    const body: CreateNoteRequest = {
      courseId: payload.courseId,
      title: encodeNoteTitle(payload.title, payload.timestamp),
      noteContent: payload.content,
    };
    if (payload.moduleId) body.moduleId = payload.moduleId;
    if (payload.lessonId) body.lessonId = payload.lessonId;

    const res = await apiClient.post<StudentNoteDTO | ApiResponse<StudentNoteDTO>>(BASE, body);
    return { success: true, data: normalizeNote(unwrap<StudentNoteDTO>(res) ?? {}) };
  },

  /** GET /api/student_notes/{noteId} */
  async getById(noteId: string): Promise<ApiResponse<Note>> {
    const res = await apiClient.get<StudentNoteDTO | ApiResponse<StudentNoteDTO>>(
      `${BASE}/${noteId}`,
    );
    return { success: true, data: normalizeNote(unwrap<StudentNoteDTO>(res) ?? {}) };
  },

  /** PUT /api/student_notes/{noteId} */
  async update(
    noteId: string,
    payload: { title?: string; content?: string; timestamp?: number },
  ): Promise<ApiResponse<Note>> {
    const body: UpdateNoteRequest = {};
    if (payload.title !== undefined || payload.timestamp !== undefined) {
      body.title = encodeNoteTitle(payload.title ?? 'Note', payload.timestamp);
    }
    if (payload.content !== undefined) body.noteContent = payload.content;

    const res = await apiClient.put<StudentNoteDTO | ApiResponse<StudentNoteDTO>>(
      `${BASE}/${noteId}`,
      body,
    );
    return { success: true, data: normalizeNote(unwrap<StudentNoteDTO>(res) ?? {}) };
  },

  /** GET /api/student_notes/course/{courseId} */
  async listByCourse(courseId: string): Promise<ApiResponse<Note[]>> {
    const res = await apiClient.get<StudentNoteDTO[]>(`${BASE}/course/${courseId}`);
    return { success: true, data: sortNotes(toArray<StudentNoteDTO>(res).map(normalizeNote)) };
  },

  /** GET /api/student_notes/course/{courseId}/module/{moduleId} */
  async listByModule(courseId: string, moduleId: string): Promise<ApiResponse<Note[]>> {
    const res = await apiClient.get<StudentNoteDTO[]>(
      `${BASE}/course/${courseId}/module/${moduleId}`,
    );
    return { success: true, data: sortNotes(toArray<StudentNoteDTO>(res).map(normalizeNote)) };
  },

  /** GET /api/student_notes/course/{courseId}/lesson/{lessonId} */
  async listByLesson(courseId: string, lessonId: string): Promise<ApiResponse<Note[]>> {
    const res = await apiClient.get<StudentNoteDTO[]>(
      `${BASE}/course/${courseId}/lesson/${lessonId}`,
    );
    return { success: true, data: sortNotes(toArray<StudentNoteDTO>(res).map(normalizeNote)) };
  },

  /** DELETE /api/student_notes/{noteId} */
  async remove(noteId: string): Promise<ApiResponse<{ message: string }>> {
    await apiClient.delete(`${BASE}/${noteId}`);
    return { success: true, data: { message: 'Note deleted' } };
  },
};

export default notesService;
