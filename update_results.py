import re

with open('src/app/practice/[id]/exam/ExamClient.tsx', 'r') as f:
    content = f.read()

new_results_ui = """        {sessionData && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-8 rounded-2xl mb-8 flex flex-wrap gap-8 justify-between items-center shadow-sm">
           <div className="flex flex-col">
             <span className="text-blue-600 font-medium mb-1">客观题自动出分</span> 
             <span className="font-extrabold text-5xl text-blue-700">{sessionData.objectiveScore} <span className="text-xl font-normal text-blue-500">分</span></span>
           </div>
           <div className="flex flex-col">
             <span className="text-gray-500 font-medium mb-1">主观题状态</span> 
             <span className={`font-bold text-2xl ${sessionData.subjectivePending ? 'text-orange-500' : 'text-green-600'}`}>
                {sessionData.subjectivePending ? '待评阅 ✍️' : '已评阅 ✅'}
             </span>
           </div>
           <div className="flex flex-col">
             <span className="text-gray-500 font-medium mb-1">AI 辅助估分</span> 
             <span className="font-bold text-2xl text-purple-600">{sessionData.aiScore ?? '暂无'}</span>
           </div>
           <div className="flex flex-col border-l pl-8">
             <span className="text-gray-900 font-bold mb-1">预估最终总分</span> 
             <span className="font-extrabold text-4xl text-gray-900">{sessionData.finalScore ?? (sessionData.objectiveScore + (sessionData.aiScore || 0))}</span>
           </div>
        </div>
        )}"""

content = re.sub(r'\{sessionData && \(\n        <div className="bg-blue-50.*?<\/div>\n        \)\}', new_results_ui, content, flags=re.DOTALL)

with open('src/app/practice/[id]/exam/ExamClient.tsx', 'w') as f:
    f.write(content)
