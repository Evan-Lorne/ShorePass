const fs = require('fs');
let content = fs.readFileSync('src/scripts/import-paper.ts', 'utf8');

content = content.replace(
  /suggestedMinutes: data.suggestedMinutes,/g,
  'suggestedMinutes: data.suggestedMinutes,\n        status: data.status,'
);

content = content.replace(
  /stem: question.stem,/g,
  'stem: question.stem,\n              originalStem: question.originalStem ?? null,'
);

content = content.replace(
  /standardAnswer: rule.standardAnswer,/g,
  'standardAnswer: rule.standardAnswer,\n                originalAnswer: rule.originalAnswer ?? null,\n                revisionNotes: rule.revisionNotes ?? null,'
);

fs.writeFileSync('src/scripts/import-paper.ts', content);
