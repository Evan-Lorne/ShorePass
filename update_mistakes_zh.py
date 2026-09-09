import re

with open('src/app/mistakes/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace Mistake Book
code = code.replace('错题本 (Mistake Book)', '错题本')

# Replace sec.type with translation
type_map = """
                    {sec.type === 'reading_judgment' ? '阅读判断' :
                     sec.type === 'reading_comprehension' ? '阅读选择' :
                     sec.type === 'summary_completion' ? '概括大意' :
                     sec.type === 'sentence_fill' ? '填句补文' :
                     sec.type === 'word_cloze' ? '填词补文' :
                     sec.type === 'word_formation' ? '完形补文' :
                     sec.type === 'essay' ? '短文写作' :
                     sec.type === 'translation' ? '句子翻译' : sec.type}
"""
code = code.replace('{sec.type}', type_map.strip())

with open('src/app/mistakes/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
