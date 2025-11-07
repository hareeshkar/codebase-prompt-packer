# 📦 Codebase Packer

**Instantly convert your entire codebase into structured, LLM-ready context.**

> Turn your project into beautifully formatted, context-ready data for any AI model — in seconds.
Works seamlessly with ChatGPT, Claude, Gemini, Copilot, Grok, DeepSeek, Mistral, Qwen, and more.

---

## 🔖 Table of contents

- [Key features](#-key-features)
- [Quick start](#-quick-start)
- [Interface](#-interface)
- [Sample generated output](#-sample-generated-output)
  - [Project structure (example)](#-project-structure)
  - [Files content (collapsible)](#-files-content)
- [Configuration](#-configuration)
- [Commands](#-commands)
- [Use cases](#-use-cases)
- [Technical architecture](#-technical-architecture)
- [Development & testing](#-development--testing)
- [Release notes](#-release-notes)
- [FAQ](#-faq)
- [Contributing](#-contributing)
- [License & support](#-license--support)

---

## ✨ Key Features

- **Interactive file selection**: Checkbox-enabled file tree with hierarchical parent/child selection
- **Smart filtering**: Automatically ignores system folders, build outputs, binaries, generated locks, and secrets
- **Empty-folder awareness**: Shows empty folders with an explicit `(empty)` marker
- **Token & size estimation**: Real-time file sizes, line counts and estimated tokens to manage AI context
- **Professional prompt output**: Clean Markdown (or optional XML) with directory trees, metadata headers and language-aware code blocks
- **Multiple export options**: Copy to clipboard, download as file with timestamp, or preview in editor
- **Quick toolbar actions**: Refresh, Select All, and Deselect All buttons in the File Selection panel toolbar
- **Enhanced error handling**: Validates files exist, handles cancellations gracefully, and provides detailed feedback
- **Full project structure view**: Optional toggle to show complete directory tree with selected/unselected markers

---

## 🚀 Quick Start

1. **Install** the extension from the VS Code Marketplace
2. **Open** your project folder in VS Code
3. **Click** the **📦 Codebase Packer** icon in the Activity Bar (sidebar)
4. **Select files** using the checkbox tree in the File Selection panel
5. **Use toolbar buttons** (🔄 Refresh, ✅ Select All, ❌ Deselect All) for quick actions
6. **Export your prompt**:
   - **📋 Copy Prompt** — Copy to clipboard for AI chat
   - **💾 Download Codebase** — Save as timestamped file (`project-name-packed-2025-11-06.md`)
   - **👁️ Preview Prompt** — View in editor before exporting
   - **🌳 Copy Tree Only** — Export directory structure only

---

## 🖥️ Interface

### **File Selection Panel**

- **Checkbox-enabled tree** with partial/checked/unchecked states for hierarchical selection
- **Toolbar buttons** for quick access:
  - 🔄 **Refresh** — Reload the file tree
  - ✅ **Select All** — Check all files instantly
  - ❌ **Deselect All** — Uncheck all files instantly
- **Expand/collapse** directories to explore your project structure
- **Visual indicators** for file status and folder types

### **Actions & Summary Panel**

- **Live statistics**:
  - Selected file count
  - Total size (KB/MB)
  - Estimated token count for LLM context
- **Export actions**:
  - **📋 Copy Prompt** — Copy to clipboard for immediate use
  - **💾 Download Codebase** — Save as timestamped Markdown file
  - **👁️ Preview Prompt** — View output in editor before exporting
  - **🌳 Copy Tree Only** — Export directory structure without file contents
- **Quick selection**:
  - **✅ Select All** — Check all files
  - **❌ Deselect All** — Clear all selections
- **Configuration toggle**:
  - **Show full project structure** — Display complete directory tree with ✓/✗ markers for selected/unselected files

---

## 📄 Sample Generated Output

Below is a GitHub-friendly example of the prompt output. _This example uses a project root named `nextshop` and demonstrates how empty folders and ignored upload folders are displayed._

> **Note:** the directory tree uses the following markers: `✓` = included, `✗` = excluded, `📁` = folder (ignored or non-text files).

### 🌳 Project Structure

```text
nextshop/
├── 📂 src/ ✓
│   ├── 📂 components/ ✓
│   │   ├── Header.tsx ✓
│   │   ├── ProductCard.tsx ✓
│   │   └── CartSummary.tsx ✓
│   ├── 📂 pages/ ✓
│   │   ├── index.tsx ✓
│   │   ├── products.tsx ✓
│   │   └── api/ ✓
│   │       ├── products.ts ✓
│   │       └── checkout.ts ✓
│   ├── 📂 hooks/ ✓
│   │   └── useCart.ts ✓
│   ├── 📂 styles/ ✓
│   │   ├── globals.css ✓
│   │   └── theme.css ✓
│   └── 📂 utils/ ✓
│       ├── formatPrice.ts ✓
│       └── fetcher.ts ✓
├── 📂 public/ 📁 (contains non-text or ignored files) ✗
│   ├── 📂 images/ 📁 (ignored) ✗
│   └── 📂 uploads/ 📁 (ignored) ✗
├── 📂 tests/ ✓
│   ├── components.test.tsx ✓
│   └── utils.test.ts ✓
├── 📂 scripts/ (empty) ✗
├── next.config.js ✓
├── package.json ✓
├── tsconfig.json ✓
└── README.md ✓
```

---

### 📄 Files Content

<details>
<summary><strong>Click to expand files content (examples)</strong></summary>
<br>

<details>
<summary>📄 <code>src/components/Header.tsx</code> (expand)</summary>

#### 📄 `src/components/Header.tsx`

_Size: 0.9 KB | Lines: 22_

```tsx
import React from "react";
import Link from "next/link";

export const Header: React.FC = () => {
  return (
    <header className="site-header">
      <nav>
        <ul className="nav-list">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>
            <Link href="/products">Products</Link>
          </li>
          <li>
            <Link href="/cart">Cart</Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};
```

</details>

<details>
<summary>📄 <code>src/components/ProductCard.tsx</code> (expand)</summary>

#### 📄 `src/components/ProductCard.tsx`

_Size: 1.1 KB | Lines: 24_

```tsx
import React from "react";
import { formatPrice } from "../utils/formatPrice";

type ProductCardProps = {
  name: string;
  price: number;
  imageUrl: string;
};

export const ProductCard: React.FC<ProductCardProps> = ({
  name,
  price,
  imageUrl,
}) => (
  <div className="product-card">
    <img src={imageUrl} alt={name} />
    <h3>{name}</h3>
    <p>{formatPrice(price)}</p>
    <button>Add to Cart</button>
  </div>
);
```

</details>

<details>
<summary>📄 <code>package.json</code> (expand)</summary>

#### 📄 `package.json`

_Size: 1.4 KB | Lines: 32_

```json
{
  "name": "nextshop",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "jest"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "jest": "^29.0.0"
  }
}
```

</details>
</details>

---

## ⚙️ Configuration

Settings are exposed through VS Code Settings (`Ctrl/Cmd + ,`) under **Codebase Packer**:

- `codebasePromptPacker.maxFileSize` — _Default:_ `1048576` (1MB)
- `codebasePromptPacker.includeFileStats` — _Default:_ `true`
- `codebasePromptPacker.estimateTokens` — _Default:_ `true`
- `codebasePromptPacker.outputFormat` — _Default:_ `markdown` (`markdown` or `xml`)
- `codebasePromptPacker.ignorePatterns` — _Default:_ `[]` (array of glob patterns)

**Example**

```json
{
  "codebasePromptPacker.maxFileSize": 2097152,
  "codebasePromptPacker.includeFileStats": true,
  "codebasePromptPacker.estimateTokens": true,
  "codebasePromptPacker.outputFormat": "markdown",
  "codebasePromptPacker.ignorePatterns": [
    "**/tests/**",
    "**/*.test.*",
    "**/coverage/**",
    "**/*.log"
  ]
}
```

---

## 📋 Commands

### **Main Commands** (Command Palette)

- **Pack Codebase for LLM Prompt...** — Open the sidebar and start the packing workflow
- **Configure Prompt Packer** — Open extension settings

### **Export Commands**

- **Copy Packed Prompt** — Copy selected files to clipboard
- **Download Packed Prompt** — Save as timestamped file (e.g., `project-packed-2025-11-06.md`)
- **Preview Packed Prompt** — View output in editor tab before exporting
- **Copy Directory Tree Only** — Copy structure without file contents

### **Selection Commands**

- **Refresh File List** — Re-scan workspace for files
- **Select All** — Check all files in the tree
- **Deselect All** — Uncheck all files
- **Show Full Project Structure** — Toggle complete directory tree view

### **Toolbar Actions** (File Selection Panel)

- 🔄 **Refresh** — Reload file tree
- ✅ **Select All** — Quick select all files
- ❌ **Deselect All** — Quick deselect all files

---

## 🎯 Use Cases

- **Code review** — Provide full project context to an AI reviewer.
- **Documentation** — Auto-generate docs or explain architecture.
- **Debugging** — Give full app context for better debugging suggestions.
- **Refactoring & migration** — Plan architecture changes with full visibility.

---

## 🏗️ Technical Architecture

```
src/
├── extension.ts
├── CodebaseTreeProvider.ts
├── FileTreeItem.ts
└── ActionPanelViewProvider.ts
```

**Core classes:** `CodebaseCopier`, `CodebaseTreeProvider`, `FileTreeItem`, `ActionPanelViewProvider`.

---

## 🔧 Development & Testing

**Prerequisites**: VS Code >= 1.90.0, Node.js >= 18

**Build & run**

```bash
npm install
npm run compile
npm run watch
# Press F5 inside VS Code to launch Extension Development Host
```

---

## 🚀 Release Notes

### **v1.1.0** (Current) — Enhanced Export & Toolbar

- ✅ **Download feature** with timestamped filenames (`project-packed-2025-11-06.md`)
- ✅ **Toolbar buttons** in File Selection panel (Refresh, Select All, Deselect All)
- ✅ **Enhanced error handling** with file validation and detailed error messages
- ✅ **Post-save actions** — Option to open downloaded file immediately
- ✅ **Improved user feedback** with icons (✅⚠️❌) and detailed statistics
- ✅ **Multiple file formats** for download (.md, .txt, all files)
- ✅ **Cancellation support** at all stages of processing
- ✅ **File existence validation** before processing with user warnings

### **v1.0.0** — Initial Release

- Interactive sidebar with checkbox tree
- Real-time statistics and token estimates
- Smart file filtering and preview
- Copy to clipboard functionality

---

## ❓ FAQ

**Q: Can I download the packed prompt as a file?**

**A:** Yes! Click **💾 Download Codebase** in the Actions panel. The file will be saved with a timestamped name (e.g., `myproject-packed-2025-11-06.md`). You can choose to open it immediately after saving.

**Q: How do I quickly select or deselect all files?**

**A:** Use the toolbar buttons (✅ **Select All** or ❌ **Deselect All**) at the top of the File Selection panel, or use the same buttons in the Actions & Summary panel.

**Q: Can the extension include empty folders?**

**A:** Yes — empty folders are detected and displayed with an `(empty)` marker in the directory tree. They are included in the structure view.

**Q: Are binary files included?**

**A:** No — binary files (images, archives, videos, executables) are automatically filtered out and marked as `📁 (contains non-text or ignored files)` in the tree.

**Q: What happens if files are deleted after I select them?**

**A:** The extension validates file existence before processing. If files are missing, you'll see a warning message showing how many files are missing, and processing continues with the remaining valid files.

**Q: Can I cancel the export process?**

**A:** Yes! All export operations (Copy, Download, Preview) support cancellation. Just click the "Cancel" button on the progress notification.

**Q: How do I see the complete project structure including unselected files?**

**A:** Enable the **"Show full project structure"** checkbox in the Actions & Summary panel. The directory tree will show all files with ✓ (selected) and ✗ (unselected) markers.

**Q: What file formats are supported for download?**

**A:** You can save as Markdown (.md), Text (.txt), or any file format. The default is Markdown with proper syntax highlighting for code blocks.

---

## 🤝 Contributing

Contributions welcome — open issues and PRs on GitHub. Please include reproducible steps and small focused changes.

---

## 📜 License & Support

MIT License — see `LICENSE` for details.

If this project helps you, consider supporting the author:
<br>
<a href="https://www.buymeacoffee.com/hareeshkarravi">
<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" width="180" style="margin-top: 10px;" alt="Buy Me A Coffee">
</a>

---

💡 _Made by a student developer from Sri Lanka, passionate about open‑source and AI tools — building in public to inspire and empower others._

_Generated on: 2025-11-06_
