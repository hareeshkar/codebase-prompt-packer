import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import glob from 'fast-glob';
import { CodebaseTreeProvider } from './CodebaseTreeProvider'; 
import { ActionPanelViewProvider } from './ActionPanelViewProvider';


// --- Interfaces (can be moved to a separate types.ts if preferred for larger projects) ---
interface FileInfo {
    path: string;
    content: string;
    size: number;
    lines: number;
    extension: string;
}

interface CodebaseStats {
    totalFiles: number;
    totalSize: number;
    totalLines: number;
    estimatedTokens: number;
    filesByType: Map<string, number>;
}

// --- CodebaseCopier Class Definition ---
class CodebaseCopier {
    private config: vscode.WorkspaceConfiguration;
    private readonly BATCH_SIZE = 50; // Process files in batches to avoid memory issues

    constructor() {
        // Updated config namespace to match rebrand
        this.config = vscode.workspace.getConfiguration('codebasePromptPacker');
    }

    // New helpers to respect settings
    private includeFileStatsEnabled(): boolean {
        return this.config.get<boolean>('includeFileStats', true);
    }

    private outputFormat(): 'markdown' | 'xml' {
        return this.config.get<'markdown'|'xml'>('outputFormat', 'markdown');
    }

    private estimateTokensEnabled(): boolean {
        return this.config.get<boolean>('estimateTokens', true);
    }

    /**
     * Guides the user to the sidebar and explains the workflow.
     */
    async copyCodebase() {
        // Focus the sidebar and show instructions to guide the user.
        await vscode.commands.executeCommand('workbench.view.extension.codebase-prompt-packer-container');
        
        vscode.window.showInformationMessage(
            '📋 Use the file tree in the "Codebase Prompt Packer" sidebar to select/deselect files, then click "Pack Prompt" or "Preview Packed Prompt".',
            'Got it!'
        );
    }

    /**
     * Copies only the directory tree structure to the clipboard.
     */
    async copyTreeOnly(rootPath?: string) {
        const workspaceFolder = rootPath || this.getWorkspaceFolder();
        if (!workspaceFolder) return;

        try {
            const files = await this.getFilteredFiles(workspaceFolder);
            // Show full filtered tree when copying tree-only
            const tree = this.generateDirectoryTree(files, workspaceFolder, undefined, true);
            
            await vscode.env.clipboard.writeText(tree);
            vscode.window.showInformationMessage('📁 Directory tree copied to clipboard!');
        } catch (error) {
            vscode.window.showErrorMessage(`Error copying directory tree: ${error}`);
        }
    }

    /**
     * Opens the extension's settings page.
     */
    openSettings() {
        // Open the new configuration scope
        vscode.commands.executeCommand('workbench.action.openSettings', 'codebasePromptPacker');
    }

