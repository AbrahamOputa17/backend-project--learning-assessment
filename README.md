# Learning Assessment System — Backend

A production-ready Node.js/Express backend for the Learning Assessment System.

## Features

- 🔐 JWT Authentication (register, login, profile management)
- 📚 Course Management (create, update, enrol)
- 📝 Quiz System (MCQ, true/false, short answer with auto-grading)
- 💻 Coding Assessment (code submission and execution against test cases)
- 🛡️ Role-based access control (student, instructor, admin)
- 🗄️ PostgreSQL database with a complete schema

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Validation**: express-validator
- **Logging**: Winston + Morgan

## Prerequisites

- Node.js 18+
- PostgreSQL 13+

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your database credentials and JWT secret
```

### 3. Create the database

```sql
createdb learning_assessment
```

### 4. Run the database schema

```bash
npm run db:init
# or manually:
psql -U postgres -d learning_assessment -f src/database/schema.sql
```

### 5. Start the development server

```bash
npm run dev
```

The server starts at **http://localhost:5000**.

## API Endpoints

### Auth — `/api/auth`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login |
| GET | `/profile` | Get profile (protected) |
| PATCH | `/profile` | Update profile (protected) |
| PATCH | `/change-password` | Change password (protected) |

### Courses — `/api/courses`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List published courses |
| GET | `/enrolled` | My enrolled courses |
| GET | `/mine` | Instructor's own courses |
| GET | `/:id` | Get course details |
| POST | `/` | Create course (instructor) |
| PATCH | `/:id` | Update course (instructor) |
| DELETE | `/:id` | Delete course (instructor) |
| POST | `/:id/enroll` | Enrol in a course |

### Quizzes — `/api/quizzes`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/course/:courseId` | Quizzes for a course |
| GET | `/:quizId` | Get quiz with questions |
| POST | `/course/:courseId` | Create quiz (instructor) |
| PATCH | `/:quizId` | Update quiz (instructor) |
| DELETE | `/:quizId` | Delete quiz (instructor) |
| POST | `/:quizId/questions` | Add question (instructor) |
| POST | `/:quizId/attempt` | Start attempt |
| POST | `/attempts/:attemptId/submit` | Submit answers |
| GET | `/:quizId/attempts` | Attempt history |

### Coding — `/api/coding`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/languages` | Supported languages |
| GET | `/quizzes/course/:courseId` | Coding quizzes for course |
| GET | `/quizzes/:quizId` | Get coding quiz |
| GET | `/questions/:questionId` | Get coding question |
| POST | `/quizzes/course/:courseId` | Create coding quiz (instructor) |
| PATCH | `/quizzes/:quizId` | Update coding quiz (instructor) |
| DELETE | `/quizzes/:quizId` | Delete coding quiz (instructor) |
| POST | `/quizzes/:quizId/questions` | Add coding question (instructor) |
| POST | `/submissions` | Submit code |
| GET | `/submissions/:submissionId/results` | Get submission results |
| GET | `/submissions/history/:questionId` | Submission history |

## Project Structure

```
backend/
├── src/
│   ├── index.js              # Server entry point
│   ├── config/
│   │   ├── index.js          # App config (env vars)
│   │   └── database.js       # PostgreSQL pool
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication guard
│   │   ├── errorHandler.js   # Global error handler
│   │   └── validate.js       # Request validation runner
│   ├── models/
│   │   ├── User.js
│   │   ├── Course.js
│   │   ├── Quiz.js
│   │   └── CodingAssessment.js
│   ├── services/
│   │   ├── authService.js
│   │   ├── courseService.js
│   │   ├── quizService.js
│   │   └── codingService.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── courseController.js
│   │   ├── quizController.js
│   │   └── codingController.js
│   ├── routes/
│   │   ├── index.js          # Route aggregator
│   │   ├── auth.js
│   │   ├── courses.js
│   │   ├── quizzes.js
│   │   └── coding.js
│   ├── utils/
│   │   ├── AppError.js       # Custom error class
│   │   ├── jwt.js            # JWT helpers
│   │   └── logger.js         # Winston logger
│   └── database/
│       └── schema.sql        # Full PostgreSQL schema
├── .env.example
├── .gitignore
└── package.json
```
