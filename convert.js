const fs = require('fs-extra');
const path = require('path');

async function convertScripts() {
  const inputDir = 'QuantumultX';
  const surgeDir = 'Surge';
  const loonDir = 'Loon';

  // Ensure output directories exist
  await fs.ensureDir(surgeDir);
  await fs.ensureDir(loonDir);

  // Read all files from QuantumultX directory
  const files = await fs.readdir(inputDir);

  for (const file of files) {
    if (file.endsWith('.js')) {
      const inputPath = path.join(inputDir, file);
      const script = await fs.readFile(inputPath, 'utf-8');

      // Conversion for Surge
      let surgeScript = script
        .replace(/\$httpClient\.get/g, '$http.get') // QuantumultX -> Surge HTTP client
        .replace(/\$httpClient\.post/g, '$http.post')
        .replace(/\$persistentStore/g, '$prefs')   // Persistent storage
        .replace(/\$notification\.post/g, '$notify') // Notification
        .replace(/QuantumultX/g, 'Surge');          // Generic replacement

      // Conversion for Loon
      let loonScript = script
        .replace(/\$httpClient\.get/g, '$http.get') // QuantumultX -> Loon HTTP client
        .replace(/\$httpClient\.post/g, '$http.post')
        .replace(/\$persistentStore/g, '$config')   // Persistent storage
        .replace(/\$notification\.post/g, '$notify') // Notification
        .replace(/QuantumultX/g, 'Loon');           // Generic replacement

      // Output file paths
      const baseName = path.basename(file, '.js');
      const surgeOutput = path.join(surgeDir, `${baseName}.js`);
      const loonOutput = path.join(loonDir, `${baseName}.js`);

      // Write converted scripts
      await fs.writeFile(surgeOutput, surgeScript);
      await fs.writeFile(loonOutput, loonScript);

      console.log(`Converted ${file} to Surge and Loon formats`);
    }
  }

  console.log('All conversions complete!');
}

// Run the conversion
convertScripts().catch(err => {
  console.error('Conversion failed:', err);
  process.exit(1); // Exit with error code for GitHub Actions
});
