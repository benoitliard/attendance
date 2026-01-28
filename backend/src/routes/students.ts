import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { handleValidation, asyncHandler, errorResponse, notFound, accessDenied, hasAccess } from '../middleware/validation';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all students (with optional class filter)
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { classId, search } = req.query;
  const where: any = req.user!.role !== 'ADMIN' ? { class: { teacherId: req.user!.id } } : {};

  if (classId) where.classId = classId as string;
  if (search) {
    where.OR = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { studentId: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const students = await prisma.student.findMany({
    where,
    include: { class: { select: { id: true, name: true, code: true } }, _count: { select: { attendances: true } } },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });

  res.json({ students });
}));

// Get student by ID
router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const student = await prisma.student.findUnique({
    where: { id: req.params.id },
    include: {
      class: { select: { id: true, name: true, code: true, teacherId: true } },
      attendances: { include: { session: true }, orderBy: { markedAt: 'desc' }, take: 50 },
    },
  });

  if (!student) return notFound(res, 'Student');
  if (!hasAccess(req.user!.role, req.user!.id, student.class.teacherId)) return accessDenied(res);

  const stats = await prisma.attendance.groupBy({ by: ['status'], where: { studentId: student.id }, _count: true });
  res.json({ student, stats });
}));

// Create student
router.post(
  '/',
  authenticate,
  [
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('studentId').trim().notEmpty(),
    body('classId').notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().trim(),
  ],
  handleValidation,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { firstName, lastName, studentId, classId, email, phone } = req.body;

    const classRecord = await prisma.class.findUnique({ where: { id: classId } });
    if (!classRecord) return notFound(res, 'Class');
    if (!hasAccess(req.user!.role, req.user!.id, classRecord.teacherId)) return accessDenied(res);

    const existing = await prisma.student.findUnique({ where: { studentId } });
    if (existing) return errorResponse(res, 400, 'Student ID already exists');

    const student = await prisma.student.create({
      data: { firstName, lastName, studentId, classId, email, phone },
      include: { class: { select: { id: true, name: true, code: true } } },
    });

    res.status(201).json({ student });
  })
);

// Update student
router.put(
  '/:id',
  authenticate,
  [
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('studentId').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().trim(),
  ],
  handleValidation,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: { class: { select: { teacherId: true } } },
    });

    if (!student) return notFound(res, 'Student');
    if (!hasAccess(req.user!.role, req.user!.id, student.class.teacherId)) return accessDenied(res);

    const { firstName, lastName, studentId, email, phone, classId } = req.body;

    if (studentId && studentId !== student.studentId) {
      const existing = await prisma.student.findUnique({ where: { studentId } });
      if (existing) return errorResponse(res, 400, 'Student ID already exists');
    }

    const updated = await prisma.student.update({
      where: { id: req.params.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(studentId && { studentId }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(classId && { classId }),
      },
      include: { class: { select: { id: true, name: true, code: true } } },
    });

    res.json({ student: updated });
  })
);

// Delete student
router.delete('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const student = await prisma.student.findUnique({
    where: { id: req.params.id },
    include: { class: { select: { teacherId: true } } },
  });

  if (!student) return notFound(res, 'Student');
  if (!hasAccess(req.user!.role, req.user!.id, student.class.teacherId)) return accessDenied(res);

  await prisma.student.delete({ where: { id: req.params.id } });
  res.json({ message: 'Student deleted successfully' });
}));

// Import students from CSV
router.post(
  '/import',
  authenticate,
  upload.single('file'),
  asyncHandler(async (req: AuthRequest, res: any) => {
    if (!req.file) return errorResponse(res, 400, 'No file uploaded');

    const { classId } = req.body;
    if (!classId) return errorResponse(res, 400, 'Class ID required');

    const classRecord = await prisma.class.findUnique({ where: { id: classId } });
    if (!classRecord) return notFound(res, 'Class');
    if (!hasAccess(req.user!.role, req.user!.id, classRecord.teacherId)) return accessDenied(res);

    // Parse CSV
    const records: any[] = [];
    const parser = Readable.from(req.file.buffer).pipe(
      parse({ columns: true, skip_empty_lines: true, trim: true })
    );
    for await (const record of parser) records.push(record);

    // Import students
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const record of records) {
      try {
        const studentId = record.studentId || record.student_id || record.id;
        const firstName = record.firstName || record.first_name || record.prenom;
        const lastName = record.lastName || record.last_name || record.nom;
        const email = record.email || null;
        const phone = record.phone || record.telephone || null;

        if (!studentId || !firstName || !lastName) {
          results.errors.push(`Missing required fields for row: ${JSON.stringify(record)}`);
          results.skipped++;
          continue;
        }

        const existing = await prisma.student.findUnique({ where: { studentId } });
        if (existing) { results.skipped++; continue; }

        await prisma.student.create({ data: { studentId, firstName, lastName, email, phone, classId } });
        results.created++;
      } catch (err: any) {
        results.errors.push(err.message);
        results.skipped++;
      }
    }

    res.json({ message: 'Import completed', results });
  })
);

export default router;
