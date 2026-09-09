with open('src/app/practice/[id]/exam/ExamClient.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

replacements = [
    ('Back to Papers', '返回试卷库'),
    ('Type your answer...', '请输入你的答案...'),
    ('Type your answer here...', '请在此输入你的答案（例如作文、翻译等）...'),
    ('Submit Exam', '提交试卷'),
    ('e.g.', '例如：'),
]

for old, new in replacements:
    code = code.replace(old, new)

with open('src/app/practice/[id]/exam/ExamClient.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
