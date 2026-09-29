'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { useRouter } from 'next/navigation';

export default function ImportStudents() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const router = useRouter();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Read as array of arrays to parse specific cells
        const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        const institution = aoa[0]?.[2] || 'TARABA STATE UNIVERSITY, JALINGO';
        const faculty = aoa[1]?.[2] || '';
        const department = aoa[2]?.[2] || '';
        const sessionStr = String(aoa[3]?.[2] || '');
        const session = sessionStr.replace('RESULT SHEET ', '').trim();
        
        const courseStr = String(aoa[4]?.[2] || '');
        const lastSpace = courseStr.lastIndexOf(' ');
        const courseTitle = lastSpace !== -1 ? courseStr.substring(0, lastSpace).trim() : courseStr;
        const courseCode = lastSpace !== -1 ? courseStr.substring(lastSpace + 1).trim() : '';

        const studentsData = [];
        for (let i = 6; i < aoa.length; i++) {
          const row = aoa[i];
          if (!row || row.length === 0 || row[0] === undefined || row[0] === '' || String(row[0]).includes('GRADE') || String(row[0]).includes('Lecturer')) {
            break; // Stop parsing at empty row or footer
          }
          
          const regNo = String(row[1] || '').trim();
          if (regNo) {
            studentsData.push({
              sn: row[0],
              regNo,
              test: Number(row[2]) || 0,
              exam: Number(row[3]) || 0,
              total: Number(row[4]) || 0,
              grade: String(row[5] || '').trim(),
              remark: String(row[6] || '').trim()
            });
          }
        }
        
        setPreview({
          metadata: { institution, faculty, department, session, courseTitle, courseCode },
          studentsData: studentsData.slice(0, 5),
          totalRows: studentsData.length,
          allData: studentsData
        });
        setError('');
      } catch (err) {
        setError('Failed to read Excel file. Please ensure it is valid.');
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const handleImport = async () => {
    if (!preview || !preview.allData) return;
    setImporting(true);
    
    try {
      const now = Date.now();
      
      await db.transaction('rw', db.exams, db.students, db.examStudents, db.scores, async () => {
        // 1. Find or create exam
        let exam = await db.exams.where({ courseCode: preview.metadata.courseCode }).first();
        let examId = exam?.id;
        
        if (!exam) {
          examId = await db.exams.add({
            institution: preview.metadata.institution,
            faculty: preview.metadata.faculty,
            department: preview.metadata.department,
            courseCode: preview.metadata.courseCode,
            courseTitle: preview.metadata.courseTitle,
            session: preview.metadata.session,
            semester: '1st', // Default fallback
            assessmentType: 'EXAM',
            maximumScore: 100,
            createdAt: now,
            updatedAt: now
          });
        } else {
          // Optionally update existing exam metadata
          await db.exams.update(examId!, {
            institution: preview.metadata.institution,
            faculty: preview.metadata.faculty,
            department: preview.metadata.department,
            courseTitle: preview.metadata.courseTitle,
            session: preview.metadata.session,
            updatedAt: now
          });
        }
        
        // 2. Add students & scores
        let orderIndexCounter = (await db.examStudents.where({ examId: examId! }).count()) || 0;
        
        for (const row of preview.allData) {
          // Check if student exists
          let student = await db.students.where('studentId').equals(row.regNo).first();
          if (!student) {
            await db.students.add({
              studentId: row.regNo,
              fullName: 'Imported Student', // Default since name is not in the excel
              department: preview.metadata.department,
              level: '',
              programme: '',
              createdAt: now,
              updatedAt: now
            });
          }
          
          // Link student to exam if not already
          const examStudent = await db.examStudents.where({ examId_studentId: `${examId}_${row.regNo}` }).first();
          if (!examStudent) {
            await db.examStudents.add({
              examId: examId!,
              studentId: row.regNo,
              examId_studentId: `${examId}_${row.regNo}`,
              orderIndex: orderIndexCounter++
            });
          }
          
          // Add or update score
          const score = await db.scores.where({ examId_studentId: `${examId}_${row.regNo}` }).first();
          if (score && score.id) {
            await db.scores.update(score.id, {
              testScore: row.test,
              examScore: row.exam,
              totalScore: row.total,
              grade: row.grade,
              remark: row.remark,
              updatedAt: now
            });
          } else {
            await db.scores.add({
              examId: examId!,
              studentId: row.regNo,
              examId_studentId: `${examId}_${row.regNo}`,
              testScore: row.test,
              examScore: row.exam,
              totalScore: row.total,
              grade: row.grade,
              remark: row.remark,
              recordedAt: now,
              updatedAt: now
            });
          }
        }
      });
      
      router.push('/exams');
    } catch (err) {
      setError('Import failed: ' + (err as Error).message);
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900">Import Result Sheet</h1>
      
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <p className="mb-4 text-gray-600">Upload a Taraba State University Result Sheet (.xlsx) to import course metadata, students, and scores.</p>
        
        <input 
          type="file" 
          accept=".xlsx, .xls, .csv" 
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />

        {error && <p className="text-red-500 mt-4">{error}</p>}

        {preview && (
          <div className="mt-8 space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Parsed Metadata</h3>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded border text-sm text-gray-700">
              <div><strong>Institution:</strong> {preview.metadata.institution}</div>
              <div><strong>Faculty:</strong> {preview.metadata.faculty}</div>
              <div><strong>Department:</strong> {preview.metadata.department}</div>
              <div><strong>Session:</strong> {preview.metadata.session}</div>
              <div><strong>Course Code:</strong> {preview.metadata.courseCode}</div>
              <div><strong>Course Title:</strong> {preview.metadata.courseTitle}</div>
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2 mt-6">Preview (First 5 of {preview.totalRows} records)</h3>
            <div className="overflow-x-auto bg-gray-50 p-4 rounded border">
              <pre className="text-xs text-gray-700">{JSON.stringify(preview.studentsData, null, 2)}</pre>
            </div>
            
            <button 
              onClick={handleImport}
              disabled={importing}
              className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-blue-300"
            >
              {importing ? 'Importing...' : 'Confirm & Import Data'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
