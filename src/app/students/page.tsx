'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import Link from 'next/link';
import { useState } from 'react';

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const students = useLiveQuery(
    () => db.students
      .filter(s => s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) || s.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
      .limit(100)
      .toArray(),
    [searchTerm]
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Students</h1>
        <Link href="/students/import" className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">
          Import Students
        </Link>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <input 
          type="text" 
          placeholder="Search by ID or Name..." 
          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 mb-4 border"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students?.map(s => (
                <tr key={s.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.studentId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.fullName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.level}</td>
                </tr>
              ))}
              {students?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No students found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
