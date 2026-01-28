'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
}

interface Session {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  topic?: string;
  class: {
    id: string;
    name: string;
    code: string;
  };
}

interface StudentWithAttendance {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  attendance?: {
    status: AttendanceStatus;
    notes?: string;
  } | null;
}

interface UseAttendanceReturn {
  loading: boolean;
  error: string | null;
  markAttendance: (sessionId: string, studentId: string, status: AttendanceStatus, notes?: string) => Promise<void>;
  markBulkAttendance: (sessionId: string, attendances: AttendanceRecord[]) => Promise<void>;
  quickAttendance: (classId: string, attendances: AttendanceRecord[], topic?: string) => Promise<{ session: Session }>;
  getSession: (sessionId: string) => Promise<{ session: Session; students: StudentWithAttendance[] }>;
  getSessions: (classId: string, date?: string) => Promise<Session[]>;
  createSession: (data: { classId: string; date: string; startTime: string; endTime: string; topic?: string }) => Promise<Session>;
}

export function useAttendance(): UseAttendanceReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withLoading = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const markAttendance = useCallback(async (
    sessionId: string,
    studentId: string,
    status: AttendanceStatus,
    notes?: string
  ) => {
    await withLoading(() => api.markAttendance(sessionId, studentId, status, notes));
  }, [withLoading]);

  const markBulkAttendance = useCallback(async (
    sessionId: string,
    attendances: AttendanceRecord[]
  ) => {
    await withLoading(() => api.markBulkAttendance(sessionId, attendances));
  }, [withLoading]);

  const quickAttendance = useCallback(async (
    classId: string,
    attendances: AttendanceRecord[],
    topic?: string
  ) => {
    return withLoading(() => api.quickAttendance(classId, attendances, topic));
  }, [withLoading]);

  const getSession = useCallback(async (sessionId: string) => {
    return withLoading(() => api.getSession(sessionId));
  }, [withLoading]);

  const getSessions = useCallback(async (classId: string, date?: string) => {
    const result = await withLoading(() => api.getSessions(classId, date));
    return result.sessions;
  }, [withLoading]);

  const createSession = useCallback(async (data: {
    classId: string;
    date: string;
    startTime: string;
    endTime: string;
    topic?: string;
  }) => {
    const result = await withLoading(() => api.createSession(data));
    return result.session;
  }, [withLoading]);

  return {
    loading,
    error,
    markAttendance,
    markBulkAttendance,
    quickAttendance,
    getSession,
    getSessions,
    createSession,
  };
}
