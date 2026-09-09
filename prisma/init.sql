CREATE TABLE "Paper" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "courseCode" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "region" TEXT NOT NULL,
  "paperType" TEXT NOT NULL,
  "totalScore" INTEGER NOT NULL DEFAULT 100,
  "suggestedMinutes" INTEGER NOT NULL DEFAULT 150,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "publishBlocked" BOOLEAN NOT NULL DEFAULT true,
  "blockReasons" TEXT,
  "sourceFile" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Section" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "paperId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "passage" TEXT,
  "instructions" TEXT,
  "scorePerQuestion" REAL NOT NULL,
  CONSTRAINT "Section_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Task" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sectionId" TEXT NOT NULL,
  "title" TEXT,
  "sortOrder" INTEGER NOT NULL,
  "instructions" TEXT,
  CONSTRAINT "Task_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Question" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "taskId" TEXT NOT NULL,
  "questionNumber" INTEGER NOT NULL,
  "stem" TEXT NOT NULL,
  "originalStem" TEXT,
  "baseWord" TEXT,
  "scoreValue" REAL NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Question_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Option" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "questionId" TEXT,
  "sectionId" TEXT,
  "key" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "Option_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Option_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AnswerRule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "questionId" TEXT NOT NULL,
  "standardAnswer" TEXT NOT NULL,
  "originalAnswer" TEXT,
  "acceptableAnswers" TEXT,
  "caseSensitive" BOOLEAN NOT NULL DEFAULT false,
  "explanation" TEXT,
  "revisionNotes" TEXT,
  "disputed" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "AnswerRule_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SourceReference" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "questionId" TEXT NOT NULL,
  "sourceFileName" TEXT NOT NULL,
  "pageNumber" INTEGER,
  "extractionMethod" TEXT,
  "correctionNotes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SourceReference_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PaperVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "paperId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "changeLog" TEXT NOT NULL,
  "changedBy" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaperVersion_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ReviewRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "questionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userAnswer" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL,
  "consecutiveCorrect" INTEGER NOT NULL DEFAULT 0,
  "masteryStatus" TEXT NOT NULL DEFAULT 'unmastered',
  "attemptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sessionId" TEXT,
  CONSTRAINT "ReviewRecord_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ReviewRecord_userId_idx" ON "ReviewRecord"("userId");
CREATE INDEX "ReviewRecord_questionId_idx" ON "ReviewRecord"("questionId");
CREATE INDEX "ReviewRecord_userId_questionId_idx" ON "ReviewRecord"("userId", "questionId");