    /**
     * Gets the path of the first workspace folder.
     */
    private getWorkspaceFolder(): string | undefined {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder open. Please open a folder to use Codebase Copier.');
            return undefined;
        }
        return folders[0].uri.fsPath;
    }

    /**
     * Filters files based on user-defined and default ignore patterns, text detection, and max file size.
     * Made public for reuse by CodebaseTreeProvider.
     */
    public async getFilteredFiles(rootPath: string): Promise<string[]> {
        const ignorePatterns = this.config.get<string[]>('ignorePatterns', []);
        const maxFileSize = this.config.get<number>('maxFileSize', 1048576); // default 1MB
        
        const defaultIgnores = [
            // System/version control folders
            '**/.git/**', '**/node_modules/**',
            // Generated/build folders
            '**/dist/**', '**/build/**', '**/out/**', '**/target/**',
            // Cache/temp folders
            '**/tmp/**', '**/temp/**', '**/.cache/**', '**/coverage/**', '**/.nyc_output/**',
            // IDE folders
            '**/.vscode/**', '**/.idea/**',
            // Binary files
            '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.bmp', '**/*.tiff', '**/*.tif', '**/*.webp', '**/*.ico',
            '**/*.mp4', '**/*.avi', '**/*.mov', '**/*.wmv', '**/*.flv', '**/*.webm', '**/*.mkv', '**/*.m4v',
            '**/*.mp3', '**/*.wav', '**/*.flac', '**/*.aac', '**/*.ogg', '**/*.m4a', '**/*.wma',
            '**/*.pdf', '**/*.doc', '**/*.docx', '**/*.xls', '**/*.xlsx', '**/*.ppt', '**/*.pptx',
            '**/*.zip', '**/*.rar', '**/*.7z', '**/*.tar', '**/*.gz', '**/*.bz2', '**/*.xz',
            '**/*.exe', '**/*.dll', '**/*.so', '**/*.dylib', '**/*.app', '**/*.deb', '**/*.rpm', '**/*.dmg', '**/*.pkg',
            '**/*.bin', '**/*.dat', '**/*.db', '**/*.sqlite', '**/*.sqlite3',
            // Large text files that are typically generated/lock files
            '**/package-lock.json', '**/yarn.lock', '**/pnpm-lock.yaml',
            '**/*.min.js', '**/*.min.css',
            // Log files
            '**/*.log',
            // Secrets / credentials (sensible defaults)
            '**/.env', '**/.env.*',
            '**/.ssh/**', '**/id_rsa', '**/id_dsa', '**/known_hosts',
            '**/*.pem', '**/*.key', '**/*.crt', '**/*.cer', '**/*.der', '**/*.p12', '**/*.pfx',
            '**/*credentials*', '**/*credential*', '**/*secret*', '**/*token*', '**/*apikey*', '**/*api-key*'
        ];

        const allIgnores = [...new Set([...ignorePatterns, ...defaultIgnores])];
        
        const files = await glob('**/*', {
            cwd: rootPath,
            ignore: allIgnores,
            onlyFiles: true,
            absolute: true,
            dot: false
        });

        const filteredFiles: string[] = [];
        for (const file of files) {
            try {
                const stats = fs.statSync(file);
                if (!stats.isFile()) continue;
                if (stats.size > maxFileSize) continue; // enforce size cap
                if (this.isTextFile(file)) {
                    filteredFiles.push(file);
                }
            } catch (error) {
                // Skip files that can't be accessed
                console.warn(`Skipping inaccessible file: ${file} - ${error}`);
                continue;
            }
        }
        return filteredFiles;
    }

    /**
     * Synchronously gets all directories within the rootPath, respecting system ignores.
     * Used for generating the full directory tree.
     */
    private getAllDirectoriesSync(rootPath: string): string[] {
        const dirs: string[] = [];
        const systemIgnores = new Set([
            '.git', 'node_modules', 'dist', 'build', 'out', 'target',
            'tmp', 'temp', '.cache', 'coverage', '.nyc_output', 
            '.vscode', '.idea'
        ]);

        const scanDirectory = (currentPath: string) => {
            try {
                const entries = fs.readdirSync(currentPath, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        if (systemIgnores.has(entry.name) || entry.name.startsWith('.')) {
                            continue; // Skip common system/IDE/build directories
                        }
                        const fullPath = path.join(currentPath, entry.name);
                        dirs.push(path.relative(rootPath, fullPath));
                        scanDirectory(fullPath); // Recurse into subdirectories
                    }
                }
            } catch (error) {
                // Silently skip directories that cannot be read
            }
        };
        scanDirectory(rootPath);
        return dirs;
    }

    /**
     * Determines if a file is likely a text file based on extension or content analysis.
     */
    private isTextFile(filePath: string): boolean {
        const textExtensions = new Set([
            // Programming languages
            '.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte', '.astro', '.py', '.java', '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx',
            '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.clj', '.dart', '.r', '.m', '.mm', '.pl', '.sh', '.bash', '.zsh', '.fish',
            '.lua', '.vim', '.el', '.lisp', '.hs', '.ml', '.fs', '.fsx', '.fsi',
            // Web technologies (SVG is text/XML)
            '.html', '.htm', '.xml', '.svg', '.css', '.scss', '.sass', '.less', '.styl',
            '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.properties',
            // Documentation and text
            '.md', '.mdx', '.txt', '.rst', '.tex', '.org', '.adoc', '.asciidoc',
            // Configuration and special files
            '.dockerfile', '.gitignore', '.gitattributes', '.editorconfig', '.eslintrc', '.prettierrc', '.babelrc', '.browserslistrc',
            '.nvmrc', '.python-version', '.ruby-version', '.node-version',
            // Database and API
            '.sql', '.graphql', '.gql', '.proto', '.prisma',
            // Build and deployment
            '.makefile', '.cmake', '.gradle', '.maven', '.sbt', '.msbuild',
            // Environment and config
            '.env', '.env.local', '.env.production', '.env.development', '.env.staging', '.env.test',
            // Template files
            '.hbs', '.mustache', '.ejs', '.pug', '.jade', '.twig',
            // Data files
            '.csv', '.tsv', '.jsonl', '.ndjson',
        ]);

        const ext = path.extname(filePath).toLowerCase();
        const fileName = path.basename(filePath).toLowerCase();
        
        // Check if it's a known text extension
        if (textExtensions.has(ext)) {
            return true;
        }

        // Special files without extensions (e.g., Dockerfile, README)
        const specialFilesWithoutExt = new Set([
            'dockerfile', 'makefile', 'readme', 'license', 'changelog', 'contributing', 'authors', 'notice', 'todo', 'copying',
            'install', 'news', 'thanks', 'version', 'manifest', 'gemfile', 'rakefile', 'guardfile', 'vagrantfile',
            'procfile', 'gruntfile', 'gulpfile', 'webpack',
        ]);
        if (!ext && specialFilesWithoutExt.has(fileName)) {
            return true;
        }

        // For files without extensions or unknown extensions, try to detect binary content
        if (!ext || !textExtensions.has(ext)) {
            try {
                const fd = fs.openSync(filePath, 'r');
                const buffer = Buffer.alloc(512); // Read first 512 bytes
                const bytesRead = fs.readSync(fd, buffer, 0, 512, 0);
                fs.closeSync(fd);
                
                if (bytesRead === 0) return true; // Empty file is text
                
                // Check for null bytes (common in binary files)
                for (let i = 0; i < bytesRead; i++) {
                    if (buffer[i] === 0) {
                        return false; // Found a null byte, likely binary
                    }
                }
                
                // Heuristic: If a high percentage of characters are printable ASCII, consider it text
                let printableCount = 0;
                for (let i = 0; i < bytesRead; i++) {
                    const byte = buffer[i];
                    // Printable ASCII range (32-126) plus common whitespace (tab, newline, carriage return)
                    if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
                        printableCount++;
                    }
                }
                return (printableCount / bytesRead) > 0.8; // More than 80% printable
            } catch (error) {
                // If we can't read it (e.g., permissions), assume it's not a text file for safety
                return false;
            }
        }
        return false;
    }

    /**
     * Processes files in batches to read their content and gather metadata.
     * Includes progress reporting and cancellation support.
     */
    private async processFilesInBatches(
        files: string[], 
        rootPath: string, 
        progress?: vscode.Progress<{increment?: number, message?: string}>,
        token?: vscode.CancellationToken
    ): Promise<FileInfo[] | null> {
        const fileInfos: FileInfo[] = [];
        const totalFiles = files.length;
        let processedFiles = 0;

        for (let i = 0; i < files.length; i += this.BATCH_SIZE) {
            if (token?.isCancellationRequested) {
                vscode.window.showInformationMessage('File processing cancelled.');
                return null;
            }

            const batch = files.slice(i, i + this.BATCH_SIZE);
            const promises = batch.map(async file => {
                try {
                    const content = await fs.promises.readFile(file, 'utf-8');
                    const relativePath = path.relative(rootPath, file);
                    const stats = await fs.promises.stat(file);
                    const lines = content.split('\n').length;
                    return { path: relativePath, content, size: stats.size, lines, extension: path.extname(file) };
                } catch (error) {
                    // Log a warning but don't stop the process for a single unreadable file
                    console.warn(`Skipped file due to read error: ${file} - ${error}`);
                    return null;
                }
            });

            const results = await Promise.all(promises);
            fileInfos.push(...results.filter((info): info is FileInfo => info !== null));
            processedFiles += batch.length;

            if (progress) {
                progress.report({ message: `Processed ${processedFiles}/${totalFiles} files...` });
            }
            await new Promise(resolve => setTimeout(resolve, 1)); // Small delay to prevent UI freezing
        }

        return fileInfos.sort((a, b) => a.path.localeCompare(b.path));
    }

    /**
     * Calculates statistics for the processed files.
     */
    private calculateStats(fileInfos: FileInfo[]): CodebaseStats {
        const stats: CodebaseStats = {
            totalFiles: fileInfos.length,
            totalSize: 0,
            totalLines: 0,
            estimatedTokens: 0,
            filesByType: new Map()
        };

        for (const file of fileInfos) {
            stats.totalSize += file.size;
            stats.totalLines += file.lines;
            // Estimate tokens: roughly 4 characters per token for English text
            stats.estimatedTokens += Math.ceil(file.content.length / 4);

            const ext = file.extension || 'no extension';
            stats.filesByType.set(ext, (stats.filesByType.get(ext) || 0) + 1);
        }
        return stats;
    }

    /**
     * Formats the file information and statistics into a single Markdown string.
     * Respects includeFileStats, estimateTokens, and outputFormat (markdown/xml minimal support).
     */
    private formatStructureFirst(fileInfos: FileInfo[], stats: CodebaseStats, rootPath: string, fullTreeFiles?: string[]): string {
        const projectName = path.basename(rootPath);
        let md = '';

        // Header with project info
        md += `# 📁 Project: ${projectName}\n\n`;
        
        // Quick stats summary
        md += `**📊 Project Overview (Selected Files):**\n`;
        md += `- Total Files: ${stats.totalFiles}\n`;
        md += `- Total Size: ${this.formatSize(stats.totalSize)}\n`;
        md += `- Total Lines: ${stats.totalLines.toLocaleString()}\n`;
        if (this.estimateTokensEnabled()) {
            md += `- Estimated Tokens: ~${stats.estimatedTokens.toLocaleString()} (approx. for LLMs)\n\n`;
        } else {
            md += `\n`;
        }

        // File types breakdown (top 10)
        if (stats.filesByType.size > 0) {
            md += `**📋 Top File Types:**\n`;
            const sortedTypes = Array.from(stats.filesByType.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);
            
            for (const [ext, count] of sortedTypes) {
                const displayExt = ext === 'no extension' ? '(no ext)' : ext;
                md += `- ${displayExt}: ${count}\n`;
            }

            // Compact legend (defined once for the tree)
            md += `\n🔖 Legend: ✓=included · ✗=excluded · 📂=folder\n\n`;
        }

        // Project Structure (Directory Tree)
        md += `## 🌳 Project Structure\n\n`;
        md += '```\n';
        const selectedRelative = new Set(fileInfos.map(f => f.path));
        if (fullTreeFiles && fullTreeFiles.length > 0) {
            md += this.generateDirectoryTree(fullTreeFiles, rootPath, selectedRelative, true);
        } else {
            md += this.generateDirectoryTree(fileInfos.map(f => path.join(rootPath, f.path)), rootPath, selectedRelative, false);
        }
        md += '\n```\n\n';

        // Files Content with clear separators
        md += `## 📄 Files Content\n\n`;
        md += `*Files are listed in alphabetical order by path.*\n\n`;

        for (const file of fileInfos) {
            const lang = this.getLanguageFromExtension(file.extension);
            md += `${'='.repeat(80)}\n`;
            md += `📄 **${file.path}**\n`;
            if (this.includeFileStatsEnabled()) {
                md += `Size: ${this.formatSize(file.size)} | Lines: ${file.lines}\n`;
            }
            md += `${'='.repeat(80)}\n\n`;
            md += `\`\`\`${lang}\n${file.content}\n\`\`\`\n\n`;
        }

        // Footer
        md += `---\n`;
        md += `*Generated by Codebase Prompt Packer for VS Code*\n`;
        md += `*Total files processed: ${stats.totalFiles} | Generated on: ${new Date().toLocaleString()}*\n`;

        // If user requested XML output, wrap in a simple XML envelope with CDATA (minimal support)
        if (this.outputFormat() === 'xml') {
            const safe = `<![CDATA[\n${md}\n]]>`;
            return `<project name="${projectName}">\n  <generatedAt>${new Date().toISOString()}</generatedAt>\n  <content>${safe}</content>\n</project>`;
        }

        return md;
    }

    /**
     * Generates a string representation of the directory tree,
     * including selected files and existing directories.
     */
    private generateDirectoryTree(files: string[], rootPath: string, selectedFilesRelative?: Set<string>, showAll: boolean = false): string {
		const tree = new Map<string, Set<string>>();
		const dirs = new Set<string>();
		const filesSet = new Set(files.map(f => path.relative(rootPath, f))); // Relative paths of provided files (selected or full)

		// Populate the tree map with directories and files derived from the given files
		for (const file of files) {
			const relativePath = path.relative(rootPath, file);
			const parts = relativePath.split(path.sep);
			
			let currentPath = '';
			for (let i = 0; i < parts.length - 1; i++) {
				const part = parts[i];
				const parentPath = currentPath;
				currentPath = currentPath ? path.join(currentPath, part) : part;
				
				dirs.add(currentPath); // Ensure all parent directories are marked as directories
				
				if (!tree.has(parentPath)) {
					tree.set(parentPath, new Set());
				}
				tree.get(parentPath)!.add(currentPath);
			}
			
			// Add the file itself
			const dirPath = parts.length > 1 ? path.join(...parts.slice(0, -1)) : '';
			if (!tree.has(dirPath)) {
				tree.set(dirPath, new Set());
			}
			tree.get(dirPath)!.add(relativePath);
		}

		// If showAll is enabled, ensure all existing directories are part of the tree structure
		// (this will reveal directories/files that are not in the 'files' list)
		if (showAll) {
			const allExistingDirs = this.getAllDirectoriesSync(rootPath);
			allExistingDirs.forEach(dir => dirs.add(dir));
			for (const dir of allExistingDirs) {
				const parts = dir.split(path.sep);
				let currentPath = '';
				for (let i = 0; i < parts.length; i++) {
					const part = parts[i];
					const parentPath = currentPath;
					currentPath = currentPath ? path.join(currentPath, part) : part;
					
					if (!tree.has(parentPath)) {
						tree.set(parentPath, new Set());
					}
					tree.get(parentPath)!.add(currentPath);
				}
			}
		}

		// Generate tree string
		const result: string[] = [];
		const visited = new Set<string>();
		
		const SELECTED_SYMBOL = '✓';
		const NOT_SELECTED_SYMBOL = '✗';
		const DIR_EMOJI = '📂';

		const generateLevel = (dirPath: string, prefix: string = '') => {
			if (visited.has(dirPath)) return;
			visited.add(dirPath);
			
			const items = Array.from(tree.get(dirPath) || []).sort((a, b) => {
				const aIsDir = dirs.has(a);
				const bIsDir = dirs.has(b);
				// Directories first, then files, then alphabetically
				if (aIsDir && !bIsDir) return -1;
				if (!aIsDir && bIsDir) return 1;
				return a.localeCompare(b);
			});
			
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				const isLast = i === items.length - 1;
				const itemName = path.basename(item);
				const isDirectory = dirs.has(item);
				
				const connector = isLast ? '└── ' : '├── ';
				let displayName = isDirectory ? `${itemName}/` : itemName;
				
				// Add indicator if a directory contains only non-text files (or is empty after filtering)
				if (isDirectory) {
					const fullDirPath = path.join(rootPath, item);
					try {
						const dirContents = fs.readdirSync(fullDirPath, { withFileTypes: true });
						const hasAnyTextFileInTree = filesSet.has(item) || Array.from(filesSet).some(file => file.startsWith(item + path.sep));
						
						if (!hasAnyTextFileInTree) {
							const containsFiles = dirContents.some(entry => entry.isFile());
							if (containsFiles) {
								let hasTextInside = false;
								for (const entry of dirContents) {
									if (!entry.isFile()) continue;
									try {
										if (this.isTextFile(path.join(fullDirPath, entry.name))) {
											hasTextInside = true;
											break;
										}
									} catch {
										// ignore errors checking individual files
									}
								}
								if (hasTextInside) {
									displayName += ' 📁 (contains text files but not selected)';
								} else {
									displayName += ' 📁 (contains non-text or ignored files)';
								}
							} else if (dirContents.length === 0) {
								displayName += ' (empty)';
							}
						}
					} catch (error) {
						// Ignore errors reading directory contents for display purposes
					}
				}
				
				// Annotation: use compact shorthand symbols for selected/unselected state
				// Only meaningful when showAll === true; when showAll is false the tree is built from selected files only.
				if (selectedFilesRelative) {
					if (isDirectory) {
						const hasSelectedInside = Array.from(selectedFilesRelative).some(s => s === item || s.startsWith(item + path.sep));
						const symbol = hasSelectedInside ? SELECTED_SYMBOL : (showAll ? NOT_SELECTED_SYMBOL : '');
						displayName = showAll ? `${DIR_EMOJI} ${displayName} ${symbol}` : `${DIR_EMOJI} ${displayName}`;
					} else {
						const symbol = selectedFilesRelative.has(item) ? SELECTED_SYMBOL : (showAll ? NOT_SELECTED_SYMBOL : '');
						displayName = symbol ? `${displayName} ${symbol}` : displayName;
					}
				}

				result.push(prefix + connector + displayName);
				
				if (isDirectory) {
					const nextPrefix = prefix + (isLast ? '    ' : '│   ');
					generateLevel(item, nextPrefix);
				}
			}
		};
		
		result.push(`${path.basename(rootPath)}/`); // Root folder name
		generateLevel('', ''); // Start generating from the root
		
		return result.join('\n');
    }

    /**
     * Maps file extensions to common language identifiers for Markdown code blocks.
     */
    private getLanguageFromExtension(ext: string): string {
        const langMap: { [key: string]: string } = {
            '.js': 'javascript', '.ts': 'typescript', '.jsx': 'jsx', '.tsx': 'tsx',
            '.py': 'python', '.java': 'java', '.c': 'c', '.cpp': 'cpp', '.cc': 'cpp',
            '.h': 'c', '.hpp': 'cpp', '.cs': 'csharp', '.php': 'php', '.rb': 'ruby',
            '.go': 'go', '.rs': 'rust', '.swift': 'swift', '.kt': 'kotlin', '.scala': 'scala',
            '.html': 'html', '.htm': 'html', '.css': 'css', '.scss': 'scss', '.sass': 'sass',
            '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.xml': 'xml', '.svg': 'xml',
            '.md': 'markdown', '.mdx': 'markdown', '.sh': 'bash', '.bash': 'bash',
            '.sql': 'sql', '.dockerfile': 'dockerfile', '.makefile': 'makefile',
            '.graphql': 'graphql', '.gql': 'graphql', '.vue': 'vue', '.svelte': 'svelte',
            '.env': 'plaintext' // .env files are typically plaintext
        };
        return langMap[ext.toLowerCase()] || ''; // Default to empty string for no specific highlighting
    }

    /**
     * Formats a byte size into a human-readable string (e.g., "1.23 MB").
     */
    public formatSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
    }

    /**
     * Processes a specific list of files, formats them, and copies the output to the clipboard.
     */
    public async processAndCopy(filesToProcess: string[], rootPath: string, includeFullTree: boolean = false) {
        if (!rootPath) return;

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Packing Selected Files...",
                cancellable: true
            }, async (progress, token) => {
                progress.report({ message: "Processing files..." });
                const fileInfos = await this.processFilesInBatches(filesToProcess, rootPath, progress, token);

                if (token.isCancellationRequested || !fileInfos) return; // Exit if cancelled or no files

                progress.report({ message: "Generating packed prompt..." });
                const stats = this.calculateStats(fileInfos);
                // If full tree requested, compute files for tree only (absolute paths)
                const fullTreeFiles = includeFullTree ? await this.getFilteredFiles(rootPath) : undefined;
                const output = this.formatStructureFirst(fileInfos, stats, rootPath, fullTreeFiles);

                progress.report({ message: "Copying to clipboard..." });
                await vscode.env.clipboard.writeText(output);
                vscode.window.showInformationMessage(`✅ ${stats.totalFiles} files packed to clipboard! (Approx. size: ${this.formatSize(output.length)})`);
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error packing files: ${error}`);
        }
    }

    /**
     * Processes a specific list of files and displays the formatted output in a new virtual editor tab.
     */
    public async previewSelected(filesToProcess: string[], rootPath: string, includeFullTree: boolean = false) {
        if (!rootPath) return;
        
        if (!filesToProcess || filesToProcess.length === 0) {
            vscode.window.showInformationMessage('No files selected to preview. Please select files in the sidebar.');
            return;
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Generating Packed Prompt Preview...",
                cancellable: true
            }, async (progress, token) => {
                progress.report({ message: "Processing files..." });
                const fileInfos = await this.processFilesInBatches(filesToProcess, rootPath, progress, token);

                if (token.isCancellationRequested || !fileInfos) return; // Exit if cancelled or no files

                progress.report({ message: "Generating output..." });
                const stats = this.calculateStats(fileInfos);
                const fullTreeFiles = includeFullTree ? await this.getFilteredFiles(rootPath) : undefined;
                const output = this.formatStructureFirst(fileInfos, stats, rootPath, fullTreeFiles);

                // Create and show a virtual document in a new editor tab
                const doc = await vscode.workspace.openTextDocument({
                    content: output,
                    language: 'markdown' // Set language to markdown for syntax highlighting
                });

                await vscode.window.showTextDocument(doc, { 
                    viewColumn: vscode.ViewColumn.Beside,
                    preview: true
                });

                vscode.window.showInformationMessage('🔎 Preview generated in a new editor tab.');
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error generating preview: ${error}`);
        }
    }
}

