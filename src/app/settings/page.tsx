'use client';

import { useState } from 'react';
import { db } from '@/lib/db';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleBackup = async () => {
    setLoading(true);
    setMessage('Generating backup...');
    try {
      await import('dexie-export-import');
      const blob = await db.export();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `markflow_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Backup downloaded successfully.');
    } catch (err) {
      console.error(err);
      setMessage('Failed to generate backup.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('WARNING: Restoring a backup will overwrite ALL existing data. Are you sure you want to proceed?')) {
      e.target.value = '';
      return;
    }

    setLoading(true);
    setMessage('Restoring database...');
    try {
      await import('dexie-export-import');
      await db.delete();
      await db.open();
      await db.import(file);
      setMessage('Restore completed successfully. Please refresh the page.');
    } catch (err) {
      console.error(err);
      setMessage('Failed to restore backup. The file might be corrupted.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('DANGER: This will permanently delete all students, exams, tests, assignments, and scores. Type "DELETE" to confirm.')) return;
    
    const conf = window.prompt('Type DELETE to confirm clearing all data');
    if (conf === 'DELETE') {
      setLoading(true);
      setMessage('Clearing database...');
      try {
        await db.delete();
        await db.open();
        setMessage('Database cleared successfully. Please refresh the page.');
      } catch (err) {
        console.error(err);
        setMessage('Failed to clear database.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
      
      {message && (
        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg font-medium">
          {message}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Backup Data</h2>
          <p className="text-gray-600 mb-4 text-sm">Download a complete backup of all students, exams, tests, assignments, and recorded scores. Keep this file safe.</p>
          <button 
            onClick={handleBackup} 
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            Download Backup
          </button>
        </div>

        <hr />

        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Restore Data</h2>
          <p className="text-gray-600 mb-4 text-sm">Restore from a previous backup file. <strong>This will overwrite all current data.</strong></p>
          <input 
            type="file" 
            accept=".json"
            onChange={handleRestore}
            disabled={loading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
          />
        </div>

        <hr />

        <div>
          <h2 className="text-xl font-semibold text-red-600 mb-2">Danger Zone</h2>
          <p className="text-gray-600 mb-4 text-sm">Permanently delete all data from this device. Make sure you have a backup first.</p>
          <button 
            onClick={handleClearData} 
            disabled={loading}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-red-300"
          >
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
}
