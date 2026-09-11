
import { PrismaClient } from '@prisma/client';
import { runQualityCheck } from '../src/lib/qualityCheck';
const prisma = new PrismaClient();

async function main() {
  const papers = await prisma.paper.findMany({
    include: {
      sections: {
        include: {
          tasks: { include: { questions: { include: { options: true, answerRules: true, sourceReferences: true } } } },
          options: true
        }
      }
    }
  });
  
  for (const paper of papers) {
    const errors = runQualityCheck(paper);
    if (errors.length > 0) {
      console.log('Paper:', paper.id, 'has errors:', errors.length);
      console.log(errors.slice(0, 3).join('\n') + (errors.length > 3 ? '\n...' : ''));
    } else {
      console.log('Paper:', paper.id, 'passed QC audit.');
    }
  }
}
main().finally(() => prisma.$disconnect());
