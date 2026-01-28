import { Router } from 'express';
import { body } from 'express-validator';
import { AttendanceStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { handleValidation, asyncHandler, errorResponse, notFound, accessDenied, hasAccess } from '../middleware/validation';

const router = Router();

// Validation rules
const sessionValidation = [
  body('classId').notEmpty(),
  body('date').isISO8601(),
  body('startTime').notEmpty(),
  body('endTime').notEmpty(),
  body('topic').optional().trim(),
];

const markValidation = [
  body('sessionId').notEmpty(),
  body('studentId').notEmpty(),
  body('status').isIn(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
  body('notes').optional().trim(),
];

const bulkMarkValidation = [
  body('sessionId').notEmpty(),
  body('attendances').isArray(),
  body('attendances.*.studentId').notEmpty(),
  body('attendances.*.status').isIn(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
];

const quickValidation = [
  body('classId').notEmpty(),
  body('attendances').isArray(),
  body('attendances.*.studentId').notEmpty(),
  body('attendances.*.status').isIn(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
];

// Helper: Check class access
const checkClassAccess = async (classId: string, user: AuthRequest['user']) => {
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    include: { students: true },
  });
  
  if (!classRecord) return { error: 'not_found' };
  if (!hasAccess(user!.role, user!.id, classRecord.teacherId)) return { error: 'access_denied' };
  
  return { classRecord };
};

// Helper: Check session access  
const checkSessionAccess = async (sessionId: string, user: AuthRequest['user']) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { class: true },
  });
  
  if (!session) return { error: 'not_found' };
  if (!hasAccess(user!.role, user!.id, session.class.teacherId)) return { error: 'access_denied' };
  
  return { session };
};

// Get sessions for a class
router.get('/sessions', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { classId, date } = req.query;

  if (!classId) {
    return errorResponse(res, 400, 'Class ID required');
  }

  const result = await checkClassAccess(classId as string, req.user);
  if (result.error === 'not_found') return notFound(res, 'Class');
  if (result.error === 'access_denied') return accessDenied(res);

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
}));

// Create session
router.post(
  '/sessions',
  authenticate,
  sessionValidation,
  handleValidation,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { classId, date, startTime, endTime, topic } = req.body;

    const result = await checkClassAccess(classId, req.user);
    if (result.error === 'not_found') return notFound(res, 'Class');
    if (result.error === 'access_denied') return accessDenied(res);

    const session = await prisma.session.create({
      data: { classId, date: new Date(date), startTime, endTime, topic },
    });

    res.status(201).json({ session });
  })
);

// Get session with attendance
router.get('/sessions/:sessionId', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.sessionId },
    include: {
      class: {
        include: {
          students: { orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }] },
        },
      },
      attendances: { include: { student: true } },
    },
  });

  if (!session) return notFound(res, 'Session');
  if (!hasAccess(req.user!.role, req.user!.id, session.class.teacherId)) return accessDenied(res);

  // Merge students with their attendance
  const attendanceMap = new Map(session.attendances.map(a => [a.studentId, a]));
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
      class: { id: session.class.id, name: session.class.name, code: session.class.code },
    },
    students: studentsWithAttendance,
  });
}));

// Mark attendance (single student)
router.post(
  '/mark',
  authenticate,
  markValidation,
  handleValidation,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { sessionId, studentId, status, notes } = req.body;

    const result = await checkSessionAccess(sessionId, req.user);
    if (result.error === 'not_found') return notFound(res, 'Session');
    if (result.error === 'access_denied') return accessDenied(res);

    const attendance = await prisma.attendance.upsert({
      where: { studentId_sessionId: { studentId, sessionId } },
      create: { sessionId, studentId, status: status as AttendanceStatus, notes },
      update: { status: status as AttendanceStatus, notes },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
    });

    res.json({ attendance });
  })
);

// Bulk mark attendance
router.post(
  '/mark-bulk',
  authenticate,
  bulkMarkValidation,
  handleValidation,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { sessionId, attendances } = req.body;

    const result = await checkSessionAccess(sessionId, req.user);
    if (result.error === 'not_found') return notFound(res, 'Session');
    if (result.error === 'access_denied') return accessDenied(res);

    const results = await Promise.all(
      attendances.map((a: { studentId: string; status: AttendanceStatus; notes?: string }) =>
        prisma.attendance.upsert({
          where: { studentId_sessionId: { studentId: a.studentId, sessionId } },
          create: { sessionId, studentId: a.studentId, status: a.status, notes: a.notes },
          update: { status: a.status, notes: a.notes },
        })
      )
    );

    res.json({ attendances: results, count: results.length });
  })
);

// Quick attendance (create session + mark all)
router.post(
  '/quick',
  authenticate,
  quickValidation,
  handleValidation,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { classId, attendances, topic } = req.body;

    const result = await checkClassAccess(classId, req.user);
    if (result.error === 'not_found') return notFound(res, 'Class');
    if (result.error === 'access_denied') return accessDenied(res);

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
      attendances.map((a: { studentId: string; status: AttendanceStatus; notes?: string }) =>
        prisma.attendance.create({
          data: { sessionId: session.id, studentId: a.studentId, status: a.status, notes: a.notes },
        })
      )
    );

    res.status(201).json({ session, attendances: results });
  })
);

// Get today's attendance summary
router.get('/today', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const where = req.user!.role === 'ADMIN' ? {} : { class: { teacherId: req.user!.id } };

  const sessions = await prisma.session.findMany({
    where: { ...where, date: { gte: today, lt: tomorrow } },
    include: {
      class: { select: { id: true, name: true, code: true } },
      attendances: {
        include: { student: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });

  // Calculate summary
  const summary = { totalSessions: sessions.length, totalStudents: 0, present: 0, absent: 0, late: 0, excused: 0 };
  sessions.forEach(s => s.attendances.forEach(a => {
    summary.totalStudents++;
    summary[a.status.toLowerCase() as keyof typeof summary]++;
  }));

  res.json({ sessions, summary });
}));

export default router;
