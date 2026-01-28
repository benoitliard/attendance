'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassSelect } from '@/components/ui/GlassSelect';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { BarChart3, Download, AlertTriangle, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';

export default function ReportsPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [report, setReport] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadReport();
    }
  }, [selectedClass, startDate, endDate]);

  async function loadInitialData() {
    try {
      const [classesRes, alertsRes] = await Promise.all([
        api.getClasses(),
        api.getAlerts(70).catch(() => ({ alerts: [] })),
      ]);
      setClasses(classesRes.classes);
      setAlerts(alertsRes.alerts || []);
      if (classesRes.classes.length > 0) {
        setSelectedClass(classesRes.classes[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadReport() {
    try {
      const data = await api.getClassReport(
        selectedClass,
        startDate || undefined,
        endDate || undefined
      );
      setReport(data);
    } catch (error) {
      console.error('Failed to load report:', error);
    }
  }

  function exportToCSV() {
    if (!report) return;

    const headers = ['Numéro étudiant', 'Nom', 'Prénom', 'Présent', 'Absent', 'Retard', 'Excusé', 'Taux %'];
    const rows = report.report.map((r: any) => [
      r.student.studentId,
      r.student.lastName,
      r.student.firstName,
      r.stats.present,
      r.stats.absent,
      r.stats.late,
      r.stats.excused,
      r.stats.attendanceRate,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-${report.class.code}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Rapports</h1>
          <p className="text-slate-500 mt-1">Statistiques de présence détaillées</p>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <GlassCard className="border-l-4 border-amber-500">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800">Alertes d'assiduité</h3>
              <p className="text-sm text-slate-500 mb-3">
                {alerts.length} étudiant{alerts.length > 1 ? 's' : ''} avec un taux de présence inférieur à 70%
              </p>
              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert: any) => (
                  <div
                    key={alert.student.id}
                    className="flex items-center justify-between p-3 bg-amber-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-800">
                        {alert.student.lastName} {alert.student.firstName}
                      </p>
                      <p className="text-sm text-slate-500">{alert.class.name}</p>
                    </div>
                    <div className="flex items-center gap-2 text-amber-600">
                      <TrendingDown className="w-4 h-4" />
                      <span className="font-bold">{alert.attendanceRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Filters */}
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
          <div className="min-w-[150px]">
            <GlassInput
              label="Date début"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="min-w-[150px]">
            <GlassInput
              label="Date fin"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <GlassButton onClick={exportToCSV} disabled={!report}>
            <Download className="w-5 h-5" />
            Exporter CSV
          </GlassButton>
        </div>
      </GlassCard>

      {/* Report Table */}
      {!selectedClass ? (
        <GlassCard className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Sélectionnez une classe pour voir le rapport</p>
        </GlassCard>
      ) : !report ? (
        <GlassCard className="text-center py-12">
          <p className="text-slate-500">Chargement...</p>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">{report.class.name}</h2>
              <p className="text-sm text-slate-500">{report.totalSessions} sessions</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left p-4 font-semibold text-slate-700">Étudiant</th>
                  <th className="text-center p-4 font-semibold text-emerald-600">Présent</th>
                  <th className="text-center p-4 font-semibold text-red-600">Absent</th>
                  <th className="text-center p-4 font-semibold text-amber-600">Retard</th>
                  <th className="text-center p-4 font-semibold text-blue-600">Excusé</th>
                  <th className="text-center p-4 font-semibold text-slate-700">Taux</th>
                </tr>
              </thead>
              <tbody>
                {report.report.map((row: any) => (
                  <tr key={row.student.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-4">
                      <p className="font-medium text-slate-800">
                        {row.student.lastName} {row.student.firstName}
                      </p>
                      <p className="text-sm text-slate-500">{row.student.studentId}</p>
                    </td>
                    <td className="text-center p-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                        {row.stats.present}
                      </span>
                    </td>
                    <td className="text-center p-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 font-medium">
                        {row.stats.absent}
                      </span>
                    </td>
                    <td className="text-center p-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-medium">
                        {row.stats.late}
                      </span>
                    </td>
                    <td className="text-center p-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-medium">
                        {row.stats.excused}
                      </span>
                    </td>
                    <td className="text-center p-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={clsx(
                              'h-full rounded-full',
                              row.stats.attendanceRate >= 80 ? 'bg-emerald-500' :
                              row.stats.attendanceRate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                            )}
                            style={{ width: `${row.stats.attendanceRate}%` }}
                          />
                        </div>
                        <span className={clsx(
                          'font-bold',
                          row.stats.attendanceRate >= 80 ? 'text-emerald-600' :
                          row.stats.attendanceRate >= 60 ? 'text-amber-600' : 'text-red-600'
                        )}>
                          {row.stats.attendanceRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
