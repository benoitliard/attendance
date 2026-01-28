import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

// Get all students (with optional class filter)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { classId, search } = req.query;

    const where: any = {};
    
    // Filter by teacher's classes unless admin
    if (req.user!.role !== 'ADMIN') {
      where.class = { teacherId: req.user!.id };
    }

    if (classId) {
      where.classId = classId as string;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { studentId: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        class: { select: { id: true, name: true, code: true } },
        _count: { select: { attendances: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    res.json({ students });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Get student by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: {
        class: { select: { id: true, name: true, code: true, teacherId: true } },
        attendances: {
          include: { session: true },
          orderBy: { markedAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check access
    if (req.user!.role !== 'ADMIN' && student.class.teacherId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate attendance stats
    const stats = await prisma.attendance.groupBy({
      by: ['status'],
      where: { studentId: student.id },
      _count: true,
    });

    res.json({ student, stats });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

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
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { firstName, lastName, studentId, classId, email, phone } = req.body;

      // Check class exists and user has access
      const classRecord = await prisma.class.findUnique({ where: { id: classId } });
      if (!classRecord) {
        return res.status(404).json({ error: 'Class not found' });
      }

      if (req.user!.role !== 'ADMIN' && classRecord.teacherId !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Check studentId uniqueness
      const existing = await prisma.student.findUnique({ where: { studentId } });
      if (existing) {
        return res.status(400).json({ error: 'Student ID already exists' });
      }

      const student = await prisma.student.create({
        data: { firstName, lastName, studentId, classId, email, phone },
        include: { class: { select: { id: true, name: true, code: true } } },
      });

      res.status(201).json({ student });
    } catch (error) {
      console.error('Create student error:', error);
      res.status(500).json({ error: 'Failed to create student' });
    }
  }
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
  async (req: AuthRequest, res) => {
    try {
      const student = await prisma.student.findUnique({
        where: { id: req.params.id },
        include: { class: { select: { teacherId: true } } },
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      if (req.user!.role !== 'ADMIN' && student.class.teacherId !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { firstName, lastName, studentId, email, phone, classId } = req.body;

      // Check studentId uniqueness if changing
      if (studentId && studentId !== student.studentId) {
        const existing = await prisma.student.findUnique({ where: { studentId } });
        if (existing) {
          return res.status(400).json({ error: 'Student ID already exists' });
        }
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
    } catch (error) {
      console.error('Update student error:', error);
      res.status(500).json({ error: 'Failed to update student' });
    }
  }
);

// Delete student
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: { class: { select: { teacherId: true } } },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (req.user!.role !== 'ADMIN' && student.class.teacherId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.student.delete({ where: { id: req.params.id } });

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// Import students from CSV
router.post(
  '/import',
  authenticate,
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { classId } = req.body;
      if (!classId) {
        return res.status(400).json({ error: 'Class ID required' });
      }

      // Check class access
      const classRecord = await prisma.class.findUnique({ where: { id: classId } });
      if (!classRecord) {
        return res.status(404).json({ error: 'Class not found' });
      }

      if (req.user!.role !== 'ADMIN' && classRecord.teacherId !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Parse CSV
      const records: any[] = [];
      const parser = Readable.from(req.file.buffer).pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        })
      );

      for await (const record of parser) {
        records.push(record);
      }

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
          if (existing) {
            results.skipped++;
            continue;
          }

          await prisma.student.create({
            data: { studentId, firstName, lastName, email, phone, classId },
          });
          results.created++;
        } catch (err: any) {
          results.errors.push(err.message);
          results.skipped++;
        }
      }

      res.json({ message: 'Import completed', results });
    } catch (error) {
      console.error('Import error:', error);
      res.status(500).json({ error: 'Import failed' });
    }
  }
);

export default router;
