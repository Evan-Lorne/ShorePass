with open('src/app/papers/[id]/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

replacements = [
    ('返回列表 (Back to List)', '返回列表'),
    ('开始练习 (Practice)', '开始练习'),
    ('Year / Month', '年份 / 月份'),
    ('Region</div>', '地区</div>'),
    ('Course Code', '课程代码'),
    ('Type</div>', '类型</div>'),
    ('Total Score', '总分'),
    ('Status</div>', '状态</div>'),
    ('paper.region === \'national\' ? \'全国卷\' : paper.region === \'jiangsu\' ? \'江苏卷\' : paper.region', "paper.region === 'national' ? '全国卷' : paper.region === 'jiangsu' ? '江苏卷' : paper.region"),
    ('{paper.paperType === \'exam\' ? \'真题\' : \'押题卷\'}', "{paper.paperType === 'exam' ? '历年真题' : '押题卷'}"),
    ('Score per question: {section.scorePerQuestion}', '每题分值: {section.scorePerQuestion}分'),
    ('<strong>Answer:</strong>', '<strong>标准答案:</strong>'),
]

for old, new in replacements:
    code = code.replace(old, new)

# Map region correctly
code = code.replace('{paper.region}', "{paper.region === 'national' ? '全国卷' : paper.region === 'jiangsu' ? '江苏卷' : paper.region}")

with open('src/app/papers/[id]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
