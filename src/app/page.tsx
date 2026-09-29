'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import Link from 'next/link';

export default function Dashboard() {
  const studentsCount = useLiveQuery(() => db.students.count()) || 0;
  const examsCount = useLiveQuery(() => db.exams.count()) || 0;
  const exams = useLiveQuery(() => db.exams.toArray()) || [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700">Total Students</h2>
          <p className="text-4xl font-bold text-blue-600 mt-2">{studentsCount}</p>
          <div className="mt-4">
            <Link href="/students" className="text-blue-500 hover:underline">View Students</Link>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700">Total Exams</h2>
          <p className="text-4xl font-bold text-blue-600 mt-2">{examsCount}</p>
          <div className="mt-4">
            <Link href="/exams" className="text-blue-500 hover:underline">Manage Exams</Link>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Recent Exams</h2>
        {exams.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {exams.map(exam => (
              <li key={exam.id} className="py-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{exam.courseCode} - {exam.courseTitle}</p>
                  <p className="text-sm text-gray-500">{exam.session} | {exam.semester}</p>
                </div>
                <div className="flex space-x-2">
                  <Link href={`/record/${exam.id}`} className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm">
                    Record Scores
                  </Link>
                  <Link href={`/results/${exam.id}`} className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm">
                    Results
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No exams created yet.</p>
        )}
      </div>
    </div>
  );
}
