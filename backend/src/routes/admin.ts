import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Apply admin middleware to all routes
router.use(authenticate, requireAdmin);

// Get all users
router.get('/users', async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { classes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user
router.post(
  '/users',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty(),
    body('role').isIn(['ADMIN', 'TEACHER']),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name, role } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: { email, password: hashedPassword, name, role },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      });

      res.status(201).json({ user });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

// Update user
router.put(
  '/users/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('role').optional().isIn(['ADMIN', 'TEACHER']),
  ],
  async (req: AuthRequest, res) => {
    try {
      const { name, role } = req.body;

      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: {
          ...(name && { name }),
          ...(role && { role }),
        },
        select: { id: true, email: true, name: true, role: true },
      });

      res.json({ user });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

// Delete user
router.delete('/users/:id', async (req: AuthRequest, res) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    await prisma.user.delete({ where: { id: req.params.id } });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Dashboard stats
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const [totalUsers, totalStudents, totalClasses, totalSessions] = await Promise.all([
      prisma.user.count(),
      prisma.student.count(),
      prisma.class.count(),
      prisma.session.count(),
    ]);

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySessions = await prisma.session.count({
      where: {
        date: { gte: today, lt: tomorrow },
      },
    });

    const todayAttendance = await prisma.attendance.groupBy({
      by: ['status'],
      where: {
        session: { date: { gte: today, lt: tomorrow } },
      },
      _count: true,
    });

    // This week's attendance trend
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyTrend = await prisma.$queryRaw`
      SELECT 
        DATE(s.date) as date,
        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) as absent,
        COUNT(CASE WHEN a.status = 'LATE' THEN 1 END) as late,
        COUNT(*) as total
      FROM "Session" s
      LEFT JOIN "Attendance" a ON a."sessionId" = s.id
      WHERE s.date >= ${weekAgo}
      GROUP BY DATE(s.date)
      ORDER BY DATE(s.date)
    `;

    res.json({
      totals: {
        users: totalUsers,
        students: totalStudents,
        classes: totalClasses,
        sessions: totalSessions,
      },
      today: {
        sessions: todaySessions,
        attendance: todayAttendance,
      },
      weeklyTrend,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Export attendance report
router.get('/export/:classId', async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, format = 'xlsx' } = req.query;

    const classRecord = await prisma.class.findUnique({
      where: { id: req.params.classId },
      include: {
        students: {
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        },
        sessions: {
          where: {
            date: {
              ...(startDate && { gte: new Date(startDate as string) }),
              ...(endDate && { lte: new Date(endDate as string) }),
            },
          },
          orderBy: { date: 'asc' },
          include: {
            attendances: true,
          },
        },
      },
    });

    if (!classRecord) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Headers
    const headers = [
      'Student ID',
      'Last Name',
      'First Name',
      ...classRecord.sessions.map(s => new Date(s.date).toLocaleDateString()),
      'Present',
      'Absent',
      'Late',
      'Excused',
      'Rate %',
    ];
    worksheet.addRow(headers);

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Data rows
    classRecord.students.forEach(student => {
      const attendanceBySession = new Map(
        classRecord.sessions.flatMap(s =>
          s.attendances
            .filter(a => a.studentId === student.id)
            .map(a => [s.id, a.status])
        )
      );

      const stats = {
        PRESENT: 0,
        ABSENT: 0,
        LATE: 0,
        EXCUSED: 0,
      };

      const sessionStatuses = classRecord.sessions.map(s => {
        const status = attendanceBySession.get(s.id);
        if (status) stats[status]++;
        return status || '-';
      });

      const total = stats.PRESENT + stats.ABSENT + stats.LATE + stats.EXCUSED;
      const rate = total > 0 ? Math.round(((stats.PRESENT + stats.LATE) / total) * 100) : 0;

      worksheet.addRow([
        student.studentId,
        student.lastName,
        student.firstName,
        ...sessionStatuses,
        stats.PRESENT,
        stats.ABSENT,
        stats.LATE,
        stats.EXCUSED,
        `${rate}%`,
      ]);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    // Status colors
    const statusColors: Record<string, string> = {
      PRESENT: 'FF10B981',
      ABSENT: 'FFEF4444',
      LATE: 'FFF59E0B',
      EXCUSED: 'FF3B82F6',
    };

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell, colNumber) => {
          const value = cell.value?.toString() || '';
          if (statusColors[value]) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: statusColors[value] },
            };
            cell.font = { color: { argb: 'FFFFFFFF' } };
          }
        });
      }
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=attendance-${classRecord.code}-${new Date().toISOString().split('T')[0]}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

// Get students with low attendance
router.get('/alerts', async (req: AuthRequest, res) => {
  try {
    const { threshold = 70 } = req.query;

    const students = await prisma.student.findMany({
      include: {
        class: { select: { id: true, name: true, code: true } },
        attendances: true,
      },
    });

    const alerts = students
      .map(student => {
        const total = student.attendances.length;
        if (total < 3) return null; // Not enough data

        const present = student.attendances.filter(
          a => a.status === 'PRESENT' || a.status === 'LATE'
        ).length;
        const rate = Math.round((present / total) * 100);

        if (rate >= Number(threshold)) return null;

        return {
          student: {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            studentId: student.studentId,
          },
          class: student.class,
          attendanceRate: rate,
          totalSessions: total,
          absences: total - present,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.attendanceRate - b!.attendanceRate);

    res.json({ alerts, threshold: Number(threshold) });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

export default router;
