const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'Frontend', 'src');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? 
            walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir(srcDir, function(filePath) {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let initialContent = content;
        
        // Regex to catch || 'http://localhost:3000' and || 'http://192.168.1.56:3000' and 'http://localhost:5000'
        content = content.replace(/import\.meta\.env\.VITE_API_URL\s*\|\|\s*['"]http:\/\/(localhost|192\.168\.1\.56):\d+['"]/g, "import.meta.env.VITE_API_URL || ''");
        
        if (content !== initialContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated: ${filePath}`);
        }
    }
});
