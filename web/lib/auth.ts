import Cookies from 'js-cookie';
import { api } from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'TEACHER';
}

export function getToken(): string | undefined {
  return Cookies.get('token');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { user } = await api.getMe();
    return user;
  } catch {
    return null;
  }
}

export function logout(): void {
  api.logout();
  window.location.href = '/login';
}
