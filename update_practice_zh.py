with open('src/app/practice/[id]/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

replacements = [
    ('Back to List', '返回列表'),
    ('Total Score:', '试卷总分:'),
    ('| Suggested Time:', '| 建议用时:'),
    ('minutes', '分钟'),
    ('开始练习 (Practice)', '开始专项练习'),
    ('全真模考 (Mock Exam)', '全真模考 (限时)'),
]

for old, new in replacements:
    code = code.replace(old, new)

with open('src/app/practice/[id]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