// --- Extension Activation and Deactivation ---
export function activate(context: vscode.ExtensionContext) {
    console.log('Codebase Prompt Packer extension is now active!');
    
    try {
        // Instantiate the main logic class
        const copier = new CodebaseCopier();

        // Determine the workspace folder (or empty string if none open)
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

        // Create and register the Action Panel Provider for the sidebar
        const actionPanelProvider = new ActionPanelViewProvider(context.extensionUri);
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                ActionPanelViewProvider.viewType,
                actionPanelProvider
            )
        );

        // Create and register the Tree Provider for the sidebar view
        const treeProvider = new CodebaseTreeProvider(workspaceFolder, (root) => copier.getFilteredFiles(root));
        
        // Create the Tree View instance
        const treeView = vscode.window.createTreeView('codebase-prompt-packer-view', {
            treeDataProvider: treeProvider,
            showCollapseAll: true,
            canSelectMany: false,
            manageCheckboxStateManually: true
        });

        // Register handler for checkbox state changes in the tree view
        if (treeView.onDidChangeCheckboxState) {
            context.subscriptions.push(
                treeView.onDidChangeCheckboxState((e) => treeProvider.handleCheckboxChange([e]))
            );
        }

        // Set up callback to update stats in the action panel when selection changes
        treeProvider.setPreviewUpdateCallback((selectedFiles, includeFullTree) => {
            // Get file count from selected files
            const fileCount = selectedFiles.length;
            
            // Estimate total size
            let totalSize = 0;
            for (const file of selectedFiles) {
                try {
                    const stats = fs.statSync(file);
                    totalSize += stats.size;
                } catch (err) {
                    // Skip files that can't be accessed
                }
            }
            
            // Estimate tokens (very rough approximation)
            const estimatedTokens = Math.ceil(totalSize / 4);
            
            // Update the action panel with current stats
            actionPanelProvider.updateStats({
                fileCount,
                totalSize: copier.formatSize ? copier.formatSize(totalSize) : `${(totalSize / 1024).toFixed(2)} KB`,
                totalTokens: `~${estimatedTokens.toLocaleString()}`,
                showFullTree: includeFullTree
            });
        });

        // Register all commands FIRST before any other logic
        const commands = [
            vscode.commands.registerCommand('codebasePromptPacker.initiatePacking', () => {
                console.log('initiatePacking command executed');
                return copier.copyCodebase();
            }),

            vscode.commands.registerCommand('codebasePromptPacker.copyTreeOnly', () => {
                console.log('copyTreeOnly command executed');
                return copier.copyTreeOnly();
            }),

            vscode.commands.registerCommand('codebasePromptPacker.openSettings', () => {
                console.log('openSettings command executed');
                return copier.openSettings();
            }),

            vscode.commands.registerCommand('codebasePromptPacker.refresh', () => {
                console.log('refresh command executed');
                return treeProvider.refresh();
            }),

            vscode.commands.registerCommand('codebasePromptPacker.selectAll', () => {
                console.log('selectAll command executed');
                return treeProvider.selectAll();
            }),

            vscode.commands.registerCommand('codebasePromptPacker.deselectAll', () => {
                console.log('deselectAll command executed');
                return treeProvider.deselectAll();
            }),

            vscode.commands.registerCommand('codebasePromptPacker.copyPackedPrompt', async () => {
                console.log('copyPackedPrompt command executed');
                const selectedFiles = treeProvider.getSelectedFiles();
                const includeFullTree = treeProvider.isFullTreeEnabled();
                await copier.processAndCopy(selectedFiles, workspaceFolder, includeFullTree);
            }),

            vscode.commands.registerCommand('codebasePromptPacker.previewPackedPrompt', async () => {
                console.log('previewPackedPrompt command executed');
                const selectedFiles = treeProvider.getSelectedFiles();
                const includeFullTree = treeProvider.isFullTreeEnabled();
                await copier.previewSelected(selectedFiles, workspaceFolder, includeFullTree);
            }),

            vscode.commands.registerCommand('codebasePromptPacker.toggleFullStructure', () => {
                console.log('toggleFullStructure command executed');
                try {
                    treeProvider.toggleFullTree();
                    vscode.window.showInformationMessage(`Show full project structure: ${treeProvider.isFullTreeEnabled() ? 'Enabled' : 'Disabled'}`);
                } catch (err) {
                    vscode.window.showErrorMessage('Error toggling full project structure: ' + String(err));
                }
            }),

            vscode.commands.registerCommand('codebasePromptPacker.cancel', async () => {
                console.log('cancel command executed');
                treeProvider.deselectAll();
                await vscode.commands.executeCommand('workbench.action.closeSidebar');
                vscode.window.showInformationMessage('Selection cleared and sidebar closed.');
            })
        ];

        // Add all commands to subscriptions
        context.subscriptions.push(...commands);

        // NEW: When the Actions & Summary webview becomes visible, always update stats
        vscode.window.onDidChangeVisibleTextEditors(() => {
            // This event is not directly for webviews, so instead:
            // Use the webviewView API to get the view and update if visible
            const webviewView = (actionPanelProvider as any)._view as vscode.WebviewView | undefined;
            if (webviewView && webviewView.visible) {
                const selectedFiles = treeProvider.getSelectedFiles();
                const includeFullTree = treeProvider.isFullTreeEnabled();
                let totalSize = 0;
                for (const file of selectedFiles) {
                    try {
                        const stats = fs.statSync(file);
                        totalSize += stats.size;
                    } catch (err) {}
                }
                const estimatedTokens = Math.ceil(totalSize / 4);
                actionPanelProvider.updateStats({
                    fileCount: selectedFiles.length,
                    totalSize: copier.formatSize ? copier.formatSize(totalSize) : `${(totalSize / 1024).toFixed(2)} KB`,
                    totalTokens: `~${estimatedTokens.toLocaleString()}`,
                    showFullTree: includeFullTree
                });
            }
        });

        console.log('All commands registered successfully');
        
    } catch (error) {
        console.error('Error activating Codebase Prompt Packer extension:', error);
        vscode.window.showErrorMessage(`Failed to activate Codebase Prompt Packer: ${error}`);
    }
}

// This method is called when your extension is deactivated
export function deactivate() {
    // Clean up any resources if necessary
}

// Explicitly export the command for VS Code command discovery
export const initiatePacking = activate;