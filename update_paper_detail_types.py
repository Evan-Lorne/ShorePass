import re

with open('src/app/papers/[id]/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

type_map = """
                    ({section.type === 'reading_judgment' ? '阅读判断' :
                     section.type === 'reading_comprehension' ? '阅读选择' :
                     section.type === 'summary_completion' ? '概括大意' :
                     section.type === 'sentence_fill' ? '填句补文' :
                     section.type === 'word_cloze' ? '填词补文' :
                     section.type === 'word_formation' ? '完形补文' :
                     section.type === 'essay' ? '短文写作' :
                     section.type === 'translation' ? '句子翻译' : section.type})
"""
code = code.replace('({section.type})', type_map.strip())

with open('src/app/papers/[id]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
