const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'node_modules', 'react-native-sqlite-storage', 'platforms', 'android', 'build.gradle');

if (!fs.existsSync(targetPath)) {
  console.log('react-native-sqlite-storage build.gradle not found; skipping patch.');
  process.exit(0);
}

let content = fs.readFileSync(targetPath, 'utf8');
const original = content;
content = content.replace(/\bjcenter\(\)/g, 'mavenCentral()');

if (content !== original) {
  fs.writeFileSync(targetPath, content);
  console.log('Patched react-native-sqlite-storage Gradle repositories.');
} else {
  console.log('No patch needed for react-native-sqlite-storage.');
}
