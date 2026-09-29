'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import Link from 'next/link';

export default function TestsPage() {
  const exams = useLiveQuery(() => db.exams.filter(e => e.assessmentType === 'TEST').toArray()) || [];

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this test? This will delete all associated scores.')) {
      await db.transaction('rw', db.exams, db.examStudents, db.scores, async () => {
        await db.scores.where({ examId: id }).delete();
        await db.examStudents.where({ examId: id }).delete();
        await db.exams.delete(id);
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <h1 className="text-3xl font-bold text-gray-900">Tests</h1>
        <Link href="/tests/new" className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 text-center">
          Create New Test
        </Link>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Score</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {exams.map(exam => (
                <tr key={exam.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {exam.courseCode} - {exam.courseTitle}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exam.assessmentName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exam.session}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exam.semester}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exam.maximumScore}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Link href={`/record/${exam.id}`} className="text-blue-600 hover:text-blue-900">Record</Link>
                    <Link href={`/results/${exam.id}`} className="text-green-600 hover:text-green-900">Results</Link>
                    <button onClick={() => handleDelete(exam.id!)} className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))}
              {exams.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No tests found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
