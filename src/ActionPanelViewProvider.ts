import * as vscode from "vscode";
import * as path from "path";

interface SelectionStats {
  fileCount: number;
  totalSize: string;
  totalTokens: string;
  showFullTree: boolean;
}

export class ActionPanelViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "codebase-prompt-packer-action-view";
  private _view?: vscode.WebviewView;

  // Store the latest stats to resend when the view becomes visible
  private _latestStats?: SelectionStats;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Listen for messages from the webview
    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "copyPrompt":
          vscode.commands.executeCommand(
            "codebasePromptPacker.copyPackedPrompt"
          );
          break;
        case "downloadPrompt":
          vscode.commands.executeCommand(
            "codebasePromptPacker.downloadPackedPrompt"
          );
          break;
        case "previewPrompt":
          vscode.commands.executeCommand(
            "codebasePromptPacker.previewPackedPrompt"
          );
          break;
        case "copyTreeOnly":
          vscode.commands.executeCommand("codebasePromptPacker.copyTreeOnly");
          break;
        case "toggleFullTree":
          vscode.commands.executeCommand(
            "codebasePromptPacker.toggleFullStructure"
          );
          break;
        case "selectAll":
          vscode.commands.executeCommand("codebasePromptPacker.selectAll");
          break;
        case "deselectAll":
          vscode.commands.executeCommand("codebasePromptPacker.deselectAll");
          break;
      }
    });

    // NEW: When the view becomes visible, update stats if available
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible && this._latestStats) {
        this.updateStats(this._latestStats);
      }
    });

    // THE FIX: If stats were computed before this webview was created,
    // send them now so the UI is initialized with correct values.
    if (this._latestStats) {
      this.updateStats(this._latestStats);
    }
  }

  // Update the WebView with current selection statistics
  public updateStats(stats: SelectionStats): void {
    this._latestStats = stats; // Always keep the latest stats
    if (this._view) {
      this._view.webview.postMessage({
        type: "updateStats",
        stats: stats,
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const styleVSCode = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );
    const nonce = this._getNonce();
    const cspSource = webview.cspSource;

    return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https:; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Action Panel</title>
                <link rel="stylesheet" href="${styleVSCode}">
                <style>
                    /* fallback inline styles kept for safety */
                    body {
                        padding: 15px;
                        color: var(--vscode-foreground);
                        font-family: var(--vscode-font-family);
                        background-color: var(--vscode-panel-background);
                    }
                    button {
                        width: 100%;
                        padding: 8px 12px;
                        margin: 6px 0;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 2px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 13px;
                    }
                    button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    h4 {
                        margin-top: 15px;
                        margin-bottom: 8px;
                        font-size: 14px;
                        font-weight: 600;
                        border-bottom: 1px solid var(--vscode-panel-border);
                        padding-bottom: 5px;
                    }
                    #summary {
                        background-color: var(--vscode-editor-background);
                        border-radius: 3px;
                        padding: 10px;
                        margin-bottom: 10px;
                    }
                    #summary div {
                        margin: 4px 0;
                    }
                    .checkbox-container {
                        display: flex;
                        align-items: center;
                        margin: 8px 0;
                    }
                    input[type="checkbox"] {
                        margin-right: 8px;
                    }
                    .btn-section {
                        margin-top: 10px;
                    }
                    .btn-row {
                        display: flex;
                        gap: 8px;
                    }
                    .btn-row button {
                        flex: 1;
                    }
                </style>
            </head>
            <body>
                <h4>📊 SELECTION SUMMARY</h4>
                <div id="summary">
                    <div>Files: <span id="files-count">0</span></div>
                    <div>Size: <span id="files-size">0 B</span></div>
                    <div>Tokens: <span id="tokens-count">~0</span></div>
                </div>

                <h4>🚀 ACTIONS</h4>
                <div class="btn-section">
                    <button id="copy-btn">📋 Copy Prompt</button>
                    <button id="download-btn">💾 Download Codebase</button>
                    <button id="preview-btn">👁️ Preview Prompt</button>
                    <button id="copy-tree-btn">🌳 Copy Tree Only</button>
                    
                    <div class="btn-row">
                        <button id="select-all-btn">✅ Select All</button>
                        <button id="deselect-all-btn">❌ Deselect All</button>
                    </div>
                </div>

                <h4>⚙️ OPTIONS</h4>
                <div class="checkbox-container">
                    <input type="checkbox" id="full-tree-toggle" />
                    <label for="full-tree-toggle">Show full project structure (including unselected files)</label>
                </div>

                <script nonce="${nonce}">
                    (function() {
                        const vscode = acquireVsCodeApi();
                        
                        // DOM elements
                        const copyBtn = document.getElementById('copy-btn');
                        const downloadBtn = document.getElementById('download-btn');
                        const previewBtn = document.getElementById('preview-btn');
                        const copyTreeBtn = document.getElementById('copy-tree-btn');
                        const fullTreeToggle = document.getElementById('full-tree-toggle');
                        const selectAllBtn = document.getElementById('select-all-btn');
                        const deselectAllBtn = document.getElementById('deselect-all-btn');
                        
                        // Stats elements
                        const filesCount = document.getElementById('files-count');
                        const filesSize = document.getElementById('files-size');
                        const tokensCount = document.getElementById('tokens-count');
                        
                        // Button click event handlers
                        copyBtn.addEventListener('click', () => {
                            vscode.postMessage({ type: 'copyPrompt' });
                        });
                        
                        downloadBtn.addEventListener('click', () => {
                            vscode.postMessage({ type: 'downloadPrompt' });
                        });
                        
                        previewBtn.addEventListener('click', () => {
                            vscode.postMessage({ type: 'previewPrompt' });
                        });
                        
                        copyTreeBtn.addEventListener('click', () => {
                            vscode.postMessage({ type: 'copyTreeOnly' });
                        });
                        
                        selectAllBtn.addEventListener('click', () => {
                            vscode.postMessage({ type: 'selectAll' });
                        });
                        
                        deselectAllBtn.addEventListener('click', () => {
                            vscode.postMessage({ type: 'deselectAll' });
                        });
                        
                        fullTreeToggle.addEventListener('change', () => {
                            vscode.postMessage({ 
                                type: 'toggleFullTree',
                                value: fullTreeToggle.checked
                            });
                        });
                        
                        // Listen for messages from the extension
                        window.addEventListener('message', event => {
                            const message = event.data;
                            switch (message.type) {
                                case 'updateStats':
                                    // Update the stats display
                                    filesCount.textContent = message.stats.fileCount;
                                    filesSize.textContent = message.stats.totalSize;
                                    tokensCount.textContent = message.stats.totalTokens;
                                    fullTreeToggle.checked = message.stats.showFullTree;
                                    break;
                            }
                        });
                    }());
                </script>
            </body>
            </html>`;
  }

  // Simple nonce generator
  private _getNonce(): string {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
