'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { Check, X, Clock, FileText } from 'lucide-react';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  attendance?: {
    status: AttendanceStatus;
    notes?: string;
  } | null;
}

interface AttendanceGridProps {
  students: Student[];
  onStatusChange: (studentId: string, status: AttendanceStatus, notes?: string) => void;
  disabled?: boolean;
}

const statusConfig = {
  PRESENT: { icon: Check, label: 'Présent', class: 'status-present' },
  ABSENT: { icon: X, label: 'Absent', class: 'status-absent' },
  LATE: { icon: Clock, label: 'Retard', class: 'status-late' },
  EXCUSED: { icon: FileText, label: 'Excusé', class: 'status-excused' },
};

export function AttendanceGrid({ students, onStatusChange, disabled }: AttendanceGridProps) {
  const [localAttendance, setLocalAttendance] = useState<Record<string, AttendanceStatus>>({});

  const handleStatusClick = (studentId: string, status: AttendanceStatus) => {
    if (disabled) return;
    setLocalAttendance((prev) => ({ ...prev, [studentId]: status }));
    onStatusChange(studentId, status);
  };

  const getStatus = (student: Student): AttendanceStatus | null => {
    return localAttendance[student.id] || student.attendance?.status || null;
  };

  return (
    <div className="space-y-3">
      {students.map((student) => {
        const currentStatus = getStatus(student);

        return (
          <div
            key={student.id}
            className="glass rounded-xl p-4 flex items-center gap-4"
          >
            {/* Student info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 truncate">
                {student.lastName} {student.firstName}
              </p>
              <p className="text-sm text-slate-500">{student.studentId}</p>
            </div>

            {/* Status buttons */}
            <div className="flex gap-2">
              {(Object.keys(statusConfig) as AttendanceStatus[]).map((status) => {
                const config = statusConfig[status];
                const isActive = currentStatus === status;

                return (
                  <button
                    key={status}
                    onClick={() => handleStatusClick(student.id, status)}
                    disabled={disabled}
                    className={clsx(
                      'p-2 rounded-lg transition-all duration-200',
                      isActive
                        ? config.class
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200',
                      disabled && 'opacity-50 cursor-not-allowed'
                    )}
                    title={config.label}
                  >
                    <config.icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
