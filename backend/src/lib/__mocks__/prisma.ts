// In-memory Prisma mock - no real database needed

// Helper: Apply select to filter returned fields
const applySelect = (obj: any, select: Record<string, boolean>) => {
  const result: any = {};
  for (const key of Object.keys(select)) {
    if (select[key] && obj.hasOwnProperty(key)) {
      result[key] = obj[key];
    }
  }
  return result;
};

// In-memory storage
let users: any[] = [];
let classes: any[] = [];
let students: any[] = [];
let sessions: any[] = [];
let attendanceRecords: any[] = [];

let idCounter = 1;
const generateId = () => `mock-id-${idCounter++}`;

// Reset function - call between tests for isolation
export const resetMockData = () => {
  users = [];
  classes = [];
  students = [];
  sessions = [];
  attendanceRecords = [];
  idCounter = 1;
};

// Prisma mock implementation
const mockPrisma = {
  user: {
    findUnique: async ({ where, select }: any) => {
      const user = users.find(u => u.id === where.id || u.email === where.email);
      if (!user) return null;
      if (select) return applySelect(user, select);
      return user;
    },
    findMany: async ({ select }: any = {}) => {
      if (select) return users.map(u => applySelect(u, select));
      return [...users];
    },
    create: async ({ data, select }: any) => {
      const user = { id: generateId(), createdAt: new Date(), updatedAt: new Date(), ...data };
      users.push(user);
      if (select) return applySelect(user, select);
      return user;
    },
    update: async ({ where, data, select }: any) => {
      const idx = users.findIndex(u => u.id === where.id);
      if (idx === -1) throw new Error('User not found');
      users[idx] = { ...users[idx], ...data, updatedAt: new Date() };
      if (select) return applySelect(users[idx], select);
      return users[idx];
    },
    delete: async ({ where }: any) => {
      const idx = users.findIndex(u => u.id === where.id);
      if (idx === -1) throw new Error('User not found');
      return users.splice(idx, 1)[0];
    },
    deleteMany: async ({ where }: any) => {
      if (where?.email?.startsWith) {
        const prefix = where.email.startsWith;
        const toDelete = users.filter(u => u.email.startsWith(prefix));
        users = users.filter(u => !u.email.startsWith(prefix));
        return { count: toDelete.length };
      }
      const count = users.length;
      users = [];
      return { count };
    },
  },
  class: {
    findUnique: async ({ where, include }: any) => {
      const cls = classes.find(c => c.id === where.id);
      if (!cls) return null;
      if (include?.students) {
        return { ...cls, students: students.filter(s => s.classId === cls.id) };
      }
      return cls;
    },
    findMany: async ({ where, include }: any) => {
      let result = where?.teacherId ? classes.filter(c => c.teacherId === where.teacherId) : [...classes];
      if (include?.students) {
        result = result.map(c => ({ ...c, students: students.filter(s => s.classId === c.id) }));
      }
      if (include?._count?.select?.students) {
        result = result.map(c => ({ ...c, _count: { students: students.filter(s => s.classId === c.id).length } }));
      }
      return result;
    },
    create: async ({ data }: any) => {
      const cls = { id: generateId(), createdAt: new Date(), updatedAt: new Date(), ...data };
      classes.push(cls);
      return cls;
    },
    update: async ({ where, data }: any) => {
      const idx = classes.findIndex(c => c.id === where.id);
      if (idx === -1) throw new Error('Class not found');
      classes[idx] = { ...classes[idx], ...data, updatedAt: new Date() };
      return classes[idx];
    },
    delete: async ({ where }: any) => {
      const idx = classes.findIndex(c => c.id === where.id);
      if (idx === -1) throw new Error('Class not found');
      return classes.splice(idx, 1)[0];
    },
    deleteMany: async () => {
      const count = classes.length;
      classes = [];
      return { count };
    },
  },
  student: {
    findUnique: async ({ where }: any) => {
      return students.find(s => s.id === where.id) || null;
    },
    findMany: async ({ where }: any) => {
      if (where?.classId) return students.filter(s => s.classId === where.classId);
      return [...students];
    },
    create: async ({ data }: any) => {
      const student = { id: generateId(), createdAt: new Date(), updatedAt: new Date(), ...data };
      students.push(student);
      return student;
    },
    createMany: async ({ data }: any) => {
      const created = data.map((d: any) => ({ id: generateId(), createdAt: new Date(), updatedAt: new Date(), ...d }));
      students.push(...created);
      return { count: created.length };
    },
    update: async ({ where, data }: any) => {
      const idx = students.findIndex(s => s.id === where.id);
      if (idx === -1) throw new Error('Student not found');
      students[idx] = { ...students[idx], ...data, updatedAt: new Date() };
      return students[idx];
    },
    delete: async ({ where }: any) => {
      const idx = students.findIndex(s => s.id === where.id);
      if (idx === -1) throw new Error('Student not found');
      return students.splice(idx, 1)[0];
    },
    deleteMany: async ({ where }: any) => {
      if (where?.classId) {
        const toDelete = students.filter(s => s.classId === where.classId);
        students = students.filter(s => s.classId !== where.classId);
        return { count: toDelete.length };
      }
      const count = students.length;
      students = [];
      return { count };
    },
  },
  session: {
    findUnique: async ({ where, include }: any) => {
      const session = sessions.find(s => s.id === where.id);
      if (!session) return null;
      
      const result: any = { ...session };
      if (include?.attendances) {
        result.attendances = attendanceRecords.filter(a => a.sessionId === session.id);
        if (include.attendances.include?.student) {
          result.attendances = result.attendances.map((a: any) => ({
            ...a,
            student: students.find(s => s.id === a.studentId)
          }));
        }
      }
      if (include?.class) {
        const cls = classes.find(c => c.id === session.classId);
        if (cls) {
          result.class = include.class.include?.students 
            ? { ...cls, students: students.filter(s => s.classId === cls.id) }
            : cls;
        }
      }
      return result;
    },
    findMany: async ({ where, include, orderBy }: any) => {
      let result = where?.classId ? sessions.filter(s => s.classId === where.classId) : [...sessions];
      
      if (where?.date) {
        const dateStr = where.date instanceof Date ? where.date.toISOString().split('T')[0] : String(where.date).split('T')[0];
        result = result.filter(s => new Date(s.date).toISOString().split('T')[0] === dateStr);
      }
      if (include?.attendances) {
        result = result.map(s => ({
          ...s,
          attendances: attendanceRecords.filter(a => a.sessionId === s.id)
        }));
      }
      if (include?.class) {
        result = result.map(s => ({
          ...s,
          class: classes.find(c => c.id === s.classId)
        }));
      }
      if (orderBy?.date === 'desc') {
        result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
      return result;
    },
    findFirst: async ({ where, include }: any) => {
      let result = [...sessions];
      if (where?.classId) result = result.filter(s => s.classId === where.classId);
      if (where?.date) {
        const dateStr = where.date instanceof Date ? where.date.toISOString().split('T')[0] : String(where.date).split('T')[0];
        result = result.filter(s => new Date(s.date).toISOString().split('T')[0] === dateStr);
      }
      const session = result[0];
      if (!session) return null;
      if (include?.attendances) {
        return { ...session, attendances: attendanceRecords.filter(a => a.sessionId === session.id) };
      }
      return session;
    },
    create: async ({ data }: any) => {
      const session = { 
        id: generateId(), 
        createdAt: new Date(), 
        updatedAt: new Date(),
        date: new Date(data.date || Date.now()),
        classId: data.classId,
        startTime: data.startTime,
        endTime: data.endTime,
        topic: data.topic || null
      };
      sessions.push(session);
      return session;
    },
    delete: async ({ where }: any) => {
      const idx = sessions.findIndex(s => s.id === where.id);
      if (idx === -1) throw new Error('Session not found');
      return sessions.splice(idx, 1)[0];
    },
    deleteMany: async ({ where }: any) => {
      if (where?.classId) {
        const toDelete = sessions.filter(s => s.classId === where.classId);
        sessions = sessions.filter(s => s.classId !== where.classId);
        return { count: toDelete.length };
      }
      const count = sessions.length;
      sessions = [];
      return { count };
    },
  },
  attendance: {
    findUnique: async ({ where }: any) => {
      // Support both studentId_sessionId and sessionId_studentId for flexibility
      const composite = where.studentId_sessionId || where.sessionId_studentId;
      if (composite) {
        return attendanceRecords.find(a => 
          a.sessionId === composite.sessionId && 
          a.studentId === composite.studentId
        ) || null;
      }
      return attendanceRecords.find(a => a.id === where.id) || null;
    },
    findMany: async ({ where, include }: any) => {
      let result = [...attendanceRecords];
      if (where?.sessionId) result = result.filter(a => a.sessionId === where.sessionId);
      if (where?.studentId) result = result.filter(a => a.studentId === where.studentId);
      if (include?.student) {
        result = result.map(a => ({
          ...a,
          student: students.find(s => s.id === a.studentId)
        }));
      }
      return result;
    },
    create: async ({ data, include }: any) => {
      const att = { id: generateId(), createdAt: new Date(), updatedAt: new Date(), markedAt: new Date(), ...data };
      attendanceRecords.push(att);
      if (include?.student) {
        return { ...att, student: students.find(s => s.id === att.studentId) };
      }
      return att;
    },
    upsert: async ({ where, create, update, include }: any) => {
      const composite = where.studentId_sessionId || where.sessionId_studentId;
      const existing = attendanceRecords.find(a => 
        a.sessionId === composite.sessionId && 
        a.studentId === composite.studentId
      );
      if (existing) {
        Object.assign(existing, update, { updatedAt: new Date() });
        if (include?.student) {
          return { ...existing, student: students.find(s => s.id === existing.studentId) };
        }
        return existing;
      }
      const att = { id: generateId(), createdAt: new Date(), updatedAt: new Date(), markedAt: new Date(), ...create };
      attendanceRecords.push(att);
      if (include?.student) {
        return { ...att, student: students.find(s => s.id === att.studentId) };
      }
      return att;
    },
    update: async ({ where, data }: any) => {
      let att;
      const composite = where.studentId_sessionId || where.sessionId_studentId;
      if (composite) {
        att = attendanceRecords.find(a => 
          a.sessionId === composite.sessionId && 
          a.studentId === composite.studentId
        );
      } else {
        att = attendanceRecords.find(a => a.id === where.id);
      }
      if (!att) throw new Error('Attendance not found');
      Object.assign(att, data, { updatedAt: new Date() });
      return att;
    },
    deleteMany: async ({ where }: any) => {
      if (where?.sessionId) {
        const toDelete = attendanceRecords.filter(a => a.sessionId === where.sessionId);
        attendanceRecords = attendanceRecords.filter(a => a.sessionId !== where.sessionId);
        return { count: toDelete.length };
      }
      const count = attendanceRecords.length;
      attendanceRecords = [];
      return { count };
    },
  },
  $connect: async () => {},
  $disconnect: async () => {},
  $transaction: async (fn: any) => {
    if (Array.isArray(fn)) {
      return Promise.all(fn);
    }
    return fn(mockPrisma);
  },
};

export const prisma = mockPrisma;
export default mockPrisma;
