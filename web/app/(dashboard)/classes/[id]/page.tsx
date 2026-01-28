'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassModal } from '@/components/ui/GlassModal';
import {
  ArrowLeft,
  BookOpen,
  Users,
  Calendar,
  Edit,
  Trash2,
  Plus,
  User,
  ClipboardCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [classData, setClassData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editData, setEditData] = useState({ name: '', code: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClass();
  }, [params.id]);

  async function loadClass() {
    try {
      const data = await api.getClass(params.id as string);
      setClassData(data);
      setEditData({ name: data.class.name, code: data.class.code });
    } catch (error) {
      console.error('Failed to load class:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateClass(params.id as string, editData);
      setShowEditModal(false);
      loadClass();
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await api.deleteClass(params.id as string);
      router.push('/classes');
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la suppression');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Chargement...</p>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Classe non trouvée</p>
      </div>
    );
  }

  const { class: cls, attendanceStats } = classData;
  const totalAttendance = attendanceStats.reduce((acc: number, s: any) => acc + s._count, 0);
  const presentCount = attendanceStats.find((s: any) => s.status === 'PRESENT')?._count || 0;
  const lateCount = attendanceStats.find((s: any) => s.status === 'LATE')?._count || 0;
  const attendanceRate = totalAttendance > 0
    ? Math.round(((presentCount + lateCount) / totalAttendance) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <GlassButton onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </GlassButton>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-800">{cls.name}</h1>
          <p className="text-primary-600 font-medium">{cls.code}</p>
        </div>
        <Link href={`/attendance?classId=${cls.id}`}>
          <GlassButton variant="primary">
            <ClipboardCheck className="w-5 h-5" />
            Prendre les présences
          </GlassButton>
        </Link>
        <GlassButton onClick={() => setShowEditModal(true)}>
          <Edit className="w-5 h-5" />
        </GlassButton>
        <GlassButton variant="danger" onClick={() => setShowDeleteModal(true)}>
          <Trash2 className="w-5 h-5" />
        </GlassButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{cls.students.length}</p>
              <p className="text-sm text-slate-500">Étudiants</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{cls.sessions.length}</p>
              <p className="text-sm text-slate-500">Sessions</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{attendanceRate}%</p>
              <p className="text-sm text-slate-500">Taux présence</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800 truncate">{cls.teacher.name}</p>
              <p className="text-sm text-slate-500">Professeur</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Students List */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">Étudiants</h2>
          <Link href={`/students?classId=${cls.id}`}>
            <GlassButton size="sm">
              <Plus className="w-4 h-4" />
              Ajouter
            </GlassButton>
          </Link>
        </div>
        {cls.students.length > 0 ? (
          <div className="space-y-2">
            {cls.students.map((student: any) => (
              <Link key={student.id} href={`/students/${student.id}`}>
                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium">
                    {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">
                      {student.lastName} {student.firstName}
                    </p>
                    <p className="text-sm text-slate-500">{student.studentId}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">Aucun étudiant inscrit</p>
        )}
      </GlassCard>

      {/* Recent Sessions */}
      <GlassCard>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Sessions récentes</h2>
        {cls.sessions.length > 0 ? (
          <div className="space-y-2">
            {cls.sessions.map((session: any) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
              >
                <div>
                  <p className="font-medium text-slate-800">
                    {format(new Date(session.date), 'EEEE d MMMM', { locale: fr })}
                  </p>
                  <p className="text-sm text-slate-500">
                    {session.startTime} - {session.endTime}
                    {session.topic && ` • ${session.topic}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary-600">
                    {session._count.attendances}
                  </p>
                  <p className="text-xs text-slate-500">présences</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">Aucune session</p>
        )}
      </GlassCard>

      {/* Edit Modal */}
      <GlassModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Modifier la classe"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <GlassInput
            label="Nom"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            required
          />
          <GlassInput
            label="Code"
            value={editData.code}
            onChange={(e) => setEditData({ ...editData, code: e.target.value.toUpperCase() })}
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <GlassButton type="button" onClick={() => setShowEditModal(false)}>
              Annuler
            </GlassButton>
            <GlassButton type="submit" variant="primary" loading={saving}>
              Enregistrer
            </GlassButton>
          </div>
        </form>
      </GlassModal>

      {/* Delete Modal */}
      <GlassModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Supprimer la classe"
        size="sm"
      >
        <p className="text-slate-600 mb-6">
          Êtes-vous sûr de vouloir supprimer <strong>{cls.name}</strong> ?
          Tous les étudiants et sessions seront également supprimés.
        </p>
        <div className="flex justify-end gap-3">
          <GlassButton onClick={() => setShowDeleteModal(false)}>
            Annuler
          </GlassButton>
          <GlassButton variant="danger" onClick={handleDelete} loading={saving}>
            Supprimer
          </GlassButton>
        </div>
      </GlassModal>
    </div>
  );
}
