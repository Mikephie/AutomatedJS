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

  if (files.length === 0) {
    console.log('No .js files found in QuantumultX/ directory');
    return;
  }

  for (const file of files) {
    if (file.endsWith('.js')) {
      const inputPath = path.join(inputDir, file);
      const script = await fs.readFile(inputPath, 'utf-8');
      
      console.log(`Processing ${file}:`);
      console.log(`Original content (first 100 chars): ${script.substring(0, 100)}...`);

      // Conversion for Surge
      let surgeScript = script
        .replace(/\$httpClient\.get/g, '$http.get') // HTTP GET
        .replace(/\$httpClient\.post/g, '$http.post') // HTTP POST
        .replace(/\$persistentStore\.write/g, '$prefs.setValueForKey') // Persistent storage write
        .replace(/\$persistentStore\.read/g, '$prefs.valueForKey')     // Persistent storage read
        .replace(/\$notification\.post/g, '$notify')                  // Notification
        .replace(/Quantumult ?X/gi, 'Surge');                         // Case-insensitive name replacement

      // Conversion for Loon
      let loonScript = script
        .replace(/\$httpClient\.get/g, '$http.get') // HTTP GET
        .replace(/\$httpClient\.post/g, '$http.post') // HTTP POST
        .replace(/\$persistentStore\.write/g, '$config.set') // Persistent storage write
        .replace(/\$persistentStore\.read/g, '$config.get')  // Persistent storage read
        .replace(/\$notification\.post/g, '$notify')        // Notification
        .replace(/Quantumult ?X/gi, 'Loon');                // Case-insensitive name replacement

      // Check if any changes were made
      const surgeChanged = surgeScript !== script;
      const loonChanged = loonScript !== script;

      console.log(`Surge conversion applied: ${surgeChanged}`);
      console.log(`Loon conversion applied: ${loonChanged}`);

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
