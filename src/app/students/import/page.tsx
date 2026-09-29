'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { useRouter } from 'next/navigation';

export default function ImportStudents() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
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
        const data = XLSX.utils.sheet_to_json(ws);
        setPreview(data.slice(0, 5)); // show first 5
        setError('');
      } catch (err) {
        setError('Failed to read Excel file. Please ensure it is valid.');
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data: any[] = XLSX.utils.sheet_to_json(ws);
          
          const now = Date.now();
          const students = data.map(row => ({
            studentId: String(row['Student ID'] || row['studentId'] || '').trim(),
            fullName: String(row['Name'] || row['fullName'] || row['Full Name'] || '').trim(),
            department: String(row['Department'] || row['department'] || '').trim(),
            level: String(row['Level'] || row['level'] || '').trim(),
            programme: String(row['Programme'] || row['programme'] || '').trim(),
            createdAt: now,
            updatedAt: now,
          })).filter(s => s.studentId && s.fullName);

          await db.transaction('rw', db.students, async () => {
            for (const student of students) {
              const existing = await db.students.where('studentId').equals(student.studentId).first();
              if (!existing) {
                await db.students.add(student);
              }
            }
          });
          
          router.push('/students');
        } catch (err) {
          setError('Import failed: ' + (err as Error).message);
          setImporting(false);
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      setError('Import failed: ' + (err as Error).message);
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900">Import Students</h1>
      
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <p className="mb-4 text-gray-600">Upload an Excel file (.xlsx) with columns: <strong>Student ID, Name, Department, Level, Programme</strong>.</p>
        
        <input 
          type="file" 
          accept=".xlsx, .xls, .csv" 
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />

        {error && <p className="text-red-500 mt-4">{error}</p>}

        {preview.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Preview (First 5 rows)</h3>
            <div className="overflow-x-auto bg-gray-50 p-4 rounded border">
              <pre className="text-xs text-gray-700">{JSON.stringify(preview, null, 2)}</pre>
            </div>
            
            <button 
              onClick={handleImport}
              disabled={importing}
              className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-blue-300"
            >
              {importing ? 'Importing...' : 'Confirm & Import All'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
