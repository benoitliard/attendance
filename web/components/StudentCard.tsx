'use client';

import Link from 'next/link';
import { User, Mail, Phone, BookOpen } from 'lucide-react';

interface StudentCardProps {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string;
    email?: string;
    phone?: string;
    class?: {
      id: string;
      name: string;
      code: string;
    };
    _count?: {
      attendances: number;
    };
  };
}

export function StudentCard({ student }: StudentCardProps) {
  return (
    <Link href={`/students/${student.id}`}>
      <div className="glass-card hover:scale-[1.02] transition-transform cursor-pointer">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg">
            {student.firstName.charAt(0)}{student.lastName.charAt(0)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 truncate">
              {student.lastName} {student.firstName}
            </h3>
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <User className="w-3 h-3" />
              {student.studentId}
            </p>
            
            {student.class && (
              <p className="text-sm text-primary-600 flex items-center gap-1 mt-1">
                <BookOpen className="w-3 h-3" />
                {student.class.name}
              </p>
            )}

            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
              {student.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {student.email}
                </span>
              )}
              {student.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {student.phone}
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          {student._count && (
            <div className="text-right">
              <p className="text-2xl font-bold text-primary-600">
                {student._count.attendances}
              </p>
              <p className="text-xs text-slate-500">présences</p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
