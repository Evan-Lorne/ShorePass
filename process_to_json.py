import re
import os
import json
import uuid

with open('/Users/mubai/英语/q1.txt', 'r', encoding='utf-8') as f:
    q_text = f.read()

with open('/Users/mubai/英语/a1.txt', 'r', encoding='utf-8') as f:
    a_text = f.read()

q_text = re.sub(r'高等教育自学考试.*?(\n.*?/\s*12\s*\n)', '', q_text)
a_text = re.sub(r'撷墨教育.*?(\n.*?/\s*5\s*\n)', '', a_text)
q_text = re.sub(r'高等教育自学考试.*?\n.*?\d+\s*/\s*12\s*\n', '', q_text)
a_text = re.sub(r'撷墨教育.*?\n.*?\d+\s*/\s*5\s*\n', '', a_text)
q_text = re.sub(r'高等教育自学考试（一）\n英语二 试卷.*?(?=第一部分)', '', q_text, flags=re.DOTALL)
a_text = re.sub(r'参考答案（一）\n', '', a_text)

ans_dict = {}
a_matches = re.finditer(r'(?:^|\n)(\d+)\.?\[解析\](.*?)(?=(?:\n\d+\.?\[解析\]|\n\d+\.略|\Z))', a_text, re.DOTALL)
for m in a_matches:
    q_num = int(m.group(1))
    content = m.group(2).strip()
    ans_match = re.search(r'答案为\s*(.*?)(?:。|\.)$', content)
    if ans_match:
        ans = ans_match.group(1).strip()
        explanation = content[:ans_match.start()].strip()
    else:
        ans = "详见解析"
        explanation = content
    ans_dict[q_num] = (ans, explanation)
ans_dict[51] = ("略", "略")

sections = re.split(r'\n(第[一二三四五六七]部分:?.*?)\n', '\n' + q_text)

paper = {
    "paperId": "2024-prediction-1",
    "title": "押题库考前试卷（1）",
    "courseCode": "00015",
    "year": 2024,
    "month": 4,
    "region": "national",
    "paperType": "prediction",
    "totalScore": 100,
    "suggestedMinutes": 150,
    "status": "draft",
    "publishBlocked": True,
    "blockReasons": [],
    "sourceFile": "q1.txt",
    "sections": []
}

section_map = [
    {"type": "reading_judgment", "score": 1},
    {"type": "reading_comprehension", "score": 2},
    {"type": "summary_completion", "score": 1},
    {"type": "sentence_fill", "score": 2},
    {"type": "word_cloze", "score": 1.5},
    {"type": "word_formation", "score": 1.5},
    {"type": "essay", "score": 30}
]

sec_idx = 0
for i in range(1, len(sections), 2):
    sec_title = sections[i].strip()
    sec_content = sections[i+1].strip()
    
    sec_type = section_map[sec_idx]["type"]
    sec_score = section_map[sec_idx]["score"]
    
    m_nums = re.search(r'第\s*(\d+)-(\d+)\s*题', sec_title)
    if m_nums:
        start_q = int(m_nums.group(1))
        end_q = int(m_nums.group(2))
        expected_qs = list(range(start_q, end_q + 1))
    else:
        m_num = re.search(r'第\s*(\d+)\s*题', sec_title)
        if m_num:
            expected_qs = [int(m_num.group(1))]
        else:
            expected_qs = []
            
    section = {
        "type": sec_type,
        "title": sec_title,
        "sortOrder": sec_idx + 1,
        "scorePerQuestion": sec_score,
        "tasks": [],
        "optionsPool": []
    }
    
    task = {
        "sortOrder": 1,
        "questions": []
    }
    
    if "补文" in sec_title or "完形" in sec_title or "概括段落" in sec_title:
        options_match = re.search(r'\n([A-L]\.\s*.*?)$', sec_content, re.DOTALL)
        if options_match:
            passage = sec_content[:options_match.start()].strip()
            options_text = options_match.group(1).strip()
            section["passage"] = passage
            # Parse options
            opt_matches = re.finditer(r'([A-L])\.\s*([^A-L\n]+)', options_text)
            for om in opt_matches:
                section["optionsPool"].append({
                    "key": om.group(1),
                    "content": om.group(2).strip()
                })
        else:
            section["passage"] = sec_content
            
        for q_num in expected_qs:
            q = {
                "questionNumber": q_num,
                "stem": "[见短文原文]",
                "scoreValue": sec_score,
                "answerRules": [],
                "options": []
            }
            if q_num in ans_dict:
                q["answerRules"].append({
                    "standardAnswer": ans_dict[q_num][0],
                    "explanation": ans_dict[q_num][1]
                })
            else:
                q["answerRules"].append({
                    "standardAnswer": "TBD"
                })
                paper["blockReasons"].append({"code": "missing_answer", "description": f"Missing answer for q{q_num}"})
            task["questions"].append(q)
            
    elif "短文写作" in sec_title:
        section["passage"] = sec_content
        q = {
            "questionNumber": 51,
            "stem": "短文写作",
            "scoreValue": sec_score,
            "answerRules": [{"standardAnswer": "略"}]
        }
        task["questions"].append(q)
        
    else:
        q_matches = list(re.finditer(r'(?:^|\n)(\d+)\.\s*(.*?)(?=(?:\n\d+\.\s*|\Z))', sec_content, re.DOTALL))
        if q_matches:
            passage = sec_content[:q_matches[0].start()].strip()
            if passage:
                section["passage"] = passage
                
            for m in q_matches:
                q_num = int(m.group(1))
                q_body = m.group(2).strip()
                
                # Split stem and options
                opt_start = re.search(r'\n?[A-D]\.', q_body)
                if opt_start:
                    stem = q_body[:opt_start.start()].strip()
                    opts_text = q_body[opt_start.start():].strip()
                    opts = []
                    for om in re.finditer(r'([A-D])\.\s*([^A-D\n]+)', opts_text):
                        opts.append({
                            "key": om.group(1),
                            "content": om.group(2).strip()
                        })
                else:
                    stem = q_body
                    opts = []
                    
                q = {
                    "questionNumber": q_num,
                    "stem": stem,
                    "scoreValue": sec_score,
                    "options": opts,
                    "answerRules": []
                }
                if q_num in ans_dict:
                    q["answerRules"].append({
                        "standardAnswer": ans_dict[q_num][0],
                        "explanation": ans_dict[q_num][1]
                    })
                else:
                    q["answerRules"].append({
                        "standardAnswer": "TBD"
                    })
                    paper["blockReasons"].append({"code": "missing_answer", "description": f"Missing answer for q{q_num}"})
                task["questions"].append(q)
        else:
            section["passage"] = sec_content

    section["tasks"].append(task)
    paper["sections"].append(section)
    sec_idx += 1

with open('paper1.json', 'w', encoding='utf-8') as f:
    json.dump(paper, f, ensure_ascii=False, indent=2)

print("Generated paper1.json")
