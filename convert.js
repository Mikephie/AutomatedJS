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
      let ruleSection = '';      // For [Rule] (filter_local)
      let rewriteSection = '';   // For [URL Rewrite] (Surge) or [Rewrite] (Loon)
      let scriptSection = '';    // For [Script]
      let mitmSection = '';      // For [MITM]
      let metadata = {
        name: baseName,
        desc: '',
        author: '',
        icon: '',
        category: ''
      };

      lines.forEach(line => {
        // Parse metadata from comments
        if (line.startsWith('#!desc=')) metadata.desc = line.replace('#!desc=', '');
        else if (line.startsWith('#!category=')) metadata.category = line.replace('#!category=', '');
        else if (line.startsWith('#!author=')) metadata.author = line.replace('#!author=', '');
        else if (line.startsWith('#!icon=')) metadata.icon = line.replace('#!icon=', '');
        
        // Parse sections
        else if (line.startsWith('[filter_local]')) ruleSection += '[Rule]\n';
        else if (line.startsWith('[rewrite_local]')) {
          rewriteSection += '[URL Rewrite]\n'; // Surge default, adjusted for Loon later
          scriptSection += '[Script]\n';
        }
        else if (line.startsWith('[mitm]')) mitmSection += '[MITM]\n';
        else if (line.includes('url-regex') && line.includes('reject') && ruleSection) {
          // Only add to [Rule] if [filter_local] is present
          const [, pattern] = line.match(/url-regex,(.*?),reject/) || [];
          if (pattern) ruleSection += `URL-REGEX,"${pattern}",REJECT\n`;
        }
        else if (line.includes(' - reject') && rewriteSection) {
          // Only add to [URL Rewrite]/[Rewrite] if [rewrite_local] is present
          const [, pattern] = line.match(/(^.*?)\s+-\s+reject/) || [];
          if (pattern) rewriteSection += `${pattern} - reject\n`;
        }
        else if (line.includes('url script-response-body')) {
          const [, url, scriptUrl] = line.match(/(^.*?)\s+url\s+script-response-body\s+(.*)/) || [];
          if (url && scriptUrl) {
            scriptSection += `${baseName} = type=http-response, pattern=${url}, script-path=${scriptUrl}, requires-body=true, max-size=-1, timeout=60\n`;
          }
        }
        else if (line.startsWith('hostname =')) {
          const [, hostname] = line.match(/hostname = (.*)/) || [];
          if (hostname) mitmSection += `hostname = %APPEND% ${hostname}\n`; // Surge keeps %APPEND%
        }
      });

      // Surge .sgmodule format with #! metadata and spacing
      const surgeHeader = `#!name=${metadata.name}\n` +
                          (metadata.desc ? `#!desc=${metadata.desc}\n` : '') +
                          (metadata.author ? `#!author=${metadata.author}\n` : '') +
                          (metadata.icon ? `#!icon=${metadata.icon}\n` : '') +
                          (metadata.category ? `#!category=${metadata.category}\n` : '');
      const surgeModule = `${surgeHeader}\n${ruleSection}${rewriteSection}\n${scriptSection}\n${mitmSection}`.trim();
      const surgeOutput = path.join(surgeDir, `${baseName}.sgmodule`);
      await fs.writeFile(surgeOutput, surgeModule);
      console.log(`Generated ${baseName}.sgmodule for Surge`);
      console.log(`Surge content (first 200 chars): ${surgeModule.substring(0, 200)}...`);

      // Loon .plugin format with #! metadata and spacing
      const loonHeader = `#!name=${metadata.name}\n` +
                         (metadata.desc ? `#!desc=${metadata.desc}\n` : '') +
                         (metadata.author ? `#!author=${metadata.author}\n` : '') +
                         (metadata.icon ? `#!icon=${metadata.icon}\n` : '') +
                         (metadata.category ? `#!category=${metadata.category}\n` : '');

      // Adjust for Loon: rewriteSection becomes [Rewrite], reset scriptSection and mitmSection
      if (rewriteSection) rewriteSection = rewriteSection.replace('[URL Rewrite]', '[Rewrite]');
      scriptSection = '[Script]\n';
      mitmSection = '[MITM]\n';
      lines.forEach(line => {
        if (line.includes('url script-response-body')) {
          const [, url, scriptUrl] = line.match(/(^.*?)\s+url\s+script-response-body\s+(.*)/) || [];
          if (url && scriptUrl) {
            scriptSection += `http-response ${url} script-path=${scriptUrl}, requires-body=true, timeout=60, tag=${baseName}\n`;
          }
        }
        else if (line.startsWith('hostname =')) {
          const [, hostname] = line.match(/hostname = (.*)/) || [];
          if (hostname) mitmSection += `hostname = ${hostname}\n`; // No %APPEND% for Loon
        }
      });

      const loonPlugin = `${loonHeader}\n${ruleSection}${rewriteSection}\n${scriptSection}\n${mitmSection}`.trim();
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
