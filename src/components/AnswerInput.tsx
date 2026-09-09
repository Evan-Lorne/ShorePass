"use client";
import type { StudyQuestion } from "@/lib/paper";
import { subjective } from "@/lib/grading";
export default function AnswerInput({
  question,
  type,
  pool,
  value,
  onChange,
  disabled = false,
}: {
  question: StudyQuestion;
  type: string;
  pool?: { id: string; key: string; content: string }[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const options = question.options.length ? question.options : pool || [];
  if (subjective(type))
    return (
      <div>
        <label className="field-label" htmlFor="answer">
          你的作答
        </label>
        <textarea
          id="answer"
          aria-label="你的作答"
          rows={9}
          maxLength={20000}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="answer-text"
        />
        <p className="muted text-right">{value.trim() ? value.trim().split(/\s+/).length : 0} 词</p>
      </div>
    );
  if (options.length)
    return (
      <div className="options" role="group" aria-label="答案选项">
        {options.map((o) => (
          <button
            key={o.id}
            className={`option ${value === o.key ? "selected" : ""}`}
            aria-pressed={value === o.key}
            disabled={disabled}
            onClick={() => onChange(o.key)}
          >
            <span className="option-key">{o.key}</span>
            <span>{o.content}</span>
          </button>
        ))}
      </div>
    );
  return (
    <div>
      <label className="field-label" htmlFor="answer">
        {question.baseWord ? `原形词：${question.baseWord}` : "你的答案"}
      </label>
      <input
        id="answer"
        autoComplete="off"
        spellCheck={false}
        className="answer-text"
        maxLength={20000}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
