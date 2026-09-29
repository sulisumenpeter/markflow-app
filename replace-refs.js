const fs = require('fs');
const path = require('path');

function processFile(filePath, type, TypeCaps, typePlural, TypePluralCaps) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the component names
  content = content.replace(/ExamsPage/g, `${TypePluralCaps}Page`);
  content = content.replace(/NewExamPage/g, `New${TypeCaps}Page`);
  
  // Replace strings
  content = content.replace(/>Exams</g, `>${TypePluralCaps}<`);
  content = content.replace(/Create New Exam/g, `Create New ${TypeCaps}`);
  content = content.replace(/No exams found/g, `No ${typePlural} found`);
  content = content.replace(/\/exams\/new/g, `/${typePlural}/new`);
  content = content.replace(/\/exams/g, `/${typePlural}`);
  
  // For the DB query, we want to filter by type
  // Instead of db.exams.toArray(), use .filter
  if (content.includes('db.exams.toArray()')) {
    content = content.replace('db.exams.toArray()', `db.exams.filter(e => e.assessmentType === '${type.toUpperCase()}').toArray()`);
  }
  
  // Handle the 'new' page specifically for assessmentName
  if (filePath.includes('new') && filePath.includes('page.tsx')) {
    // We need to add assessmentName input
    const nameInput = `
        <div>
          <label className="block text-sm font-medium text-gray-700">Name / Number</label>
          <input
            required
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
            value={formData.assessmentName || ''}
            onChange={(e) => setFormData({ ...formData, assessmentName: e.target.value })}
            placeholder="e.g. ${TypeCaps} 1"
          />
        </div>`;
    
    if (!content.includes('assessmentName')) {
      content = content.replace(/courseTitle: '',/g, `courseTitle: '',\n    assessmentName: '',\n    assessmentType: '${type.toUpperCase()}',`);
      // Insert after courseTitle input
      content = content.replace(/(placeholder="Introduction to Programming"[\s\S]*?<\/div>)/, `$1\n${nameInput}`);
    }
  }

  fs.writeFileSync(filePath, content);
}

processFile(path.join(__dirname, 'src/app/tests/page.tsx'), 'test', 'Test', 'tests', 'Tests');
processFile(path.join(__dirname, 'src/app/tests/new/page.tsx'), 'test', 'Test', 'tests', 'Tests');

processFile(path.join(__dirname, 'src/app/assignments/page.tsx'), 'assignment', 'Assignment', 'assignments', 'Assignments');
processFile(path.join(__dirname, 'src/app/assignments/new/page.tsx'), 'assignment', 'Assignment', 'assignments', 'Assignments');

// Also update exams page to filter
let examsContent = fs.readFileSync(path.join(__dirname, 'src/app/exams/page.tsx'), 'utf8');
examsContent = examsContent.replace('db.exams.toArray()', `db.exams.filter(e => !e.assessmentType || e.assessmentType === 'EXAM').toArray()`);
fs.writeFileSync(path.join(__dirname, 'src/app/exams/page.tsx'), examsContent);

// And update exams/new to set assessmentType
let newExamContent = fs.readFileSync(path.join(__dirname, 'src/app/exams/new/page.tsx'), 'utf8');
if (!newExamContent.includes('assessmentType')) {
  newExamContent = newExamContent.replace(/courseTitle: '',/g, `courseTitle: '',\n    assessmentType: 'EXAM',`);
}
fs.writeFileSync(path.join(__dirname, 'src/app/exams/new/page.tsx'), newExamContent);

console.log('Pages updated');
