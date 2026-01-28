'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatsCard } from '@/components/StatsCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Users, BookOpen, ClipboardCheck, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [todayData, setTodayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, todayRes] = await Promise.all([
          api.getAdminStats().catch(() => null),
          api.getTodayAttendance(),
        ]);
        setStats(statsRes);
        setTodayData(todayRes);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const today = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 mt-1 capitalize">{today}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Étudiants"
          value={stats?.totals?.students || '-'}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Classes"
          value={stats?.totals?.classes || '-'}
          icon={BookOpen}
          color="green"
        />
        <StatsCard
          title="Sessions aujourd'hui"
          value={todayData?.summary?.totalSessions || 0}
          icon={Calendar}
          color="amber"
        />
        <StatsCard
          title="Présents aujourd'hui"
          value={todayData?.summary?.present || 0}
          subtitle={`sur ${todayData?.summary?.totalStudents || 0} étudiants`}
          icon={ClipboardCheck}
          color="green"
        />
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Summary */}
        <GlassCard>
          <h2 className="text-xl font-bold text-slate-800 mb-4">Résumé du jour</h2>
          {todayData?.summary ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                <span className="font-medium text-emerald-700">Présents</span>
                <span className="text-2xl font-bold text-emerald-600">{todayData.summary.present}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                <span className="font-medium text-amber-700">Retards</span>
                <span className="text-2xl font-bold text-amber-600">{todayData.summary.late}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                <span className="font-medium text-red-700">Absents</span>
                <span className="text-2xl font-bold text-red-600">{todayData.summary.absent}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                <span className="font-medium text-blue-700">Excusés</span>
                <span className="text-2xl font-bold text-blue-600">{todayData.summary.excused}</span>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">Aucune session aujourd'hui</p>
          )}
        </GlassCard>

        {/* Today's Sessions */}
        <GlassCard>
          <h2 className="text-xl font-bold text-slate-800 mb-4">Sessions du jour</h2>
          {todayData?.sessions?.length > 0 ? (
            <div className="space-y-3">
              {todayData.sessions.map((session: any) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-slate-800">{session.class.name}</p>
                    <p className="text-sm text-slate-500">
                      {session.startTime} - {session.endTime}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary-600">
                      {session.attendances.filter((a: any) => a.status === 'PRESENT').length}
                    </p>
                    <p className="text-xs text-slate-500">présents</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">Aucune session programmée</p>
          )}
        </GlassCard>
      </div>

      {/* Quick Actions */}
      <GlassCard>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/attendance"
            className="flex items-center gap-4 p-4 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-medium text-slate-800">Prendre les présences</p>
              <p className="text-sm text-slate-500">Démarrer une session</p>
            </div>
          </a>
          <a
            href="/students"
            className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-medium text-slate-800">Gérer les étudiants</p>
              <p className="text-sm text-slate-500">Ajouter ou modifier</p>
            </div>
          </a>
          <a
            href="/reports"
            className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-medium text-slate-800">Voir les rapports</p>
              <p className="text-sm text-slate-500">Statistiques détaillées</p>
            </div>
          </a>
        </div>
      </GlassCard>
    </div>
  );
}
