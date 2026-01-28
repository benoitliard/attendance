# 🎓 Attendance Tracker

**Modern student attendance tracking system with Apple Glass design**

*Système de suivi des présences avec design Apple Glass moderne*

---

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

## 📱 Screenshots

<p align="center">
  <img src="screenshots/web-dashboard.png" width="600" alt="Dashboard" />
</p>
<p align="center"><em>Web Dashboard - Overview</em></p>

<p align="center">
  <img src="screenshots/web-attendance.png" width="600" alt="Attendance Grid" />
</p>
<p align="center"><em>Attendance Grid - Mark presence</em></p>

<p align="center">
  <img src="screenshots/mobile-home.png" width="250" alt="Mobile App" />
  <img src="screenshots/mobile-list.png" width="250" alt="Mobile List" />
</p>
<p align="center"><em>Mobile App - Quick attendance</em></p>

## ✨ Features

### Web Dashboard (Admin/Teacher)
- 📊 **Dashboard** - Overview with stats and charts
- 👥 **Student Management** - CRUD with CSV import
- 📚 **Class Management** - Create and manage classes
- ✅ **Attendance Grid** - Interactive presence marking
- 📈 **Reports** - Attendance rates, trends, exports
- 🔔 **Notifications** - Alerts for repeated absences
- 📤 **Export** - PDF and Excel reports

### Mobile App (Teacher)
- 🚀 **Quick Attendance** - Swipe to mark
- 📋 **Class List** - View students
- 📅 **History** - Daily attendance log
- 🔔 **Push Notifications**

## 🏗️ Architecture

```
attendance/
├── backend/          # Node.js + Express + Prisma
│   ├── src/
│   │   ├── routes/   # API endpoints
│   │   ├── middleware/
│   │   └── services/
│   ├── prisma/       # Database schema
│   └── docker-compose.yml
├── web/              # Next.js 14 (App Router)
│   ├── app/
│   │   ├── (auth)/   # Login, Register
│   │   └── (dashboard)/
│   └── components/   # Glass UI components
└── mobile/           # React Native Expo
    ├── app/          # Expo Router
    └── components/
```

## 🗄️ Database Schema

```mermaid
erDiagram
    User ||--o{ Class : teaches
    Class ||--o{ Student : contains
    Class ||--o{ Session : has
    Session ||--o{ Attendance : records
    Student ||--o{ Attendance : has

    User {
        string id PK
        string email UK
        string password
        string name
        enum role
    }
    
    Student {
        string id PK
        string firstName
        string lastName
        string studentId UK
        string classId FK
    }
    
    Class {
        string id PK
        string name
        string code UK
        string teacherId FK
    }
    
    Session {
        string id PK
        datetime date
        string startTime
        string endTime
        string classId FK
    }
    
    Attendance {
        string id PK
        string studentId FK
        string sessionId FK
        enum status
        string notes
    }
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- npm or yarn

### 1. Clone & Setup

```bash
git clone https://github.com/bendudebot/attendance.git
cd attendance
```

### 2. Start Database

```bash
cd backend
docker-compose up -d db
```

### 3. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma db seed  # Optional: seed data
npm run dev
```

### 4. Setup Web

```bash
cd web
npm install
npm run dev
```

### 5. Setup Mobile

```bash
cd mobile
npm install
npx expo start
```

## 🔧 Environment Variables

### Backend (.env)
```env
DATABASE_URL="postgresql://attendance:attendance123@localhost:5432/attendance"
JWT_SECRET="your-secret-key-here"
PORT=3001
```

### Web (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login |
| GET | `/students` | List students |
| POST | `/students` | Create student |
| GET | `/classes` | List classes |
| POST | `/classes` | Create class |
| GET | `/sessions` | List sessions |
| POST | `/sessions` | Create session |
| POST | `/attendance` | Mark attendance |
| GET | `/attendance/:sessionId` | Get session attendance |
| GET | `/reports/class/:id` | Class attendance report |

## 🎨 Design System

Apple Glass design with:
- `backdrop-filter: blur(20px)`
- `rgba(255, 255, 255, 0.7)` backgrounds
- Soft shadows
- 16-20px border radius
- Status colors:
  - 🟢 Present: `#10B981`
  - 🟡 Late: `#F59E0B`
  - 🔴 Absent: `#EF4444`
  - ⚪ Excused: `#6B7280`

## 🐳 Docker Deployment

```bash
cd backend
docker-compose up -d
```

This starts:
- PostgreSQL database (port 5432)
- API server (port 3001)

## 📄 License

MIT License

---

Built with 💙 for educators.
