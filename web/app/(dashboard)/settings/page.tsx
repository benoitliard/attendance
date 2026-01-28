'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassButton } from '@/components/ui/GlassButton';
import { getCurrentUser, User, logout } from '@/lib/auth';
import { User as UserIcon, Mail, Lock, LogOut, Shield } from 'lucide-react';

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setName(currentUser.name);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setMessage('');
    setError('');

    try {
      await api.request('/auth/profile', {
        method: 'PUT',
        body: { name },
      });
      setMessage('Profil mis à jour');
      loadUser();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setSavingPassword(true);

    try {
      await api.request('/auth/password', {
        method: 'PUT',
        body: { currentPassword, newPassword },
      });
      setMessage('Mot de passe mis à jour');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSavingPassword(false);
    }
  }

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Paramètres</h1>
        <p className="text-slate-500 mt-1">Gérez votre compte</p>
      </div>

      {/* Messages */}
      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
          {message}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      )}

      {/* Profile Section */}
      <GlassCard>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-2xl">
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{user.name}</h2>
            <p className="text-slate-500">{user.email}</p>
            <div className="flex items-center gap-1 mt-1">
              <Shield className="w-4 h-4 text-primary-500" />
              <span className="text-sm text-primary-600">{user.role}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Informations personnelles
          </h3>
          
          <GlassInput
            label="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <div className="glass-input mt-1.5 flex items-center gap-2 text-slate-500 bg-slate-50">
              <Mail className="w-5 h-5" />
              {user.email}
            </div>
            <p className="text-xs text-slate-400 mt-1">L'email ne peut pas être modifié</p>
          </div>

          <div className="flex justify-end">
            <GlassButton type="submit" variant="primary" loading={savingProfile}>
              Enregistrer
            </GlassButton>
          </div>
        </form>
      </GlassCard>

      {/* Password Section */}
      <GlassCard>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Changer le mot de passe
          </h3>

          <GlassInput
            label="Mot de passe actuel"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <GlassInput
            label="Nouveau mot de passe"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <GlassInput
            label="Confirmer le mot de passe"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <div className="flex justify-end">
            <GlassButton type="submit" variant="primary" loading={savingPassword}>
              Changer le mot de passe
            </GlassButton>
          </div>
        </form>
      </GlassCard>

      {/* Logout */}
      <GlassCard>
        <h3 className="font-semibold text-slate-800 mb-4">Session</h3>
        <GlassButton variant="danger" onClick={logout}>
          <LogOut className="w-5 h-5" />
          Se déconnecter
        </GlassButton>
      </GlassCard>
    </div>
  );
}
