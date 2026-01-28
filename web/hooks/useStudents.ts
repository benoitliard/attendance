'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  email?: string;
  phone?: string;
  class: {
    id: string;
    name: string;
    code: string;
  };
}

interface UseStudentsOptions {
  classId?: string;
  search?: string;
  autoFetch?: boolean;
}

interface UseStudentsReturn {
  students: Student[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createStudent: (data: Partial<Student> & { classId: string }) => Promise<Student>;
  updateStudent: (id: string, data: Partial<Student>) => Promise<Student>;
  deleteStudent: (id: string) => Promise<void>;
}

export function useStudents(options: UseStudentsOptions = {}): UseStudentsReturn {
  const { classId, search, autoFetch = true } = options;
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { students } = await api.getStudents(classId, search);
      setStudents(students);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  }, [classId, search]);

  useEffect(() => {
    if (autoFetch) {
      fetchStudents();
    }
  }, [autoFetch, fetchStudents]);

  const createStudent = async (data: Partial<Student> & { classId: string }) => {
    const { student } = await api.createStudent(data);
    setStudents(prev => [...prev, student]);
    return student;
  };

  const updateStudent = async (id: string, data: Partial<Student>) => {
    const { student } = await api.updateStudent(id, data);
    setStudents(prev => prev.map(s => s.id === id ? student : s));
    return student;
  };

  const deleteStudent = async (id: string) => {
    await api.deleteStudent(id);
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  return {
    students,
    loading,
    error,
    refetch: fetchStudents,
    createStudent,
    updateStudent,
    deleteStudent,
  };
}
