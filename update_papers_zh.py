with open('src/app/papers/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

replacements = [
    ('试卷库 (Exam Papers)', '试卷库'),
    ('Year</label>', '年份</label>'),
    ('placeholder="e.g. 2024"', 'placeholder="例：2024"'),
    ('Region</label>', '地区</label>'),
    ('value="">All</option>', 'value="">全部</option>'),
    ('>National</option>', '>全国卷</option>'),
    ('>Jiangsu</option>', '>江苏卷</option>'),
    ('Course Code</label>', '课程代码</label>'),
    ('Type</label>', '试卷类型</label>'),
    ('真题 (Exam)', '历年真题'),
    ('押题卷 (Mock)', '押题卷'),
    ('>Filter<', '>筛选<'),
    ('>Clear<', '>清空<'),
    ('>Title</th>', '>试卷名称</th>'),
    ('>Year</th>', '>年份</th>'),
    ('>Region</th>', '>地区</th>'),
    ('>Course</th>', '>课程</th>'),
    ('>Type</th>', '>类型</th>'),
    ('>Questions</th>', '>题数</th>'),
    ('>Status</th>', '>状态</th>'),
    ('>Block Reasons</th>', '>拦截原因</th>'),
    ('>Action</th>', '>操作</th>'),
    ('paper.region === \'national\' ? \'全国卷\' : paper.region === \'jiangsu\' ? \'江苏卷\' : paper.region', "paper.region === 'national' ? '全国卷' : paper.region === 'jiangsu' ? '江苏卷' : paper.region"),
    ('>View<', '>查看<'),
    ('No papers found.', '未找到符合条件的试卷。'),
]

# Quick replace
for old, new in replacements:
    code = code.replace(old, new)

# Also need to map region data dynamic rendering
code = code.replace('{paper.region}', "{paper.region === 'national' ? '全国卷' : paper.region === 'jiangsu' ? '江苏卷' : paper.region}")

with open('src/app/papers/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
