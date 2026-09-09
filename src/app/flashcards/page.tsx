import { prisma } from "@/lib/prisma";
import FlashcardClient from "./FlashcardClient";
export const dynamic = "force-dynamic";

export default async function FlashcardsPage() {
  // We'll fetch 50 words for the session
  const words = await prisma.word.findMany({
    take: 50,
    orderBy: { frequency: "desc" },
  });

  return (
    <div className="page flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-2">高频词速刷</h1>
      <p className="muted mb-8">自考英语 · 高频词汇</p>

      {words.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border text-center text-gray-500">
          词库为空，请先导入高频词汇。
        </div>
      ) : (
        <FlashcardClient words={words} />
      )}
    </div>
  );
}
