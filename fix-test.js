const fs = require('fs');
let code = fs.readFileSync('src/scripts/__tests__/import-paper.test.ts', 'utf8');
code = code.replace("import { importPaper } from '../import-paper';", "import { importPaper } from '../import-paper';\nimport { PaperImportSchema } from '@/lib/schemas/paper-import';");
code = code.replace("await importPaper(dummyPaper);", "const parsed = PaperImportSchema.parse(dummyPaper);\n    await importPaper(parsed);");
fs.writeFileSync('src/scripts/__tests__/import-paper.test.ts', code);
