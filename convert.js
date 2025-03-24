async function convertScripts() {
    const fs = require('fs-extra');
    const path = require('path');

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
            const content = await fs.readFile(inputPath, 'utf-8');
            
            console.log(`Processing ${file}:`);
            console.log(`Original content (first 100 chars): ${content.substring(0, 100)}...`);

            const baseName = path.basename(file, '.js');

            // Parse QuantumultX content
            const lines = content.split('\n').filter(line => line.trim());
            let ruleSection = '';
            let rewriteSection = '';
            let scriptSection = '';
            let mitmSection = '';
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
                    rewriteSection += '[URL Rewrite]\n';
                    scriptSection += '[Script]\n';
                }
                else if (line.startsWith('[mitm]')) mitmSection += '[MITM]\n';
                // Handle URL-REGEX patterns
                else if (line.match(/URL-REGEX,\s*"\*?https:\/\/m-station2\.axs\.com\.sg\/AXSMobile\/WebView\/MarketPlace"/i)) {
                    ruleSection += 'URL-REGEX,"https://m-station2.axs.com.sg/AXSMobile/WebView/MarketPlace",REJECT\n';
                }
                else if (line.match(/URL-REGEX,\s*"Ahttps:\/\/m-station2\.axs\.com\.sg\/AXSMobile\/highlight"/i)) {
                    ruleSection += 'URL-REGEX,"https://m-station2.axs.com.sg/AXSMobile/highlight",REJECT\n';
                }
                else if (line.includes('url script-response-body')) {
                    const [, url, scriptUrl] = line.match(/(^.*?)\s+url\s+script-response-body\s+(.*)/) || [];
                    if (url && scriptUrl) {
                        scriptSection += `${baseName} = type=http-response, pattern=${url}, script-path=${scriptUrl}, requires-body=true, max-size=-1, timeout=60\n`;
                    }
                }
                else if (line.startsWith('hostname =')) {
                    const [, hostname] = line.match(/hostname = (.*)/) || [];
                    if (hostname) mitmSection += `hostname = %APPEND% ${hostname}\n`;
                }
            });

            // Surge .sgmodule format
            const surgeHeader = `#!name=${metadata.name}\n` +
                              (metadata.desc ? `#!desc=${metadata.desc}\n` : '') +
                              (metadata.author ? `#!author=${metadata.author}\n` : '') +
                              (metadata.icon ? `#!icon=${metadata.icon}\n` : '') +
                              (metadata.category ? `#!category=${metadata.category}\n` : '');
            const surgeModule = `${surgeHeader}\n${ruleSection}${rewriteSection}\n${scriptSection}\n${mitmSection}`.trim();
            const surgeOutput = path.join(surgeDir, `${baseName}.sgmodule`);
            await fs.writeFile(surgeOutput, surgeModule);
            console.log(`Generated ${baseName}.sgmodule for Surge`);

            // Loon .plugin format
            const loonHeader = `#!name=${metadata.name}\n` +
                             (metadata.desc ? `#!desc=${metadata.desc}\n` : '') +
                             (metadata.author ? `#!author=${metadata.author}\n` : '') +
                             (metadata.icon ? `#!icon=${metadata.icon}\n` : '') +
                             (metadata.category ? `#!category=${metadata.category}\n` : '');

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
                    if (hostname) mitmSection += `hostname = ${hostname}\n`;
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
