const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  fs.mkdirSync(path.join(__dirname, '../public/icons'), { recursive: true });
  for (const size of [192, 512]) {
    const data = await page.evaluate(size => {
      const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
      const c = canvas.getContext('2d'); c.scale(size / 192, size / 192);
      c.fillStyle = '#187568'; c.fillRect(0, 0, 192, 192);
      c.strokeStyle = '#fff'; c.lineWidth = 7; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(96, 58); c.quadraticCurveTo(69, 44, 38, 53); c.lineTo(38, 132); c.quadraticCurveTo(69, 123, 96, 139); c.quadraticCurveTo(123, 123, 154, 132); c.lineTo(154, 53); c.quadraticCurveTo(123, 44, 96, 58); c.lineTo(96, 139); c.stroke();
      return canvas.toDataURL('image/png').split(',')[1];
    }, size);
    fs.writeFileSync(path.join(__dirname, `../public/icons/icon-${size}.png`), Buffer.from(data, 'base64'));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
