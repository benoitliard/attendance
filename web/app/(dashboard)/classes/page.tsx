'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassModal } from '@/components/ui/GlassModal';
import { BookOpen, Plus, Users, Calendar, ChevronRight } from 'lucide-react';

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', code: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    try {
      const { classes } = await api.getClasses();
      setClasses(classes);
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddClass(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createClass(newClass.name, newClass.code);
      setShowAddModal(false);
      setNewClass({ name: '', code: '' });
      loadClasses();
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Classes</h1>
          <p className="text-slate-500 mt-1">{classes.length} classes</p>
        </div>
        <GlassButton onClick={() => setShowAddModal(true)}>
          <Plus className="w-5 h-5" />
          Nouvelle classe
        </GlassButton>
      </div>

      {/* Classes Grid */}
      {loading ? (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Chargement...</p>
        </div>
      ) : classes.length === 0 ? (
        <GlassCard className="text-center py-12">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Aucune classe créée</p>
          <GlassButton
            variant="primary"
            className="mt-4"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-5 h-5" />
            Créer une classe
          </GlassButton>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((classItem) => (
            <Link key={classItem.id} href={`/classes/${classItem.id}`}>
              <GlassCard className="hover:scale-[1.02] transition-transform cursor-pointer h-full">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">
                      {classItem.name}
                    </h3>
                    <p className="text-sm text-primary-600">{classItem.code}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Users className="w-4 h-4" />
                    <span>{classItem._count.students} étudiants</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="w-4 h-4" />
                    <span>{classItem._count.sessions} sessions</span>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-400">
                  Prof: {classItem.teacher.name}
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}

      {/* Add Class Modal */}
      <GlassModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Créer une classe"
      >
        <form onSubmit={handleAddClass} className="space-y-4">
          <GlassInput
            label="Nom de la classe"
            placeholder="ex: Introduction à la Programmation"
            value={newClass.name}
            onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
            required
          />
          <GlassInput
            label="Code"
            placeholder="ex: INFO-101"
            value={newClass.code}
            onChange={(e) => setNewClass({ ...newClass, code: e.target.value.toUpperCase() })}
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <GlassButton type="button" onClick={() => setShowAddModal(false)}>
              Annuler
            </GlassButton>
            <GlassButton type="submit" variant="primary" loading={saving}>
              Créer
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
