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

      // Base name without extension
      const baseName = path.basename(file, '.js');

      // Surge .sgmodule format
      const surgeModule = `[Script]\n` +
                          `${baseName} = type=http-request,pattern=^https?://example.com,script-path=${file},requires-body=true\n` +
                          `\n[Module]\n` +
                          `script = \n` +
                          `${script}`;
      const surgeOutput = path.join(surgeDir, `${baseName}.sgmodule`);
      await fs.writeFile(surgeOutput, surgeModule);
      console.log(`Generated ${baseName}.sgmodule for Surge`);

      // Loon .plugin format
      const loonPlugin = `[Plugin]\n` +
                         `Name = ${baseName}\n` +
                         `Desc = Converted from QuantumultX\n` +
                         `Author = xAI\n` +
                         `Version = 1.0\n` +
                         `URL = https://github.com/your-repo\n` +
                         `\n[Script]\n` +
                         `${script}`;
      const loonOutput = path.join(loonDir, `${baseName}.plugin`);
      await fs.writeFile(loonOutput, loonPlugin);
      console.log(`Generated ${baseName}.plugin for Loon`);
    }
  }

  console.log('All conversions complete!');
}

// Run the conversion
convertScripts().catch(err => {
  console.error('Conversion failed:', err);
  process.exit(1); // Exit with error code for GitHub Actions
});
