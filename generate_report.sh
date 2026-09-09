#!/bin/bash
echo "# 题库导入校验报告" > import_report.md
echo "" >> import_report.md
echo "## 导入 Paper 1 (押题卷)" >> import_report.md
echo "\`\`\`" >> import_report.md
npx tsx src/scripts/import-paper.ts paper1.json >> import_report.md 2>&1
echo "\`\`\`" >> import_report.md
echo "" >> import_report.md
echo "## 导入 Paper 2 (江苏真题)" >> import_report.md
echo "\`\`\`" >> import_report.md
npx tsx src/scripts/import-paper.ts paper2.json >> import_report.md 2>&1
echo "\`\`\`" >> import_report.md
echo "" >> import_report.md
echo "## 数据库记录统计" >> import_report.md
echo "\`\`\`" >> import_report.md
sqlite3 prisma/dev.db "SELECT 'Papers:', count(*) FROM Paper;" >> import_report.md
sqlite3 prisma/dev.db "SELECT 'Sections:', count(*) FROM Section;" >> import_report.md
sqlite3 prisma/dev.db "SELECT 'Questions:', count(*) FROM Question;" >> import_report.md
echo "\`\`\`" >> import_report.md
