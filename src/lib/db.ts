import Dexie, { type Table } from 'dexie';

export interface Student {
  id?: number;
  studentId: string;
  fullName: string;
  department: string;
  level: string;
  programme: string;
  createdAt: number;
  updatedAt: number;
}

export interface Exam {
  id?: number;
  assessmentType?: 'EXAM' | 'TEST' | 'ASSIGNMENT';
  assessmentName?: string;
  courseCode: string;
  courseTitle: string;
  session: string;
  semester: string;
  maximumScore: number;
  createdAt: number;
  updatedAt: number;
}

export interface ExamStudent {
  id?: number;
  examId: number;
  studentId: string;
  examId_studentId: string; // compound index representation since dexie compound indexes work via arrays [examId+studentId] 
  orderIndex: number;
}

export interface Score {
  id?: number;
  examId: number;
  studentId: string;
  examId_studentId: string;
  score: number;
  recordedAt: number;
  updatedAt: number;
}

export class MarkFlowDB extends Dexie {
  students!: Table<Student, number>;
  exams!: Table<Exam, number>;
  examStudents!: Table<ExamStudent, number>;
  scores!: Table<Score, number>;

  constructor() {
    super('MarkFlowDB');
    this.version(1).stores({
      students: '++id, &studentId, fullName, department, level, programme, createdAt, updatedAt',
      exams: '++id, courseCode, courseTitle, session, semester, maximumScore, createdAt, updatedAt',
      examStudents: '++id, examId, studentId, [examId+studentId], orderIndex',
      scores: '++id, examId, studentId, [examId+studentId], score, recordedAt, updatedAt'
    });
    
    this.version(2).stores({
      students: '++id, &studentId, fullName, department, level, programme, createdAt, updatedAt',
      exams: '++id, assessmentType, courseCode, courseTitle, session, semester, maximumScore, createdAt, updatedAt',
      examStudents: '++id, examId, studentId, [examId+studentId], orderIndex',
      scores: '++id, examId, studentId, [examId+studentId], score, recordedAt, updatedAt'
    }).upgrade(tx => {
      return tx.table('exams').toCollection().modify(exam => {
        if (!exam.assessmentType) {
          exam.assessmentType = 'EXAM';
        }
      });
    });
  }
}

export const db = new MarkFlowDB();
