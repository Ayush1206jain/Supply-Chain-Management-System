const fs = require('fs');
const path = require('path');

const src = `C:\\Users\\ayush\\.gemini\\antigravity\\brain\\f03fabbf-cfcf-44b7-a593-a0a48791a70d\\landing_background_1780593259498.png`;
const destDir = path.join(__dirname, 'frontend', 'public');
const dest = path.join(destDir, 'background.png');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

try {
  fs.copyFileSync(src, dest);
  console.log(`Successfully copied background image to ${dest}`);
} catch (err) {
  console.error('Failed to copy background image:', err.message);
}
