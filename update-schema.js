const fs = require('fs');
let content = fs.readFileSync('src/lib/schemas/paper-import.ts', 'utf8');
content = content.replace(
  'standardAnswer: z.string().min(1, "Standard answer is required"),',
  'standardAnswer: z.string().min(1, "Standard answer is required"),\n  originalAnswer: z.string().optional(),\n  revisionNotes: z.string().optional(),'
);
content = content.replace(
  'stem: z.string().min(1, "Question stem is required"),',
  'stem: z.string().min(1, "Question stem is required"),\n  originalStem: z.string().optional(),'
);
content = content.replace(
  'verified: z.boolean().optional().default(false),',
  'verified: z.boolean().optional().default(false),\n    status: z.enum(["draft", "partial_verified", "verified", "blocked"]).default("draft"),'
);
fs.writeFileSync('src/lib/schemas/paper-import.ts', content);
