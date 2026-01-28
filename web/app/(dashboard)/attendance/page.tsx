'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassSelect } from '@/components/ui/GlassSelect';
import { GlassInput } from '@/components/ui/GlassInput';
import { AttendanceGrid } from '@/components/AttendanceGrid';
import { ClipboardCheck, Save, Calendar, Plus } from 'lucide-react';
import { format } from 'date-fns';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export default function AttendancePage() {
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get('classId') || '';

  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState(initialClassId);
  const [students, setStudents] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [pendingAttendance, setPendingAttendance] = useState<Record<string, { status: AttendanceStatus; notes?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [topic, setTopic] = useState('');

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadClassStudents();
    }
  }, [selectedClass]);

  async function loadClasses() {
    try {
      const { classes } = await api.getClasses();
      setClasses(classes);
      if (classes.length > 0 && !selectedClass) {
        setSelectedClass(classes[0].id);
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadClassStudents() {
    try {
      const { students } = await api.getStudents(selectedClass);
      setStudents(students);
      // Initialize all as PRESENT by default
      const initial: Record<string, { status: AttendanceStatus }> = {};
      students.forEach((s: any) => {
        initial[s.id] = { status: 'PRESENT' };
      });
      setPendingAttendance(initial);
    } catch (error) {
      console.error('Failed to load students:', error);
    }
  }

  function handleStatusChange(studentId: string, status: AttendanceStatus, notes?: string) {
    setPendingAttendance((prev) => ({
      ...prev,
      [studentId]: { status, notes },
    }));
  }

  async function handleSave() {
    if (!selectedClass || Object.keys(pendingAttendance).length === 0) return;

    setSaving(true);
    try {
      const attendances = Object.entries(pendingAttendance).map(([studentId, data]) => ({
        studentId,
        status: data.status,
        notes: data.notes,
      }));

      const result = await api.quickAttendance(selectedClass, attendances, topic || undefined);
      setSession(result.session);
      alert('Présences enregistrées !');
    } catch (error: any) {
      alert(error.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  }

  function markAllAs(status: AttendanceStatus) {
    const updated: Record<string, { status: AttendanceStatus }> = {};
    students.forEach((s: any) => {
      updated[s.id] = { status };
    });
    setPendingAttendance(updated);
  }

  const selectedClassName = classes.find((c) => c.id === selectedClass)?.name || '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Prise de présences</h1>
          <p className="text-slate-500 mt-1">
            {format(new Date(), 'EEEE d MMMM yyyy')}
          </p>
        </div>
      </div>

      {/* Controls */}
      <GlassCard>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <GlassSelect
              label="Classe"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              options={[
                { value: '', label: 'Sélectionner une classe' },
                ...classes.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` })),
              ]}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <GlassInput
              label="Sujet (optionnel)"
              placeholder="ex: Chapitre 3 - Les boucles"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <GlassButton size="sm" onClick={() => markAllAs('PRESENT')}>
              Tous présents
            </GlassButton>
            <GlassButton size="sm" onClick={() => markAllAs('ABSENT')}>
              Tous absents
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* Attendance Grid */}
      {!selectedClass ? (
        <GlassCard className="text-center py-12">
          <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Sélectionnez une classe pour commencer</p>
        </GlassCard>
      ) : students.length === 0 ? (
        <GlassCard className="text-center py-12">
          <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Aucun étudiant dans cette classe</p>
        </GlassCard>
      ) : (
        <>
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">{selectedClassName}</h2>
              <span className="text-sm text-slate-500">{students.length} étudiants</span>
            </div>
            <AttendanceGrid
              students={students.map((s) => ({
                ...s,
                attendance: pendingAttendance[s.id] ? { status: pendingAttendance[s.id].status } : null,
              }))}
              onStatusChange={handleStatusChange}
            />
          </GlassCard>

          {/* Save Button */}
          <div className="flex justify-end">
            <GlassButton
              variant="primary"
              size="lg"
              onClick={handleSave}
              loading={saving}
              disabled={Object.keys(pendingAttendance).length === 0}
            >
              <Save className="w-5 h-5" />
              Enregistrer les présences
            </GlassButton>
          </div>

          {/* Summary */}
          <GlassCard>
            <h3 className="font-semibold text-slate-800 mb-4">Résumé</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-emerald-50 rounded-xl text-center">
                <p className="text-3xl font-bold text-emerald-600">
                  {Object.values(pendingAttendance).filter((a) => a.status === 'PRESENT').length}
                </p>
                <p className="text-sm text-emerald-700">Présents</p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl text-center">
                <p className="text-3xl font-bold text-red-600">
                  {Object.values(pendingAttendance).filter((a) => a.status === 'ABSENT').length}
                </p>
                <p className="text-sm text-red-700">Absents</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl text-center">
                <p className="text-3xl font-bold text-amber-600">
                  {Object.values(pendingAttendance).filter((a) => a.status === 'LATE').length}
                </p>
                <p className="text-sm text-amber-700">Retards</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {Object.values(pendingAttendance).filter((a) => a.status === 'EXCUSED').length}
                </p>
                <p className="text-sm text-blue-700">Excusés</p>
              </div>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
