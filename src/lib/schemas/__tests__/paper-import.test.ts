/**
 * Unit tests for the paper import Zod schemas.
 *
 * Tests cover:
 * - Valid complete paper passes validation
 * - Each section type validates correctly
 * - Required fields are enforced
 * - Enum constraints are enforced (courseCode, region, paperType, sectionType)
 * - verified defaults to false
 * - Dynamic question and option counts are supported
 * - acceptableAnswers array parsing
 * - Block reasons validation
 * - ID generation helpers
 */

import { describe, it, expect } from "vitest";
import {
  PaperImportSchema,
  SectionImportSchema,
  QuestionImportSchema,
  AnswerRuleImportSchema,
  OptionImportSchema,
  BlockReasonSchema,
  CourseCodeEnum,
  RegionEnum,
  PaperTypeEnum,
  SectionTypeEnum,
  generatePaperId,
  generateSectionId,
  generateTaskId,
  generateQuestionId,
  generateOptionId,
  generateAnswerRuleId,
  generateSourceReferenceId,
} from "../paper-import";

// ─── Test fixtures ───────────────────────────────────────────────

function makeMinimalQuestion(overrides: Record<string, unknown> = {}) {
  return {
    questionNumber: 1,
    stem: "Test question stem",
    scoreValue: 1,
    answerRules: [{ standardAnswer: "A" }],
    ...overrides,
  };
}

function makeMinimalSection(overrides: Record<string, unknown> = {}) {
  return {
    type: "reading_judgment",
    title: "第一部分：阅读判断",
    sortOrder: 1,
    scorePerQuestion: 1,
    tasks: [
      {
        sortOrder: 0,
        questions: [makeMinimalQuestion()],
      },
    ],
    ...overrides,
  };
}

function makeMinimalPaper(overrides: Record<string, unknown> = {}) {
  return {
    paperId: "test-2099-01-national",
    title: "测试试卷",
    courseCode: "13000",
    year: 2099,
    month: 1,
    region: "national",
    paperType: "exam",
    sections: [makeMinimalSection()],
    ...overrides,
  };
}

// ─── PaperImportSchema tests ─────────────────────────────────────

describe("PaperImportSchema", () => {
  it("should accept a valid minimal paper", () => {
    const result = PaperImportSchema.safeParse(makeMinimalPaper());
    expect(result.success).toBe(true);
  });

  it("should default verified to false", () => {
    const result = PaperImportSchema.safeParse(makeMinimalPaper());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.verified).toBe(false);
    }
  });

  it("should default publishBlocked to true", () => {
    const result = PaperImportSchema.safeParse(makeMinimalPaper());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.publishBlocked).toBe(true);
    }
  });

  it("should default totalScore to 100", () => {
    const result = PaperImportSchema.safeParse(makeMinimalPaper());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalScore).toBe(100);
    }
  });

  it("should default suggestedMinutes to 150", () => {
    const result = PaperImportSchema.safeParse(makeMinimalPaper());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.suggestedMinutes).toBe(150);
    }
  });

  it("should reject if paperId is missing", () => {
    const data = makeMinimalPaper();
    delete (data as Record<string, unknown>).paperId;
    const result = PaperImportSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("should reject if title is empty", () => {
    const result = PaperImportSchema.safeParse(makeMinimalPaper({ title: "" }));
    expect(result.success).toBe(false);
  });

  it("should reject if sections is empty", () => {
    const result = PaperImportSchema.safeParse(makeMinimalPaper({ sections: [] }));
    expect(result.success).toBe(false);
  });

  it("should reject a verified paper that is also publish-blocked", () => {
    const result = PaperImportSchema.safeParse(
      makeMinimalPaper({ verified: true, publishBlocked: true })
    );
    expect(result.success).toBe(false);
  });

  it("should accept a verified paper that is NOT publish-blocked", () => {
    const result = PaperImportSchema.safeParse(
      makeMinimalPaper({ verified: true, publishBlocked: false })
    );
    expect(result.success).toBe(true);
  });

  it("should accept blockReasons as an array of valid reasons", () => {
    const result = PaperImportSchema.safeParse(
      makeMinimalPaper({
        blockReasons: [
          { code: "missing_passage", description: "缺原文" },
          { code: "disputed_answer" },
        ],
      })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.blockReasons).toHaveLength(2);
    }
  });
});

// ─── CourseCode, Region, PaperType enum tests ────────────────────

