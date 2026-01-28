import { Router } from 'express';
import { body } from 'express-validator';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { handleValidation, asyncHandler, errorResponse, notFound, accessDenied, hasAccess } from '../middleware/validation';

const router = Router();

// Get all classes
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const where = req.user!.role === 'ADMIN' ? {} : { teacherId: req.user!.id };
  const classes = await prisma.class.findMany({
    where,
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      _count: { select: { students: true, sessions: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json({ classes });
}));

// Get class by ID
router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const classRecord = await prisma.class.findUnique({
    where: { id: req.params.id },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      students: { orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }] },
      sessions: { orderBy: { date: 'desc' }, take: 10, include: { _count: { select: { attendances: true } } } },
    },
  });

  if (!classRecord) return notFound(res, 'Class');
  if (!hasAccess(req.user!.role, req.user!.id, classRecord.teacherId)) return accessDenied(res);

  const attendanceStats = await prisma.attendance.groupBy({
    by: ['status'],
    where: { session: { classId: classRecord.id } },
    _count: true,
  });

  res.json({ class: classRecord, attendanceStats });
}));

// Create class
router.post(
  '/',
  authenticate,
  [body('name').trim().notEmpty(), body('code').trim().notEmpty()],
  handleValidation,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { name, code } = req.body;

    const existing = await prisma.class.findUnique({ where: { code } });
    if (existing) {
      return errorResponse(res, 400, 'Class code already exists');
    }

    const classRecord = await prisma.class.create({
      data: { name, code, teacherId: req.user!.id },
      include: { teacher: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json({ class: classRecord });
  })
);

// Update class
router.put(
  '/:id',
  authenticate,
  [body('name').optional().trim().notEmpty(), body('code').optional().trim().notEmpty()],
  handleValidation,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const classRecord = await prisma.class.findUnique({ where: { id: req.params.id } });
    if (!classRecord) return notFound(res, 'Class');
    if (!hasAccess(req.user!.role, req.user!.id, classRecord.teacherId)) return accessDenied(res);

    const { name, code } = req.body;
    if (code && code !== classRecord.code) {
      const existing = await prisma.class.findUnique({ where: { code } });
      if (existing) return errorResponse(res, 400, 'Class code already exists');
    }

    const updated = await prisma.class.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(code && { code }) },
      include: { teacher: { select: { id: true, name: true, email: true } } },
    });

    res.json({ class: updated });
  })
);

// Delete class
router.delete('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const classRecord = await prisma.class.findUnique({ where: { id: req.params.id } });
  if (!classRecord) return notFound(res, 'Class');
  if (!hasAccess(req.user!.role, req.user!.id, classRecord.teacherId)) return accessDenied(res);

  await prisma.class.delete({ where: { id: req.params.id } });
  res.json({ message: 'Class deleted successfully' });
}));

// Get class attendance report
router.get('/:id/report', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { startDate, endDate } = req.query;
  const dateFilter = {
    ...(startDate && { gte: new Date(startDate as string) }),
    ...(endDate && { lte: new Date(endDate as string) }),
  };

  const classRecord = await prisma.class.findUnique({
    where: { id: req.params.id },
    include: {
      students: {
        include: {
          attendances: {
            where: { session: { date: dateFilter } },
            include: { session: true },
          },
        },
      },
      sessions: { where: { date: dateFilter }, orderBy: { date: 'asc' } },
    },
  });

  if (!classRecord) return notFound(res, 'Class');
  if (!hasAccess(req.user!.role, req.user!.id, classRecord.teacherId)) return accessDenied(res);

  // Calculate attendance rates
  const report = classRecord.students.map(student => {
    const total = student.attendances.length;
    const counts = { present: 0, late: 0, absent: 0, excused: 0 };
    student.attendances.forEach(a => counts[a.status.toLowerCase() as keyof typeof counts]++);

    return {
      student: { id: student.id, firstName: student.firstName, lastName: student.lastName, studentId: student.studentId },
      stats: { total, ...counts, attendanceRate: total > 0 ? Math.round(((counts.present + counts.late) / total) * 100) : 0 },
    };
  });

  res.json({
    class: { id: classRecord.id, name: classRecord.name, code: classRecord.code },
    totalSessions: classRecord.sessions.length,
    report,
  });
}));

export default router;
