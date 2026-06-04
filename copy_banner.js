const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\ayush\\.gemini\\antigravity\\brain\\f03fabbf-cfcf-44b7-a593-a0a48791a70d\\logistics_bottom_banner_1780594755686.png';
const dest = path.join(__dirname, 'frontend', 'public', 'assets', 'bottom-banner.png');

try {
  fs.copyFileSync(src, dest);
  console.log('Copied bottom-banner.png successfully!');
} catch (err) {
  console.error('Failed to copy banner:', err.message);
}
