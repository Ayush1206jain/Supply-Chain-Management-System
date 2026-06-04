const fs = require('fs');
const path = require('path');

const icons = [
  { name: 'manufacturer.png', src: 'C:\\Users\\ayush\\.gemini\\antigravity\\brain\\f03fabbf-cfcf-44b7-a593-a0a48791a70d\\manufacturer_icon_1780594270220.png' },
  { name: 'warehouse.png', src: 'C:\\Users\\ayush\\.gemini\\antigravity\\brain\\f03fabbf-cfcf-44b7-a593-a0a48791a70d\\warehouse_icon_1780594285876.png' },
  { name: 'distributor.png', src: 'C:\\Users\\ayush\\.gemini\\antigravity\\brain\\f03fabbf-cfcf-44b7-a593-a0a48791a70d\\distributor_icon_1780594300039.png' },
  { name: 'retailer.png', src: 'C:\\Users\\ayush\\.gemini\\antigravity\\brain\\f03fabbf-cfcf-44b7-a593-a0a48791a70d\\retailer_icon_1780594315003.png' },
  { name: 'customer.png', src: 'C:\\Users\\ayush\\.gemini\\antigravity\\brain\\f03fabbf-cfcf-44b7-a593-a0a48791a70d\\customer_icon_1780594327037.png' }
];

const destDir = path.join(__dirname, 'frontend', 'public', 'assets', 'icons');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

icons.forEach((icon) => {
  const dest = path.join(destDir, icon.name);
  try {
    fs.copyFileSync(icon.src, dest);
    console.log(`Copied ${icon.name} to ${dest}`);
  } catch (err) {
    console.error(`Failed to copy ${icon.name}:`, err.message);
  }
});
