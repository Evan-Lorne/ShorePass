const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/app/api/sync/push/route.ts');
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  "action: existing ? 'update' : 'create'",
  "action: 'sync'"
);
fs.writeFileSync(file, code);
