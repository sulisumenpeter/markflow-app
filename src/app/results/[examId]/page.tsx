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
    const scoreMap = new Map(allScores.map(s => [s.studentId, s.score]));
    
    return roster.map((rosterItem, index) => {
      const student = studentMap.get(rosterItem.studentId);
      const score = scoreMap.get(rosterItem.studentId);
      
      return {
        sn: index + 1,
        studentId: rosterItem.studentId,
        fullName: student?.fullName || 'Unknown',
        department: student?.department || '',
        level: student?.level || '',
        score: score !== undefined ? score : null
      };
    });
  }, [examId]);

  const handleExport = () => {
    if (!exam || !results) return;
    
    const dataForExcel = results.map(r => ({
      'S/N': r.sn,
      'Student ID': r.studentId,
      'Name': r.fullName,
      'Department': r.department,
      'Level': r.level,
      'Score': r.score !== null ? r.score : 'ABS'
    }));

    const ws = XLSX.utils.json_to_sheet(dataForExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    
    const filename = `${exam.courseCode}_Results_${exam.session.replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  if (!exam) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{exam.courseCode} Results</h1>
          <p className="text-gray-600">{exam.courseTitle} - {exam.session}</p>
        </div>
        <div className="space-x-3">
          <Link href={`/record/${examId}`} className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border">
            Continue Recording
          </Link>
          <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow">
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score / {exam.maximumScore}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results?.map(r => (
              <tr key={r.studentId} className={r.score === null ? 'bg-red-50' : ''}>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{r.sn}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{r.studentId}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{r.fullName}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                  {r.score !== null ? r.score : '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {r.score !== null ? (
                    <span className="text-green-600 font-medium">Recorded</span>
                  ) : (
                    <span className="text-red-600 font-medium">Missing</span>
                  )}
                </td>
              </tr>
            ))}
            {results?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-center text-gray-500">No students enrolled in this exam.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
