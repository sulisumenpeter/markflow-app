'use client';

import { useState } from 'react';
import { db } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';

export default function NewAssignmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const studentCount = useLiveQuery(() => db.students.count());

  const [formData, setFormData] = useState({
    institution: 'TARABA STATE UNIVERSITY, JALINGO',
    faculty: '',
    department: '',
    courseCode: '',
    courseTitle: '',
    assessmentName: '',
    assessmentType: 'ASSIGNMENT',
    session: '',
    semester: '1st',
    maximumScore: 100
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCount) {
      alert("Please import students before creating an assignment.");
      return;
    }
    
    setLoading(true);
    try {
      const now = Date.now();
      
      await db.transaction('rw', db.exams, db.students, db.examStudents, async () => {
        const examId = await db.exams.add({
          ...formData,
          assessmentType: formData.assessmentType as "EXAM" | "TEST" | "ASSIGNMENT",
          maximumScore: Number(formData.maximumScore),
          createdAt: now,
          updatedAt: now
        });

        // Take snapshot of students
        const allStudents = await db.students.toArray();
        const examStudents = allStudents.map((student, index) => ({
          examId,
          studentId: student.studentId,
          examId_studentId: `${examId}_${student.studentId}`,
          orderIndex: index
        }));

        await db.examStudents.bulkAdd(examStudents);
      });

      router.push('/assignments');
    } catch (error) {
      alert('Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  if (studentCount === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
        <h2 className="text-xl font-bold mb-2">No Students Found</h2>
        <p>You must import students into the system before creating an assignment.</p>
        <button onClick={() => router.push('/students/import')} className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700">
          Import Students
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Create New Assignment</h1>
      
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Institution</label>
            <input required type="text" value={formData.institution} onChange={e => setFormData({...formData, institution: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" placeholder="e.g. TARABA STATE UNIVERSITY, JALINGO" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Faculty</label>
              <input required type="text" value={formData.faculty} onChange={e => setFormData({...formData, faculty: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" placeholder="e.g. FACULTY OF MANAGEMENT SCIENCES" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Department</label>
              <input required type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" placeholder="e.g. DEPARTMENT OF ACCOUNTING" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Course Code</label>
              <input required type="text" value={formData.courseCode} onChange={e => setFormData({...formData, courseCode: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" placeholder="e.g. ACC203" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Course Title</label>
              <input required type="text" value={formData.courseTitle} onChange={e => setFormData({...formData, courseTitle: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" placeholder="e.g. CORPORATE GOVERNANCE AND ETHICS" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Assignment Name</label>
            <input required type="text" value={formData.assessmentName} onChange={e => setFormData({...formData, assessmentName: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" placeholder="e.g. Assignment 1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Session</label>
              <input required type="text" value={formData.session} onChange={e => setFormData({...formData, session: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" placeholder="e.g. 2025/2026 ACADEMIC SESSION" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Semester</label>
              <select required value={formData.semester} onChange={e => setFormData({...formData, semester: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white">
                <option value="1st">1st Semester</option>
                <option value="2nd">2nd Semester</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Maximum Score</label>
            <input required type="number" min="1" max="100" value={formData.maximumScore} onChange={e => setFormData({...formData, maximumScore: Number(e.target.value)})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
          </div>
          
          <div className="pt-4">
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-blue-300 shadow">
              {loading ? 'Creating...' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
