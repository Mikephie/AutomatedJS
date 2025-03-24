async function convertScripts() {
    const fs = require('fs-extra');
    const path = require('path');

    const inputDir = 'QuantumultX';
    const surgeDir = 'Surge';
    const loonDir = 'Loon';

    try {
        // Ensure output directories exist
        console.log(`Ensuring Surge directory exists: ${surgeDir}`);
        await fs.ensureDir(surgeDir);
        console.log(`Surge directory created/exists: ${await fs.pathExists(surgeDir)}`);

        console.log(`Ensuring Loon directory exists: ${loonDir}`);
        await fs.ensureDir(loonDir);
        console.log(`Loon directory created/exists: ${await fs.pathExists(loonDir)}`);

        // Read all files from QuantumultX directory
        console.log(`Reading files from ${inputDir}`);
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

                // Track if rewrite rules are added
                let hasRewriteRules = false;

                lines.forEach(line => {
                    // Parse metadata from comments
                    if (line.startsWith('#!name=')) metadata.name = line.replace('#!name=', '');
                    else if (line.startsWith('#!desc=')) metadata.desc = line.replace('#!desc=', '');
                    else if (line.startsWith('#!category=')) metadata.category = line.replace('#!category=', '');
                    else if (line.startsWith('#!author=')) metadata.author = line.replace('#!author=', '');
                    else if (line.startsWith('#!icon=')) metadata.icon = line.replace('#!icon=', '');
                    
                    // Parse sections
                    else if (line.startsWith('[filter_local]')) ruleSection += '[Rule]\n';
                    else if (line.startsWith('[rewrite_local]')) {
                        rewriteSection += '[URL Rewrite]\n';
                        scriptSection += '[Script]\n';
                    }
                    else if (line.startsWith('[Script]')) {
                        // Reset script section to ensure we don't duplicate the header
                        scriptSection = '[Script]\n';
                    }
                    else if (line.startsWith('[mitm]')) mitmSection += '[MITM]\n';
                    else if (line.includes('url-regex') && line.includes('reject') && ruleSection) {
                        // Handle specific URL-REGEX patterns with '^' anchor
                        if (line.includes('https://m-station2.axs.com.sg/AXSMobile/WebView/MarketPlace')) {
                            ruleSection += 'URL-REGEX,"^https://m-station2.axs.com.sg/AXSMobile/WebView/MarketPlace",REJECT\n';
                        } else if (line.includes('https://m-station2.axs.com.sg/AXSMobile/highlight')) {
                            ruleSection += 'URL-REGEX,"^https://m-station2.axs.com.sg/AXSMobile/highlight",REJECT\n';
                        } else {
                            const [, pattern] = line.match(/url-regex,(.*?),reject/) || [];
                            if (pattern) ruleSection += `URL-REGEX,"${pattern}",REJECT\n`;
                        }
                    }
                    else if (line.includes(' - reject') && rewriteSection) {
                        const [, pattern] = line.match(/(^.*?)\s+-\s+reject/) || [];
                        if (pattern) {
                            rewriteSection += `${pattern} - reject\n`;
                            hasRewriteRules = true; // Mark that we have rewrite rules
                        }
                    }
                    else if (line.includes('url script-response-body')) {
                        const [, url, scriptUrl] = line.match(/(^.*?)\s+url\s+script-response-body\s+(.*)/) || [];
                        if (url && scriptUrl) {
                            scriptSection += `${baseName} = type=http-response, pattern=${url}, script-path=${scriptUrl}, requires-body=true, max-size=-1, timeout=60\n`;
                        }
                    }
                    else if (line.includes('type=http-response')) {
                        // Already in Surge format, just add it directly
                        scriptSection += `${line}\n`;
                    }
                    else if (line.startsWith('hostname =')) {
                        const [, hostname] = line.match(/hostname = (.*)/) || [];
                        // Check if we've already added [MITM] to the section
                        if (!mitmSection.includes('[MITM]')) {
                            mitmSection = '[MITM]\n';
                        }
                        if (hostname) mitmSection += `hostname = %APPEND% ${hostname}\n`;
                    }
                });

                // Surge .sgmodule format with #! metadata and spacing
                const surgeHeader = `#!name=${metadata.name}\n` +
                                    (metadata.desc ? `#!desc=${metadata.desc}\n` : '') +
                                    (metadata.author ? `#!author=${metadata.author}\n` : '') +
                                    (metadata.icon ? `#!icon=${metadata.icon}\n` : '') +
                                    (metadata.category ? `#!category=${metadata.category}\n` : '');
                
                // Only include [URL Rewrite] if there are actual rewrite rules
                let surgeRewriteSection = hasRewriteRules ? rewriteSection : '';
                
                // Ensure proper spacing and [MITM] section appears before hostname line
                const surgeModule = `${surgeHeader}\n${ruleSection}${surgeRewriteSection}${scriptSection}\n${mitmSection}`.trim();
                const surgeOutput = path.join(surgeDir, `${baseName}.sgmodule`);
                console.log(`Writing Surge file: ${surgeOutput}`);
                await fs.writeFile(surgeOutput, surgeModule, { flag: 'w', encoding: 'utf-8' });
                console.log(`Generated ${baseName}.sgmodule for Surge`);
                console.log(`Surge file exists: ${await fs.pathExists(surgeOutput)}`);
                console.log(`Surge content (first 200 chars): ${surgeModule.substring(0, 200)}...`);

                // Loon .plugin format with #! metadata and spacing
                const loonHeader = `#!name=${metadata.name}\n` +
                                 (metadata.desc ? `#!desc=${metadata.desc}\n` : '') +
                                 (metadata.author ? `#!author=${metadata.author}\n` : '') +
                                 (metadata.icon ? `#!icon=${metadata.icon}\n` : '') +
                                 (metadata.category ? `#!category=${metadata.category}\n` : '');

                // Only include [Rewrite] if there are actual rewrite rules
                let loonRewriteSection = hasRewriteRules ? rewriteSection.replace('[URL Rewrite]', '[Rewrite]') : '';
                
                // Rebuild script section for Loon
                let loonScriptSection = '[Script]\n';
                lines.forEach(line => {
                    if (line.includes('url script-response-body')) {
                        const [, url, scriptUrl] = line.match(/(^.*?)\s+url\s+script-response-body\s+(.*)/) || [];
                        if (url && scriptUrl) {
                            loonScriptSection += `http-response ${url} script-path=${scriptUrl}, requires-body=true, timeout=60, tag=${baseName}\n`;
                        }
                    }
                    else if (line.includes('type=http-response')) {
                        // Convert Surge format to Loon format
                        const pattern = line.match(/pattern=([^,]+)/)?.[1];
                        const scriptPath = line.match(/script-path=([^,]+)/)?.[1];
                        const name = line.match(/^([^=]+)=/)?.[1]?.trim();
                        
                        if (pattern && scriptPath) {
                            loonScriptSection += `http-response ${pattern} script-path=${scriptPath}, requires-body=true, timeout=60, tag=${name || baseName}\n`;
                        }
                    }
                });
                
                // Build MITM section for Loon
                let loonMitmSection = '[MITM]\n';
                lines.forEach(line => {
                    if (line.startsWith('hostname =')) {
                        const [, hostname] = line.match(/hostname = (.*)/) || [];
                        if (hostname) {
                            // For Loon, we don't need %APPEND%
                            loonMitmSection += `hostname = ${hostname.replace('%APPEND% ', '')}\n`;
                        }
                    }
                });

                // For Loon format, we need proper spacing between sections
                const loonPlugin = `${loonHeader}\n${ruleSection}${loonRewriteSection}${loonScriptSection}${loonMitmSection}`.trim();
                const loonOutput = path.join(loonDir, `${baseName}.plugin`);
                console.log(`Writing Loon file: ${loonOutput}`);
                await fs.writeFile(loonOutput, loonPlugin, { flag: 'w', encoding: 'utf-8' });
                console.log(`Generated ${baseName}.plugin for Loon`);
                console.log(`Loon file exists: ${await fs.pathExists(loonOutput)}`);
            }
        }

        console.log('All conversions complete!');
    } catch (err) {
        console.error('Error during conversion:', err);
        process.exit(1);
    }
}

convertScripts().catch(err => {
    console.error('Error during script execution:', err);
    process.exit(1);
});
