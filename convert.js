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
    if (file.endsWith('.js')) { // Adjust extension if needed (e.g., '.conf')
      const inputPath = path.join(inputDir, file);
      const content = await fs.readFile(inputPath, 'utf-8');
      
      console.log(`Processing ${file}:`);
      console.log(`Original content (first 100 chars): ${content.substring(0, 100)}...`);

      const baseName = path.basename(file, '.js');

      // Parse QuantumultX content
      const lines = content.split('\n').filter(line => line.trim());
      let ruleSection = '';
      let scriptSection = '';
      let mitmSection = '';
      let hostname = '';

      lines.forEach(line => {
        if (line.startsWith('[filter_local]')) ruleSection += '[Rule]\n';
        else if (line.startsWith('[rewrite_local]')) scriptSection += '[Script]\n';
        else if (line.includes('url-regex') && line.includes('reject')) {
          const [, pattern] = line.match(/url-regex,(.*?),reject/) || [];
          if (pattern) {
            ruleSection += `URL-REGEX,"${pattern}",REJECT\n`;
          }
        }
        else if (line.includes('url script-response-body')) {
          const [, url, scriptUrl] = line.match(/(^.*?)\s+url\s+script-response-body\s+(.*)/) || [];
          if (url && scriptUrl) {
            // Surge script format
            scriptSection += `${baseName} = type=http-response, pattern=${url}, script-path=${scriptUrl}, requires-body=true, max-size=-1, timeout=60\n`;
            // Extract hostname for MITM (simplified extraction)
            const hostMatch = url.match(/https?:\/\/([^\/]+)/);
            if (hostMatch) hostname = hostMatch[1];
          }
        }
      });

      // Add MITM section for Surge
      if (hostname) mitmSection = `[MITM]\nhostname = %APPEND% ${hostname}`;

      // Surge .sgmodule format
      const surgeModule = `${ruleSection}${scriptSection}${mitmSection}`.trim();
      const surgeOutput = path.join(surgeDir, `${baseName}.sgmodule`);
      await fs.writeFile(surgeOutput, surgeModule);
      console.log(`Generated ${baseName}.sgmodule for Surge`);
      console.log(`Surge content (first 100 chars): ${surgeModule.substring(0, 100)}...`);

      // Loon .plugin format (reset scriptSection for Loon-specific format)
      scriptSection = '[Script]\n';
      lines.forEach(line => {
        if (line.includes('url script-response-body')) {
          const [, url, scriptUrl] = line.match(/(^.*?)\s+url\s+script-response-body\s+(.*)/) || [];
          if (url && scriptUrl) {
            scriptSection += `http-response ${url} script-path=${scriptUrl}, requires-body=true, timeout=60, tag=${baseName}\n`;
          }
        }
      });

      const loonPlugin = `[Plugin]\n` +
                         `Name = ${baseName}\n` +
                         `Desc = Converted from QuantumultX\n` +
                         `Author = xAI\n` +
                         `Version = 1.0\n` +
                         `URL = https://github.com/your-repo\n` +
                         `\n${ruleSection}${scriptSection}`.trim();
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
  process.exit(1);
});
