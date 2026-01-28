import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, AttendanceStatus } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get sessions for a class
router.get('/sessions', authenticate, async (req: AuthRequest, res) => {
  try {
    const { classId, date } = req.query;

    if (!classId) {
      return res.status(400).json({ error: 'Class ID required' });
    }

    // Check class access
    const classRecord = await prisma.class.findUnique({
      where: { id: classId as string },
    });

    if (!classRecord) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (req.user!.role !== 'ADMIN' && classRecord.teacherId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const where: any = { classId: classId as string };
    if (date) {
      const d = new Date(date as string);
      where.date = {
        gte: new Date(d.setHours(0, 0, 0, 0)),
        lt: new Date(d.setHours(24, 0, 0, 0)),
      };
    }

    const sessions = await prisma.session.findMany({
      where,
      include: {
        _count: { select: { attendances: true } },
        attendances: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, studentId: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Create session
router.post(
  '/sessions',
  authenticate,
  [
    body('classId').notEmpty(),
    body('date').isISO8601(),
    body('startTime').notEmpty(),
    body('endTime').notEmpty(),
    body('topic').optional().trim(),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { classId, date, startTime, endTime, topic } = req.body;

      // Check class access
      const classRecord = await prisma.class.findUnique({
        where: { id: classId },
        include: { students: true },
      });

      if (!classRecord) {
        return res.status(404).json({ error: 'Class not found' });
      }

      if (req.user!.role !== 'ADMIN' && classRecord.teacherId !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const session = await prisma.session.create({
        data: {
          classId,
          date: new Date(date),
          startTime,
          endTime,
          topic,
        },
      });

      res.status(201).json({ session });
    } catch (error) {
      console.error('Create session error:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  }
);

// Get session with attendance
router.get('/sessions/:sessionId', authenticate, async (req: AuthRequest, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.sessionId },
      include: {
        class: {
          include: {
            students: {
              orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
            },
          },
        },
        attendances: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (req.user!.role !== 'ADMIN' && session.class.teacherId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Merge students with their attendance
    const attendanceMap = new Map(
      session.attendances.map(a => [a.studentId, a])
    );

    const studentsWithAttendance = session.class.students.map(student => ({
      ...student,
      attendance: attendanceMap.get(student.id) || null,
    }));

    res.json({
      session: {
        id: session.id,
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        topic: session.topic,
        class: {
          id: session.class.id,
          name: session.class.name,
          code: session.class.code,
        },
      },
      students: studentsWithAttendance,
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Mark attendance (single student)
router.post(
  '/mark',
  authenticate,
  [
    body('sessionId').notEmpty(),
    body('studentId').notEmpty(),
    body('status').isIn(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
    body('notes').optional().trim(),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { sessionId, studentId, status, notes } = req.body;

      // Verify session access
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { class: true },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (req.user!.role !== 'ADMIN' && session.class.teacherId !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Upsert attendance
      const attendance = await prisma.attendance.upsert({
        where: {
          studentId_sessionId: { studentId, sessionId },
        },
        create: {
          sessionId,
          studentId,
          status: status as AttendanceStatus,
          notes,
        },
        update: {
          status: status as AttendanceStatus,
          notes,
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      res.json({ attendance });
    } catch (error) {
      console.error('Mark attendance error:', error);
      res.status(500).json({ error: 'Failed to mark attendance' });
    }
  }
);

// Bulk mark attendance
router.post(
  '/mark-bulk',
  authenticate,
  [
    body('sessionId').notEmpty(),
    body('attendances').isArray(),
    body('attendances.*.studentId').notEmpty(),
    body('attendances.*.status').isIn(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { sessionId, attendances } = req.body;

      // Verify session access
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { class: true },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (req.user!.role !== 'ADMIN' && session.class.teacherId !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Bulk upsert
      const results = await Promise.all(
        attendances.map(async (a: { studentId: string; status: AttendanceStatus; notes?: string }) => {
          return prisma.attendance.upsert({
            where: {
              studentId_sessionId: { studentId: a.studentId, sessionId },
            },
            create: {
              sessionId,
              studentId: a.studentId,
              status: a.status,
              notes: a.notes,
            },
            update: {
              status: a.status,
              notes: a.notes,
            },
          });
        })
      );

      res.json({ attendances: results, count: results.length });
    } catch (error) {
      console.error('Bulk mark attendance error:', error);
      res.status(500).json({ error: 'Failed to mark attendance' });
    }
  }
);

// Quick attendance (create session + mark all)
router.post(
  '/quick',
  authenticate,
  [
    body('classId').notEmpty(),
    body('attendances').isArray(),
    body('attendances.*.studentId').notEmpty(),
    body('attendances.*.status').isIn(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { classId, attendances, topic } = req.body;

      // Verify class access
      const classRecord = await prisma.class.findUnique({
        where: { id: classId },
      });

      if (!classRecord) {
        return res.status(404).json({ error: 'Class not found' });
      }

      if (req.user!.role !== 'ADMIN' && classRecord.teacherId !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Create session for today
      const now = new Date();
      const session = await prisma.session.create({
        data: {
          classId,
          date: now,
          startTime: now.toTimeString().slice(0, 5),
          endTime: new Date(now.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5),
          topic,
        },
      });

      // Mark all attendances
      const results = await Promise.all(
        attendances.map(async (a: { studentId: string; status: AttendanceStatus; notes?: string }) => {
          return prisma.attendance.create({
            data: {
              sessionId: session.id,
              studentId: a.studentId,
              status: a.status,
              notes: a.notes,
            },
          });
        })
      );

      res.status(201).json({ session, attendances: results });
    } catch (error) {
      console.error('Quick attendance error:', error);
      res.status(500).json({ error: 'Failed to record attendance' });
    }
  }
);

// Get today's attendance summary
router.get('/today', authenticate, async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where = req.user!.role === 'ADMIN' 
      ? {} 
      : { class: { teacherId: req.user!.id } };

    const sessions = await prisma.session.findMany({
      where: {
        ...where,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        class: { select: { id: true, name: true, code: true } },
        attendances: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    // Calculate summary
    const summary = {
      totalSessions: sessions.length,
      totalStudents: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    };

    sessions.forEach(session => {
      session.attendances.forEach(a => {
        summary.totalStudents++;
        summary[a.status.toLowerCase() as keyof typeof summary]++;
      });
    });

    res.json({ sessions, summary });
  } catch (error) {
    console.error('Get today error:', error);
    res.status(500).json({ error: 'Failed to fetch today attendance' });
  }
});

export default router;
