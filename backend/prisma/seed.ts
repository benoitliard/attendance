import { PrismaClient, AttendanceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@attendance.app' },
    update: {},
    create: {
      email: 'admin@attendance.app',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });
  console.log('✅ Created admin:', admin.email);

  // Create teacher user
  const teacherPassword = await bcrypt.hash('teacher123', 12);
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@attendance.app' },
    update: {},
    create: {
      email: 'teacher@attendance.app',
      password: teacherPassword,
      name: 'Marie Dupont',
      role: 'TEACHER',
    },
  });
  console.log('✅ Created teacher:', teacher.email);

  // Create classes
  const classes = await Promise.all([
    prisma.class.upsert({
      where: { code: 'INFO-101' },
      update: {},
      create: {
        name: 'Introduction à la Programmation',
        code: 'INFO-101',
        teacherId: teacher.id,
      },
    }),
    prisma.class.upsert({
      where: { code: 'INFO-201' },
      update: {},
      create: {
        name: 'Structures de Données',
        code: 'INFO-201',
        teacherId: teacher.id,
      },
    }),
    prisma.class.upsert({
      where: { code: 'WEB-101' },
      update: {},
      create: {
        name: 'Développement Web',
        code: 'WEB-101',
        teacherId: admin.id,
      },
    }),
  ]);
  console.log('✅ Created', classes.length, 'classes');

  // Create students
  const studentData = [
    { firstName: 'Alice', lastName: 'Martin', studentId: 'STU001' },
    { firstName: 'Bob', lastName: 'Bernard', studentId: 'STU002' },
    { firstName: 'Charlie', lastName: 'Petit', studentId: 'STU003' },
    { firstName: 'Diana', lastName: 'Durand', studentId: 'STU004' },
    { firstName: 'Eve', lastName: 'Thomas', studentId: 'STU005' },
    { firstName: 'Frank', lastName: 'Robert', studentId: 'STU006' },
    { firstName: 'Grace', lastName: 'Richard', studentId: 'STU007' },
    { firstName: 'Henry', lastName: 'Michel', studentId: 'STU008' },
    { firstName: 'Iris', lastName: 'Garcia', studentId: 'STU009' },
    { firstName: 'Jack', lastName: 'Martinez', studentId: 'STU010' },
    { firstName: 'Kate', lastName: 'Lopez', studentId: 'STU011' },
    { firstName: 'Leo', lastName: 'Gonzalez', studentId: 'STU012' },
    { firstName: 'Mia', lastName: 'Wilson', studentId: 'STU013' },
    { firstName: 'Noah', lastName: 'Anderson', studentId: 'STU014' },
    { firstName: 'Olivia', lastName: 'Taylor', studentId: 'STU015' },
  ];

  const students: any[] = [];
  for (const data of studentData) {
    const student = await prisma.student.upsert({
      where: { studentId: data.studentId },
      update: {},
      create: {
        ...data,
        email: `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}@student.edu`,
        classId: classes[Math.floor(Math.random() * classes.length)].id,
      },
    });
    students.push(student);
  }
  console.log('✅ Created', students.length, 'students');

  // Create sessions for the past 2 weeks
  const sessions: any[] = [];
  for (const classRecord of classes) {
    for (let i = 0; i < 10; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i * 2 - Math.floor(Math.random() * 3));
      date.setHours(9 + Math.floor(Math.random() * 6), 0, 0, 0);

      const session = await prisma.session.create({
        data: {
          classId: classRecord.id,
          date,
          startTime: `${date.getHours()}:00`,
          endTime: `${date.getHours() + 2}:00`,
          topic: ['Variables & Types', 'Boucles', 'Fonctions', 'Classes', 'POO', 'HTML', 'CSS', 'JavaScript'][
            Math.floor(Math.random() * 8)
          ],
        },
      });
      sessions.push(session);
    }
  }
  console.log('✅ Created', sessions.length, 'sessions');

  // Create attendance records
  const statuses: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
  const weights = [0.75, 0.1, 0.1, 0.05]; // 75% present, 10% absent, 10% late, 5% excused

  let attendanceCount = 0;
  for (const session of sessions) {
    const classStudents = students.filter(s => s.classId === session.classId);
    
    for (const student of classStudents) {
      const rand = Math.random();
      let cumulative = 0;
      let status: AttendanceStatus = 'PRESENT';
      
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (rand < cumulative) {
          status = statuses[i];
          break;
        }
      }

      await prisma.attendance.create({
        data: {
          studentId: student.id,
          sessionId: session.id,
          status,
          notes: status === 'EXCUSED' ? 'Justificatif médical' : 
                 status === 'LATE' ? `Arrivé à ${9 + Math.floor(Math.random() * 2)}:${15 + Math.floor(Math.random() * 30)}` : 
                 undefined,
        },
      });
      attendanceCount++;
    }
  }
  console.log('✅ Created', attendanceCount, 'attendance records');

  console.log('\n🎉 Seeding completed!');
  console.log('\n📋 Test accounts:');
  console.log('   Admin: admin@attendance.app / admin123');
  console.log('   Teacher: teacher@attendance.app / teacher123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
