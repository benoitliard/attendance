'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassModal } from '@/components/ui/GlassModal';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  BookOpen,
  Edit,
  Trash2,
  Check,
  X,
  Clock,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { clsx } from 'clsx';

const statusConfig = {
  PRESENT: { label: 'Présent', class: 'bg-emerald-100 text-emerald-700', icon: Check },
  ABSENT: { label: 'Absent', class: 'bg-red-100 text-red-700', icon: X },
  LATE: { label: 'Retard', class: 'bg-amber-100 text-amber-700', icon: Clock },
  EXCUSED: { label: 'Excusé', class: 'bg-blue-100 text-blue-700', icon: FileText },
};

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStudent();
  }, [params.id]);

  async function loadStudent() {
    try {
      const { student, stats } = await api.getStudent(params.id as string);
      setStudent(student);
      setStats(stats);
      setEditData({
        firstName: student.firstName,
        lastName: student.lastName,
        studentId: student.studentId,
        email: student.email || '',
        phone: student.phone || '',
      });
    } catch (error) {
      console.error('Failed to load student:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateStudent(params.id as string, editData);
      setShowEditModal(false);
      loadStudent();
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await api.deleteStudent(params.id as string);
      router.push('/students');
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

  if (!student) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Étudiant non trouvé</p>
      </div>
    );
  }

  const attendanceRate = stats.length > 0
    ? Math.round(
        ((stats.find((s) => s.status === 'PRESENT')?._count || 0) +
          (stats.find((s) => s.status === 'LATE')?._count || 0)) /
          stats.reduce((acc, s) => acc + s._count, 0) *
          100
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <GlassButton onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </GlassButton>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-800">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-slate-500">{student.studentId}</p>
        </div>
        <GlassButton onClick={() => setShowEditModal(true)}>
          <Edit className="w-5 h-5" />
          Modifier
        </GlassButton>
        <GlassButton variant="danger" onClick={() => setShowDeleteModal(true)}>
          <Trash2 className="w-5 h-5" />
        </GlassButton>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-2xl">
              {student.firstName.charAt(0)}{student.lastName.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-slate-800">{student.firstName} {student.lastName}</p>
              <p className="text-sm text-slate-500 flex items-center gap-1">
                <User className="w-4 h-4" />
                {student.studentId}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {student.email && (
              <p className="text-sm text-slate-600 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                {student.email}
              </p>
            )}
            {student.phone && (
              <p className="text-sm text-slate-600 flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                {student.phone}
              </p>
            )}
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-400" />
              {student.class.name} ({student.class.code})
            </p>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="font-semibold text-slate-800 mb-4">Taux de présence</h3>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-bold text-primary-600">{attendanceRate}</span>
            <span className="text-2xl text-slate-400 mb-1">%</span>
          </div>
          <div className="mt-4 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all"
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="font-semibold text-slate-800 mb-4">Statistiques</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(statusConfig).map(([status, config]) => {
              const count = stats.find((s) => s.status === status)?._count || 0;
              const Icon = config.icon;
              return (
                <div
                  key={status}
                  className={clsx('p-3 rounded-xl', config.class)}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{count}</p>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Attendance History */}
      <GlassCard>
        <h3 className="font-semibold text-slate-800 mb-4">Historique des présences</h3>
        {student.attendances?.length > 0 ? (
          <div className="space-y-2">
            {student.attendances.map((attendance: any) => {
              const config = statusConfig[attendance.status as keyof typeof statusConfig];
              const Icon = config.icon;
              return (
                <div
                  key={attendance.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-slate-800">
                      {format(new Date(attendance.session.date), 'EEEE d MMMM', { locale: fr })}
                    </p>
                    <p className="text-sm text-slate-500">
                      {attendance.session.startTime} - {attendance.session.endTime}
                      {attendance.session.topic && ` • ${attendance.session.topic}`}
                    </p>
                  </div>
                  <div className={clsx('px-3 py-1 rounded-full flex items-center gap-2', config.class)}>
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">Aucun historique disponible</p>
        )}
      </GlassCard>

      {/* Edit Modal */}
      <GlassModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Modifier l'étudiant"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <GlassInput
              label="Prénom"
              value={editData.firstName}
              onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
              required
            />
            <GlassInput
              label="Nom"
              value={editData.lastName}
              onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
              required
            />
          </div>
          <GlassInput
            label="Numéro étudiant"
            value={editData.studentId}
            onChange={(e) => setEditData({ ...editData, studentId: e.target.value })}
            required
          />
          <GlassInput
            label="Email"
            type="email"
            value={editData.email}
            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
          />
          <GlassInput
            label="Téléphone"
            value={editData.phone}
            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
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
        title="Supprimer l'étudiant"
        size="sm"
      >
        <p className="text-slate-600 mb-6">
          Êtes-vous sûr de vouloir supprimer <strong>{student.firstName} {student.lastName}</strong> ?
          Cette action est irréversible.
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
