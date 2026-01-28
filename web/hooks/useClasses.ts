'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface Class {
  id: string;
  name: string;
  code: string;
  teacher: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    students: number;
    sessions: number;
  };
}

interface UseClassesReturn {
  classes: Class[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createClass: (name: string, code: string) => Promise<Class>;
  updateClass: (id: string, data: { name?: string; code?: string }) => Promise<Class>;
  deleteClass: (id: string) => Promise<void>;
}

export function useClasses(): UseClassesReturn {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { classes } = await api.getClasses();
      setClasses(classes);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const createClass = async (name: string, code: string) => {
    const { class: newClass } = await api.createClass(name, code);
    setClasses(prev => [...prev, newClass]);
    return newClass;
  };

  const updateClass = async (id: string, data: { name?: string; code?: string }) => {
    const { class: updated } = await api.updateClass(id, data);
    setClasses(prev => prev.map(c => c.id === id ? updated : c));
    return updated;
  };

  const deleteClass = async (id: string) => {
    await api.deleteClass(id);
    setClasses(prev => prev.filter(c => c.id !== id));
  };

  return {
    classes,
    loading,
    error,
    refetch: fetchClasses,
    createClass,
    updateClass,
    deleteClass,
  };
}
