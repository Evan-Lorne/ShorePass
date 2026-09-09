const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const papers = await prisma.paper.count();
  const sections = await prisma.section.count();
  const questions = await prisma.question.count();
  console.log(`Papers: ${papers}`);
  console.log(`Sections: ${sections}`);
  console.log(`Questions: ${questions}`);
}
run().then(() => process.exit(0));
