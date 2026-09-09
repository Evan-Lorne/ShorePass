with open('src/app/papers/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix parsing of blockReasons
old_reasons = """              if (paper.blockReasons) {
                try {
                   const parsed = JSON.parse(paper.blockReasons);
                   reasons = parsed.map((r: { code: string }) => r.code).join(", ");
                } catch(_) {}
              }"""
new_reasons = """              if (paper.blockReasons) {
                try {
                   const parsed = JSON.parse(paper.blockReasons);
                   if (Array.isArray(parsed)) {
                     reasons = parsed.map((r: { code: string }) => r.code).join(", ");
                   }
                } catch(_) {}
              }"""
code = code.replace(old_reasons, new_reasons)

# Fix year parse just in case
old_year = "const year = sp.year ? parseInt(sp.year as string, 10) : undefined;"
new_year = "const parsedYear = parseInt(sp.year as string, 10);\n  const year = !isNaN(parsedYear) ? parsedYear : undefined;"
code = code.replace(old_year, new_year)

# Translate remaining buttons
code = code.replace('>Filter<', '>筛选<')
code = code.replace('>View<', '>查看<')

with open('src/app/papers/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
