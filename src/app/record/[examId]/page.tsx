'use client';

import { useState, useRef, useEffect, use } from 'react';
import { db, Exam, Student, Score } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';

export default function RecordScoresPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId: examIdStr } = use(params);
  const examId = parseInt(examIdStr, 10);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scoreInputRef = useRef<HTMLInputElement>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [scoreInput, setScoreInput] = useState('');
  const [error, setError] = useState('');
  const [existingScore, setExistingScore] = useState<Score | null>(null);
  
  const [lastSaved, setLastSaved] = useState<{
    studentId: string;
    name: string;
    score: number;
    maxScore: number;
  } | null>(null);
  const confirmationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const exam = useLiveQuery(() => db.exams.get(examId));
  const stats = useLiveQuery(async () => {
    const total = await db.examStudents.where({ examId }).count();
    const recorded = await db.scores.where({ examId }).count();
    return { total, recorded, remaining: total - recorded };
  });

  const searchResults = useLiveQuery(async () => {
    if (!searchTerm || selectedStudent) return [];
    
    // Simple fast prefix search using Dexie
    const matchingExamStudents = await db.examStudents
      .where('examId').equals(examId)
      .toArray();
      
    const matchingIds = matchingExamStudents.map(es => es.studentId);
    
    const students = await db.students
      .where('studentId')
      .startsWithIgnoreCase(searchTerm)
      .limit(5)
      .toArray();
      
    // Filter to only those in the exam roster
    return students.filter(s => matchingIds.includes(s.studentId));
  }, [searchTerm, examId, selectedStudent]);

  const recentScores = useLiveQuery(async () => {
    const allScores = await db.scores.where({ examId }).toArray();
    // Sort descending by updatedAt
    allScores.sort((a, b) => b.updatedAt - a.updatedAt);
    const topScores = allScores.slice(0, 10);
    
    // Attach student names to the recent scores
    return Promise.all(
      topScores.map(async (score) => {
        const student = await db.students.where({ studentId: score.studentId }).first();
        return {
          ...score,
          studentName: student?.fullName || 'Unknown Student'
        };
      })
    );
  }, [examId]);

  useEffect(() => {
    // Auto-select if exactly one match
    if (searchResults && searchResults.length === 1 && !selectedStudent) {
      handleSelectStudent(searchResults[0]);
    }
  }, [searchResults, selectedStudent]);

  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setSearchTerm('');
    setError('');
    setLastSaved(null);
    if (confirmationTimeoutRef.current) clearTimeout(confirmationTimeoutRef.current);
    
    // Check if score already exists
    const existing = await db.scores
      .where('examId_studentId')
      .equals(`${examId}_${student.studentId}`)
      .first();
      
    if (existing) {
      setExistingScore(existing);
    } else {
      setExistingScore(null);
    }
    
    setTimeout(() => scoreInputRef.current?.focus(), 50);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchResults && searchResults.length > 0) {
      handleSelectStudent(searchResults[0]);
    }
  };

  const handleScoreKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      await saveScore();
    } else if (e.key === 'Escape') {
      resetState();
    }
  };

  const saveScore = async () => {
    if (!selectedStudent || !exam) return;
    
    const scoreVal = Number(scoreInput);
    if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > exam.maximumScore) {
      setError(`Score must be between 0 and ${exam.maximumScore}`);
      return;
    }
    
    if (existingScore && !window.confirm(`Score already exists (${existingScore.score}). Overwrite with ${scoreVal}?`)) {
      resetState();
      return;
    }

    const now = Date.now();
    try {
      if (existingScore && existingScore.id) {
        await db.scores.update(existingScore.id, {
          score: scoreVal,
          updatedAt: now
        });
      } else {
        await db.scores.add({
          examId,
          studentId: selectedStudent.studentId,
          examId_studentId: `${examId}_${selectedStudent.studentId}`,
          score: scoreVal,
          recordedAt: now,
          updatedAt: now
        });
      }
      
      setLastSaved({
        studentId: selectedStudent.studentId,
        name: selectedStudent.fullName,
        score: scoreVal,
        maxScore: exam.maximumScore
      });
      
      if (confirmationTimeoutRef.current) clearTimeout(confirmationTimeoutRef.current);
      confirmationTimeoutRef.current = setTimeout(() => setLastSaved(null), 5000);
      
      resetState();
    } catch (err) {
      setError('Failed to save score');
    }
  };

  const resetState = () => {
    setSelectedStudent(null);
    setScoreInput('');
    setSearchTerm('');
    setExistingScore(null);
    setError('');
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  if (!exam) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{exam.courseCode}</h1>
          <p className="text-gray-600">{exam.courseTitle} - {exam.session}</p>
        </div>
        <Link href={`/results/${examId}`} className="text-blue-600 hover:underline font-medium">
          View Results &rarr;
        </Link>
      </div>
      
      {/* Progress Bar */}
      {stats && (
        <div className="bg-white p-4 rounded shadow border border-gray-200">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-gray-700">Progress</span>
            <span className="text-gray-500">Recorded: {stats.recorded} / {stats.total} (Remaining: {stats.remaining})</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full transition-all" style={{ width: `${stats.total > 0 ? (stats.recorded / stats.total) * 100 : 0}%` }}></div>
          </div>
        </div>
      )}

      {/* Recording Interface */}
      <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 text-center min-h-[300px] flex flex-col justify-center">
        
        {error && <div className="mb-4 text-red-600 font-medium bg-red-50 p-2 rounded inline-block">{error}</div>}

        {!selectedStudent ? (
          <div className="space-y-4">
            {lastSaved && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-left shadow-sm max-w-lg mx-auto animate-in fade-in duration-300">
                <div className="font-bold text-green-800 mb-2 text-lg">✅ Score Recorded</div>
                <div className="text-sm text-green-900 grid grid-cols-2 gap-y-2 gap-x-4">
                  <div><span className="font-semibold">Student ID:</span> {lastSaved.studentId}</div>
                  <div><span className="font-semibold">Name:</span> {lastSaved.name}</div>
                  <div><span className="font-semibold">Score:</span> <span className="font-bold text-lg">{lastSaved.score} / {lastSaved.maxScore}</span></div>
                  <div><span className="font-semibold">Status:</span> Saved</div>
                </div>
              </div>
            )}
            <h2 className="text-xl font-medium text-gray-700 mb-4">Search Student to Record</h2>
            <input
              ref={searchInputRef}
              type="text"
              autoFocus
              placeholder="Enter Student ID (e.g. CSC/20/...)"
              className="text-center text-2xl w-full max-w-lg border-2 border-blue-300 rounded-lg p-4 shadow-inner focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mx-auto block"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            {searchResults && searchResults.length > 0 && (
              <div className="mt-4 max-w-lg mx-auto bg-gray-50 border rounded-lg overflow-hidden text-left shadow-sm">
                {searchResults.map((s, i) => (
                  <div 
                    key={s.id} 
                    className={`p-3 cursor-pointer hover:bg-blue-50 border-b last:border-0 ${i === 0 ? 'bg-blue-50/50' : ''}`}
                    onClick={() => handleSelectStudent(s)}
                  >
                    <div className="font-bold text-gray-900">{s.studentId}</div>
                    <div className="text-sm text-gray-600">{s.fullName}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 max-w-lg mx-auto">
              <h2 className="text-3xl font-bold text-gray-900">{selectedStudent.studentId}</h2>
              <p className="text-lg text-gray-700 mt-2">{selectedStudent.fullName}</p>
            </div>

            {existingScore && (
              <div className="bg-yellow-100 text-yellow-800 p-3 rounded-lg inline-block font-medium">
                Warning: Score already recorded as {existingScore.score}
              </div>
            )}

            <div>
              <label className="block text-gray-600 font-medium mb-2">Enter Score (Max: {exam.maximumScore})</label>
              <input
                ref={scoreInputRef}
                type="number"
                min="0"
                max={exam.maximumScore}
                className="text-center text-4xl w-48 border-2 border-green-400 rounded-lg p-4 shadow-inner focus:outline-none focus:border-green-600 mx-auto block"
                value={scoreInput}
                onChange={(e) => setScoreInput(e.target.value)}
                onKeyDown={handleScoreKeyDown}
              />
            </div>
            
            <div className="flex justify-center space-x-4 pt-4">
              <button onClick={resetState} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Cancel (Esc)
              </button>
              <button onClick={saveScore} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                Save Score (Enter)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recent Scores */}
      {recentScores && recentScores.length > 0 && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Scores</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recorded Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {recentScores.map(score => (
                  <tr key={score.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{score.studentId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{score.studentName}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">{score.score}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {new Date(score.updatedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