describe("Enum validation", () => {
  it("should accept courseCode '00015'", () => {
    const result = CourseCodeEnum.safeParse("00015");
    expect(result.success).toBe(true);
  });

  it("should accept courseCode '13000'", () => {
    const result = CourseCodeEnum.safeParse("13000");
    expect(result.success).toBe(true);
  });

  it("should reject invalid courseCode", () => {
    const result = CourseCodeEnum.safeParse("99999");
    expect(result.success).toBe(false);
  });

  it("should accept region 'national'", () => {
    expect(RegionEnum.safeParse("national").success).toBe(true);
  });

  it("should accept region 'jiangsu'", () => {
    expect(RegionEnum.safeParse("jiangsu").success).toBe(true);
  });

  it("should reject invalid region", () => {
    expect(RegionEnum.safeParse("beijing").success).toBe(false);
  });

  it("should accept paperType 'exam'", () => {
    expect(PaperTypeEnum.safeParse("exam").success).toBe(true);
  });

  it("should accept paperType 'prediction'", () => {
    expect(PaperTypeEnum.safeParse("prediction").success).toBe(true);
  });

  it("should reject invalid paperType", () => {
    expect(PaperTypeEnum.safeParse("mock").success).toBe(false);
  });
});

// ─── SectionTypeEnum tests ───────────────────────────────────────

describe("SectionTypeEnum", () => {
  const validTypes = [
    "reading_judgment",
    "reading_comprehension",
    "summary_completion",
    "sentence_fill",
    "word_cloze",
    "word_formation",
    "essay",
    "translation",
  ];

  for (const type of validTypes) {
    it(`should accept section type '${type}'`, () => {
      expect(SectionTypeEnum.safeParse(type).success).toBe(true);
    });
  }

  it("should reject invalid section type", () => {
    expect(SectionTypeEnum.safeParse("fill_in_blank").success).toBe(false);
  });
});

// ─── SectionImportSchema tests ───────────────────────────────────

describe("SectionImportSchema", () => {
  it("should accept a valid section", () => {
    const result = SectionImportSchema.safeParse(makeMinimalSection());
    expect(result.success).toBe(true);
  });

  it("should reject if title is empty", () => {
    const result = SectionImportSchema.safeParse(makeMinimalSection({ title: "" }));
    expect(result.success).toBe(false);
  });

  it("should reject if tasks is empty", () => {
    const result = SectionImportSchema.safeParse(makeMinimalSection({ tasks: [] }));
    expect(result.success).toBe(false);
  });

  it("should accept dynamic question counts (1 question)", () => {
    const section = makeMinimalSection({
      tasks: [{ sortOrder: 0, questions: [makeMinimalQuestion()] }],
    });
    const result = SectionImportSchema.safeParse(section);
    expect(result.success).toBe(true);
  });

  it("should accept dynamic question counts (15 questions)", () => {
    const questions = Array.from({ length: 15 }, (_, i) =>
      makeMinimalQuestion({ questionNumber: i + 1 })
    );
    const section = makeMinimalSection({
      tasks: [{ sortOrder: 0, questions }],
    });
    const result = SectionImportSchema.safeParse(section);
    expect(result.success).toBe(true);
  });

  it("should accept an options pool of any size", () => {
    const optionsPool = Array.from({ length: 12 }, (_, i) => ({
      key: String.fromCharCode(65 + i),
      content: `Option ${i + 1}`,
    }));
    const section = makeMinimalSection({ optionsPool, type: "word_cloze" });
    const result = SectionImportSchema.safeParse(section);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.optionsPool).toHaveLength(12);
    }
  });

  it("should default optionsPool to empty array", () => {
    const result = SectionImportSchema.safeParse(makeMinimalSection());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.optionsPool).toEqual([]);
    }
  });
});

// ─── QuestionImportSchema tests ──────────────────────────────────

describe("QuestionImportSchema", () => {
  it("should accept a valid question", () => {
    const result = QuestionImportSchema.safeParse(makeMinimalQuestion());
    expect(result.success).toBe(true);
  });

  it("should default verified to false", () => {
    const result = QuestionImportSchema.safeParse(makeMinimalQuestion());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.verified).toBe(false);
    }
  });

  it("should reject if stem is empty", () => {
    const result = QuestionImportSchema.safeParse(makeMinimalQuestion({ stem: "" }));
    expect(result.success).toBe(false);
  });

  it("should reject if answerRules is empty", () => {
    const result = QuestionImportSchema.safeParse(makeMinimalQuestion({ answerRules: [] }));
    expect(result.success).toBe(false);
  });

  it("should accept baseWord for word_formation questions", () => {
    const result = QuestionImportSchema.safeParse(
      makeMinimalQuestion({
        baseWord: "convenient",
        answerRules: [
          {
            standardAnswer: "convenience",
            acceptableAnswers: ["convenience", "Convenience"],
            caseSensitive: false,
          },
        ],
      })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.baseWord).toBe("convenient");
    }
  });

  it("should accept question-level options of any size", () => {
    const result = QuestionImportSchema.safeParse(
      makeMinimalQuestion({
        options: [
          { key: "A", content: "Option A" },
          { key: "B", content: "Option B" },
          { key: "C", content: "Option C" },
        ],
      })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.options).toHaveLength(3);
    }
  });

  it("should default options to empty array", () => {
    const result = QuestionImportSchema.safeParse(makeMinimalQuestion());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.options).toEqual([]);
    }
  });
});

