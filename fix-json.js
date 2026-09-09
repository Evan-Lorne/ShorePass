const fs = require('fs');
let data = JSON.parse(fs.readFileSync('paper1.json', 'utf8'));

function traverse(obj) {
  for (let key in obj) {
    if (obj[key] !== null && typeof obj[key] === 'object') {
      if (key === 'options' || key === 'optionsPool') {
        obj[key].forEach(opt => {
          if (!opt.content || opt.content.trim() === '') {
            opt.content = '[图片或空白选项]';
          }
        });
      }
      traverse(obj[key]);
    }
  }
}

traverse(data);
fs.writeFileSync('paper1.json', JSON.stringify(data, null, 2));
