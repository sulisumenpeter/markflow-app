'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { use } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

export default function ResultsPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId: examIdStr } = use(params);
  const examId = parseInt(examIdStr, 10);

  const exam = useLiveQuery(() => db.exams.get(examId));
  
  // Fetch joined data
  const results = useLiveQuery(async () => {
    if (!examId) return [];
    
    // Get exam roster, ordered by orderIndex
    const roster = await db.examStudents.where({ examId }).sortBy('orderIndex');
    
    // Get all students and map by id for quick lookup
    const allStudents = await db.students.toArray();
    const studentMap = new Map(allStudents.map(s => [s.studentId, s]));
    
    // Get all scores for this exam
    const allScores = await db.scores.where({ examId }).toArray();
    const scoreMap = new Map(allScores.map(s => [s.studentId, s]));
    
    return roster.map((rosterItem, index) => {
      const student = studentMap.get(rosterItem.studentId);
      const scoreObj = scoreMap.get(rosterItem.studentId);
      
      return {
        sn: index + 1,
        studentId: rosterItem.studentId,
        fullName: student?.fullName || 'Unknown',
        department: student?.department || '',
        level: student?.level || '',
        testScore: scoreObj !== undefined ? scoreObj.testScore : null,
        examScore: scoreObj !== undefined ? scoreObj.examScore : null,
        totalScore: scoreObj !== undefined ? scoreObj.totalScore : null,
        grade: scoreObj !== undefined ? scoreObj.grade : null,
        remark: scoreObj !== undefined ? scoreObj.remark : null,
        status: scoreObj !== undefined ? 'Recorded' : 'Missing'
      };
    });
  }, [examId]);

  const handleExport = () => {
    if (!exam || !results) return;
    
    const ws = XLSX.utils.aoa_to_sheet([]);
    
    // Add Headers
    XLSX.utils.sheet_add_aoa(ws, [
      ['', '', exam.institution || 'TARABA STATE UNIVERSITY, JALINGO'],
      ['', '', exam.faculty || 'FACULTY OF MANAGEMENT SCIENCES'],
      ['', '', exam.department || 'DEPARTMENT OF ACCOUNTING'],
      ['', '', `RESULT SHEET ${exam.session || '2025/2026 ACADEMIC SESSION'}`],
      ['', '', `${exam.courseTitle} ${exam.courseCode}`],
    ], { origin: 'A1' });
    
    // Add Data Table Headers
    XLSX.utils.sheet_add_aoa(ws, [
      ['S/N', 'REGISTRATION NUMBER', 'TEST', 'EXAMS', 'TOTAL', 'GRADE', 'REMARKS']
    ], { origin: 'A6' });
    
    // Add Data
    const dataForExcel = results.map(r => [
      r.sn,
      r.studentId,
      r.testScore !== null ? r.testScore : '',
      r.examScore !== null ? r.examScore : '',
      r.totalScore !== null ? r.totalScore : '',
      r.grade !== null ? r.grade : '',
      r.remark !== null ? r.remark : ''
    ]);
    XLSX.utils.sheet_add_aoa(ws, dataForExcel, { origin: 'A7' });
    
    // Calculate Summary
    const grades = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    let totalGrades = 0;
    for (const r of results) {
      if (r.grade && r.grade in grades) {
        grades[r.grade as keyof typeof grades]++;
        totalGrades++;
      }
    }
    
    const summaryRowStart = 7 + results.length + 2;
    XLSX.utils.sheet_add_aoa(ws, [
      ['GRADE', 'NUMBER', 'PERCENTAGE'],
      ['A', grades.A, totalGrades ? Math.round((grades.A / totalGrades) * 100) : 0],
      ['B', grades.B, totalGrades ? Math.round((grades.B / totalGrades) * 100) : 0],
      ['C', grades.C, totalGrades ? Math.round((grades.C / totalGrades) * 100) : 0],
      ['D', grades.D, totalGrades ? Math.round((grades.D / totalGrades) * 100) : 0],
      ['E', grades.E, totalGrades ? Math.round((grades.E / totalGrades) * 100) : 0],
      ['F', grades.F, totalGrades ? Math.round((grades.F / totalGrades) * 100) : 0],
      ['TOTAL', totalGrades, 100]
    ], { origin: `B${summaryRowStart}` });
    
    // Add Signature Blocks
    const sigRowStart = summaryRowStart + 9;
    XLSX.utils.sheet_add_aoa(ws, [
      ['Lecturer\'s name: '],
      ['Sign:...................................', 'Date:...................................'],
      [],
      ['HOD'],
      ['Sign:...................................', 'Date:...................................']
    ], { origin: `B${sigRowStart}` });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    
    const filename = `${exam.courseCode}_Results_${exam.session.replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  if (!exam) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{exam.courseCode} Results {exam.assessmentName ? `- ${exam.assessmentName}` : ''}</h1>
          <p className="text-gray-600 mt-1">
            <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2 align-middle">{exam.assessmentType || 'EXAM'}</span>
            {exam.courseTitle} - {exam.session}
          </p>
        </div>
        <div className="flex space-x-3">
          <Link href={`/record/${examId}`} className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border text-center">
            Continue Recording
          </Link>
          <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow text-center">
            Export to Excel
          </button>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S/N</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exams</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results?.map(r => (
              <tr key={r.studentId} className={r.totalScore === null ? 'bg-red-50' : ''}>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{r.sn}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{r.studentId}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{r.fullName}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">{r.testScore !== null ? r.testScore : '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">{r.examScore !== null ? r.examScore : '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">{r.totalScore !== null ? r.totalScore : '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">{r.grade !== null ? r.grade : '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">{r.remark !== null ? r.remark : '-'}</td>
              </tr>
            ))}
            {results?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-center text-gray-500">No students enrolled in this assessment.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