// ─── AnswerRuleImportSchema tests ────────────────────────────────

describe("AnswerRuleImportSchema", () => {
  it("should accept a minimal answer rule", () => {
    const result = AnswerRuleImportSchema.safeParse({ standardAnswer: "A" });
    expect(result.success).toBe(true);
  });

  it("should default caseSensitive to false", () => {
    const result = AnswerRuleImportSchema.safeParse({ standardAnswer: "A" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.caseSensitive).toBe(false);
    }
  });

  it("should default disputed to false", () => {
    const result = AnswerRuleImportSchema.safeParse({ standardAnswer: "A" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.disputed).toBe(false);
    }
  });

  it("should default acceptableAnswers to empty array", () => {
    const result = AnswerRuleImportSchema.safeParse({ standardAnswer: "A" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.acceptableAnswers).toEqual([]);
    }
  });

  it("should accept acceptableAnswers with multiple variants", () => {
    const result = AnswerRuleImportSchema.safeParse({
      standardAnswer: "convenience",
      acceptableAnswers: ["convenience", "Convenience", "CONVENIENCE"],
      caseSensitive: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.acceptableAnswers).toHaveLength(3);
    }
  });

  it("should reject if standardAnswer is empty", () => {
    const result = AnswerRuleImportSchema.safeParse({ standardAnswer: "" });
    expect(result.success).toBe(false);
  });
});

// ─── OptionImportSchema tests ────────────────────────────────────

describe("OptionImportSchema", () => {
  it("should accept a valid option", () => {
    const result = OptionImportSchema.safeParse({ key: "A", content: "True" });
    expect(result.success).toBe(true);
  });

  it("should reject if key is empty", () => {
    const result = OptionImportSchema.safeParse({ key: "", content: "True" });
    expect(result.success).toBe(false);
  });

  it("should reject if content is empty", () => {
    const result = OptionImportSchema.safeParse({ key: "A", content: "" });
    expect(result.success).toBe(false);
  });
});

// ─── BlockReasonSchema tests ─────────────────────────────────────

describe("BlockReasonSchema", () => {
  const validCodes = [
    "missing_passage",
    "missing_questions",
    "missing_answer",
    "disputed_answer",
    "missing_source",
    "ocr_unverified",
    "incomplete_options",
    "other",
  ];

  for (const code of validCodes) {
    it(`should accept block reason code '${code}'`, () => {
      const result = BlockReasonSchema.safeParse({ code });
      expect(result.success).toBe(true);
    });
  }

  it("should reject invalid block reason code", () => {
    const result = BlockReasonSchema.safeParse({ code: "invalid_code" });
    expect(result.success).toBe(false);
  });
});

// ─── ID generation helpers ───────────────────────────────────────

describe("ID generation helpers", () => {
  it("generatePaperId for national exam", () => {
    expect(generatePaperId(2026, 4, "national", "exam")).toBe("2026-04-national");
  });

  it("generatePaperId for prediction paper", () => {
    expect(generatePaperId(2026, 4, "national", "prediction", 1)).toBe(
      "2026-04-national-prediction-1"
    );
  });

  it("generatePaperId zero-pads month", () => {
    expect(generatePaperId(2026, 1, "jiangsu", "exam")).toBe("2026-01-jiangsu");
  });

  it("generateSectionId", () => {
    expect(generateSectionId("2026-04-national", 1, "reading_judgment")).toBe(
      "2026-04-national_s1_reading_judgment"
    );
  });

  it("generateTaskId", () => {
    expect(generateTaskId("2026-04-national_s1_reading_judgment", 0)).toBe(
      "2026-04-national_s1_reading_judgment_t0"
    );
  });

  it("generateQuestionId", () => {
    expect(generateQuestionId("2026-04-national", 1)).toBe("2026-04-national_q1");
  });

  it("generateOptionId", () => {
    expect(generateOptionId("2026-04-national_q1", "A")).toBe("2026-04-national_q1_opt_A");
  });

  it("generateAnswerRuleId", () => {
    expect(generateAnswerRuleId("2026-04-national_q1")).toBe("2026-04-national_q1_answer");
  });

  it("generateSourceReferenceId", () => {
    expect(generateSourceReferenceId("2026-04-national_q1", 0)).toBe(
      "2026-04-national_q1_src_0"
    );
  });
});

