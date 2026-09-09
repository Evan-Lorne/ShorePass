const fs = require('fs');
let code = fs.readFileSync('src/lib/schemas/paper-import.ts', 'utf8');

// Remove from QuestionImportSchema
code = code.replace(
  'verified: z.boolean().optional().default(false),\n    status: z.enum(["draft", "partial_verified", "verified", "blocked"]).default("draft"),',
  'verified: z.boolean().optional().default(false),'
);

// Add to PaperImportSchema
code = code.replace(
  'totalScore: z.number().int().positive().default(100),\n    suggestedMinutes: z.number().int().positive().default(150),\n    verified: z.boolean().optional().default(false),',
  'totalScore: z.number().int().positive().default(100),\n    suggestedMinutes: z.number().int().positive().default(150),\n    verified: z.boolean().optional().default(false),\n    status: z.enum(["draft", "partial_verified", "verified", "blocked"]).default("draft"),'
);

fs.writeFileSync('src/lib/schemas/paper-import.ts', code);
