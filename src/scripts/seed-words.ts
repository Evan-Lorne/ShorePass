import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const mockWords = [
  { word: "abandon", translation: "v. 放弃，遗弃" },
  { word: "benefit", translation: "n. 利益，好处 v. 有益于" },
  { word: "capable", translation: "adj. 有能力的，能干的" },
  { word: "derive", translation: "v. 源于，得到" },
  { word: "essential", translation: "adj. 必要的，本质的" },
  { word: "factor", translation: "n. 因素，要素" },
  { word: "generate", translation: "v. 产生，发生" },
  { word: "hypothesis", translation: "n. 假设，假说" },
  { word: "identify", translation: "v. 识别，认出" },
  { word: "justify", translation: "v. 证明...是正当的" },
];

async function main() {
  for (const w of mockWords) {
    await prisma.word.upsert({
      where: { word: w.word },
      update: {},
      create: {
        word: w.word,
        translation: w.translation,
        frequency: Math.floor(Math.random() * 100),
      },
    });
  }
  console.log("Seeded 10 words.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
