const fs = require('fs');
let code = fs.readFileSync('src/scripts/import-paper.ts', 'utf8');
code = code.replace(/optionsPool\.length/g, '(section.optionsPool || []).length');
code = code.replace(/question.options.length/g, '(question.options || []).length');
code = code.replace(/question.answerRules.length/g, '(question.answerRules || []).length');
code = code.replace(/question.sourceReferences.length/g, '(question.sourceReferences || []).length');
code = code.replace('main()\n  .catch((err) => {', 'if (require.main === module) {\nmain()\n  .catch((err) => {');
code = code.replace('await prisma.$disconnect();\n  });', 'await prisma.$disconnect();\n  });\n}');
fs.writeFileSync('src/scripts/import-paper.ts', code);
