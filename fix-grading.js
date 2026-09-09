const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/app/api/admin/grading/[answerId]/route.ts');
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  '// Recalculate\n    for (const ans of session.answers) {',
  'if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });\n\n    // Recalculate\n    for (const ans of session.answers) {'
);
fs.writeFileSync(file, code);
