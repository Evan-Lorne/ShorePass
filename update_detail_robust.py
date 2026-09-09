with open('src/app/papers/[id]/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

old_block = """  let parsedBlockReasons: Array<{code: string, description: string}> = [];
  if (paper.blockReasons) {
    try {
      parsedBlockReasons = JSON.parse(paper.blockReasons);
    } catch(e) {
      // fallback
    }
  }"""
new_block = """  let parsedBlockReasons: Array<{code: string, description: string}> = [];
  if (paper.blockReasons) {
    try {
      const parsed = JSON.parse(paper.blockReasons);
      if (Array.isArray(parsed)) {
        parsedBlockReasons = parsed;
      }
    } catch(e) {
      // fallback
    }
  }"""
code = code.replace(old_block, new_block)

with open('src/app/papers/[id]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
