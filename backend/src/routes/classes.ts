import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all classes
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const where = req.user!.role === 'ADMIN' 
      ? {} 
      : { teacherId: req.user!.id };

    const classes = await prisma.class.findMany({
      where,
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        _count: { select: { students: true, sessions: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ classes });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Get class by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const classRecord = await prisma.class.findUnique({
      where: { id: req.params.id },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        students: {
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        },
        sessions: {
          orderBy: { date: 'desc' },
          take: 10,
          include: {
            _count: { select: { attendances: true } },
          },
        },
      },
    });

    if (!classRecord) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (req.user!.role !== 'ADMIN' && classRecord.teacherId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get attendance stats
    const attendanceStats = await prisma.attendance.groupBy({
      by: ['status'],
      where: {
        session: { classId: classRecord.id },
      },
      _count: true,
    });

    res.json({ class: classRecord, attendanceStats });
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// Create class
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty(),
    body('code').trim().notEmpty(),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, code } = req.body;

      // Check code uniqueness
      const existing = await prisma.class.findUnique({ where: { code } });
      if (existing) {
        return res.status(400).json({ error: 'Class code already exists' });
      }

      const classRecord = await prisma.class.create({
        data: {
          name,
          code,
          teacherId: req.user!.id,
        },
        include: {
          teacher: { select: { id: true, name: true, email: true } },
        },
      });

      res.status(201).json({ class: classRecord });
    } catch (error) {
      console.error('Create class error:', error);
      res.status(500).json({ error: 'Failed to create class' });
    }
  }
);

// Update class
router.put(
  '/:id',
  authenticate,
  [
    body('name').optional().trim().notEmpty(),
    body('code').optional().trim().notEmpty(),
  ],
  async (req: AuthRequest, res) => {
    try {
      const classRecord = await prisma.class.findUnique({
        where: { id: req.params.id },
      });

      if (!classRecord) {
        return res.status(404).json({ error: 'Class not found' });
      }

      if (req.user!.role !== 'ADMIN' && classRecord.teacherId !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { name, code } = req.body;

      // Check code uniqueness if changing
      if (code && code !== classRecord.code) {
        const existing = await prisma.class.findUnique({ where: { code } });
        if (existing) {
          return res.status(400).json({ error: 'Class code already exists' });
        }
      }

      const updated = await prisma.class.update({
        where: { id: req.params.id },
        data: {
          ...(name && { name }),
          ...(code && { code }),
        },
        include: {
          teacher: { select: { id: true, name: true, email: true } },
        },
      });

      res.json({ class: updated });
    } catch (error) {
      console.error('Update class error:', error);
      res.status(500).json({ error: 'Failed to update class' });
    }
  }
);

// Delete class
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const classRecord = await prisma.class.findUnique({
      where: { id: req.params.id },
    });

    if (!classRecord) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (req.user!.role !== 'ADMIN' && classRecord.teacherId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.class.delete({ where: { id: req.params.id } });

    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// Get class attendance report
router.get('/:id/report', authenticate, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;

    const classRecord = await prisma.class.findUnique({
      where: { id: req.params.id },
      include: {
        students: {
          include: {
            attendances: {
              where: {
                session: {
                  date: {
                    ...(startDate && { gte: new Date(startDate as string) }),
                    ...(endDate && { lte: new Date(endDate as string) }),
                  },
                },
              },
              include: { session: true },
            },
          },
        },
        sessions: {
          where: {
            date: {
              ...(startDate && { gte: new Date(startDate as string) }),
              ...(endDate && { lte: new Date(endDate as string) }),
            },
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!classRecord) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (req.user!.role !== 'ADMIN' && classRecord.teacherId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate attendance rates
    const report = classRecord.students.map(student => {
      const total = student.attendances.length;
      const present = student.attendances.filter(a => a.status === 'PRESENT').length;
      const late = student.attendances.filter(a => a.status === 'LATE').length;
      const absent = student.attendances.filter(a => a.status === 'ABSENT').length;
      const excused = student.attendances.filter(a => a.status === 'EXCUSED').length;

      return {
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          studentId: student.studentId,
        },
        stats: {
          total,
          present,
          late,
          absent,
          excused,
          attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
        },
      };
    });

    res.json({
      class: {
        id: classRecord.id,
        name: classRecord.name,
        code: classRecord.code,
      },
      totalSessions: classRecord.sessions.length,
      report,
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;