// ─── Full paper with all section types ───────────────────────────

describe("Full paper validation with all section types", () => {
  it("should accept a paper with all 8 section types", () => {
    const fullPaper = {
      paperId: "test-full-2099-01-national",
      title: "完整测试试卷",
      courseCode: "13000",
      year: 2099,
      month: 1,
      region: "national",
      paperType: "exam",
      sections: [
        makeMinimalSection({ type: "reading_judgment", sortOrder: 1 }),
        makeMinimalSection({
          type: "reading_comprehension",
          sortOrder: 2,
          scorePerQuestion: 2,
          tasks: [
            {
              sortOrder: 0,
              questions: [
                makeMinimalQuestion({
                  questionNumber: 11,
                  scoreValue: 2,
                  options: [
                    { key: "A", content: "A" },
                    { key: "B", content: "B" },
                    { key: "C", content: "C" },
                    { key: "D", content: "D" },
                  ],
                }),
              ],
            },
          ],
        }),
        makeMinimalSection({
          type: "summary_completion",
          sortOrder: 3,
          tasks: [
            { title: "Task 1", sortOrder: 0, questions: [makeMinimalQuestion({ questionNumber: 16 })] },
            { title: "Task 2", sortOrder: 1, questions: [makeMinimalQuestion({ questionNumber: 21 })] },
          ],
        }),
        makeMinimalSection({
          type: "sentence_fill",
          sortOrder: 4,
          scorePerQuestion: 2,
          tasks: [
            {
              sortOrder: 0,
              questions: [makeMinimalQuestion({ questionNumber: 26, scoreValue: 2 })],
            },
          ],
        }),
        makeMinimalSection({
          type: "word_cloze",
          sortOrder: 5,
          scorePerQuestion: 1.5,
          optionsPool: Array.from({ length: 12 }, (_, i) => ({
            key: String.fromCharCode(65 + i),
            content: `word${i}`,
          })),
          tasks: [
            {
              sortOrder: 0,
              questions: [makeMinimalQuestion({ questionNumber: 31, scoreValue: 1.5 })],
            },
          ],
        }),
        makeMinimalSection({
          type: "word_formation",
          sortOrder: 6,
          scorePerQuestion: 1.5,
          tasks: [
            {
              sortOrder: 0,
              questions: [
                makeMinimalQuestion({
                  questionNumber: 41,
                  scoreValue: 1.5,
                  baseWord: "convenient",
                  answerRules: [
                    {
                      standardAnswer: "convenience",
                      acceptableAnswers: ["convenience", "Convenience"],
                      caseSensitive: false,
                    },
                  ],
                }),
              ],
            },
          ],
        }),
        makeMinimalSection({
          type: "essay",
          sortOrder: 7,
          scorePerQuestion: 30,
          tasks: [
            {
              sortOrder: 0,
              questions: [
                makeMinimalQuestion({
                  questionNumber: 51,
                  scoreValue: 30,
                  answerRules: [{ standardAnswer: "SUBJECTIVE_NO_SINGLE_ANSWER" }],
                }),
              ],
            },
          ],
        }),
        makeMinimalSection({
          type: "translation",
          sortOrder: 8,
          scorePerQuestion: 5,
          tasks: [
            {
              sortOrder: 0,
              questions: [
                makeMinimalQuestion({
                  questionNumber: 52,
                  scoreValue: 5,
                  answerRules: [
                    {
                      standardAnswer: "Learning is a lifelong pursuit.",
                      acceptableAnswers: ["Study is a lifelong pursuit."],
                      caseSensitive: false,
                    },
                  ],
                }),
              ],
            },
          ],
        }),
      ],
    };

    const result = PaperImportSchema.safeParse(fullPaper);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sections).toHaveLength(8);
      expect(result.data.verified).toBe(false);
    }
  });

  it("should accept a prediction paper from Jiangsu with 00015 code", () => {
    const result = PaperImportSchema.safeParse(
      makeMinimalPaper({
        paperId: "test-2024-04-jiangsu",
        courseCode: "00015",
        region: "jiangsu",
        paperType: "exam",
      })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.courseCode).toBe("00015");
      expect(result.data.region).toBe("jiangsu");
    }
  });

  it("should accept a prediction paper", () => {
    const result = PaperImportSchema.safeParse(
      makeMinimalPaper({
        paperId: "test-prediction-1",
        paperType: "prediction",
      })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paperType).toBe("prediction");
    }
  });
});
