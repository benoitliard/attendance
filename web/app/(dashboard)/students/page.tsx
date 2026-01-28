'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StudentCard } from '@/components/StudentCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassSelect } from '@/components/ui/GlassSelect';
import { GlassModal } from '@/components/ui/GlassModal';
import { Search, Plus, Upload, Users } from 'lucide-react';

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    firstName: '',
    lastName: '',
    studentId: '',
    email: '',
    phone: '',
    classId: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedClass, search]);

  async function loadData() {
    try {
      const [studentsRes, classesRes] = await Promise.all([
        api.getStudents(selectedClass || undefined, search || undefined),
        api.getClasses(),
      ]);
      setStudents(studentsRes.students);
      setClasses(classesRes.classes);
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createStudent(newStudent);
      setShowAddModal(false);
      setNewStudent({
        firstName: '',
        lastName: '',
        studentId: '',
        email: '',
        phone: '',
        classId: '',
      });
      loadData();
    } catch (error: any) {
      alert(error.message || 'Erreur lors de l\'ajout');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Étudiants</h1>
          <p className="text-slate-500 mt-1">{students.length} étudiants</p>
        </div>
        <div className="flex gap-3">
          <GlassButton onClick={() => setShowAddModal(true)}>
            <Plus className="w-5 h-5" />
            Ajouter
          </GlassButton>
        </div>
      </div>

      {/* Filters */}
      <GlassCard>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <GlassInput
              placeholder="Rechercher un étudiant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 w-full"
            />
          </div>
          <GlassSelect
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            options={[
              { value: '', label: 'Toutes les classes' },
              ...classes.map((c) => ({ value: c.id, label: c.name })),
            ]}
            className="min-w-[200px]"
          />
        </div>
      </GlassCard>

      {/* Students Grid */}
      {loading ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Chargement...</p>
        </div>
      ) : students.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Aucun étudiant trouvé</p>
          <GlassButton
            variant="primary"
            className="mt-4"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-5 h-5" />
            Ajouter un étudiant
          </GlassButton>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      )}

      {/* Add Student Modal */}
      <GlassModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Ajouter un étudiant"
      >
        <form onSubmit={handleAddStudent} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <GlassInput
              label="Prénom"
              value={newStudent.firstName}
              onChange={(e) => setNewStudent({ ...newStudent, firstName: e.target.value })}
              required
            />
            <GlassInput
              label="Nom"
              value={newStudent.lastName}
              onChange={(e) => setNewStudent({ ...newStudent, lastName: e.target.value })}
              required
            />
          </div>
          <GlassInput
            label="Numéro étudiant"
            value={newStudent.studentId}
            onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })}
            required
          />
          <GlassSelect
            label="Classe"
            value={newStudent.classId}
            onChange={(e) => setNewStudent({ ...newStudent, classId: e.target.value })}
            options={[
              { value: '', label: 'Sélectionner une classe' },
              ...classes.map((c) => ({ value: c.id, label: c.name })),
            ]}
            required
          />
          <GlassInput
            label="Email (optionnel)"
            type="email"
            value={newStudent.email}
            onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
          />
          <GlassInput
            label="Téléphone (optionnel)"
            value={newStudent.phone}
            onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <GlassButton type="button" onClick={() => setShowAddModal(false)}>
              Annuler
            </GlassButton>
            <GlassButton type="submit" variant="primary" loading={saving}>
              Ajouter
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
