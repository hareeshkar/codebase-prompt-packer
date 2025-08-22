
# 📦 Codebase Prompt Packer

**Transform your entire codebase into clean, AI‑ready prompts in seconds.**

> VS Code extension that packages your project files into neatly formatted prompts for ChatGPT, Claude, Gemini,Copilot, Grok, Deepseek, Mistral, Qwen and other LLMs.

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

- **Interactive file selection**: Checkbox-enabled file tree with hierarchical parent/child selection.
- **Smart filtering**: Automatically ignores system folders, build outputs, binaries, generated locks, and secrets.
- **Empty-folder awareness**: Shows empty folders (and lets you include them) with an explicit `(empty)` marker.
- **Token & size estimation**: File sizes, line counts and estimated tokens to help control AI context usage.
- **Professional prompt output**: Clean Markdown (or optional XML) with directory trees, metadata headers and language-aware code blocks.
- **Preview & copy**: Preview the packed prompt in a new editor tab, then copy to clipboard.

---

## 🚀 Quick Start

1. Install the extension from the VS Code Marketplace.
2. Open your project folder in VS Code.
3. Click the **📦 Codebase Prompt Packer** icon in the Activity Bar.
4. Use the file-tree panel to check/uncheck files and directories.
5. Click **📋 Copy Prompt** or **👁️ Preview Prompt** to export the packed prompt.

---

## 🖥️ Interface

**File Selection Panel**
- Checkbox-enabled tree with partial/checked/unchecked states.
- Expand/collapse directories and see live selection statistics.

**Actions & Summary Panel**
- Live stats: selected file count, total size, token estimate.
- Action buttons: Copy Prompt, Preview, Copy Tree Only, Select/Deselect All.
- Config toggles: show full project structure, adjust file size limits, add ignore patterns.

---

## 📄 Sample Generated Output

Below is a GitHub-friendly example of the prompt output. *This example uses a project root named `nextshop` and demonstrates how empty folders and ignored upload folders are displayed.*

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
*Size: 0.9 KB | Lines: 22*

```tsx
import React from 'react';
import Link from 'next/link';

export const Header: React.FC = () => {
  return (
    <header className="site-header">
      <nav>
        <ul className="nav-list">
          <li><Link href="/">Home</Link></li>
          <li><Link href="/products">Products</Link></li>
          <li><Link href="/cart">Cart</Link></li>
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
*Size: 1.1 KB | Lines: 24*

```tsx
import React from 'react';
import { formatPrice } from '../utils/formatPrice';

type ProductCardProps = {
  name: string;
  price: number;
  imageUrl: string;
};

export const ProductCard: React.FC<ProductCardProps> = ({ name, price, imageUrl }) => (
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
*Size: 1.4 KB | Lines: 32*

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

Settings are exposed through VS Code Settings (`Ctrl/Cmd + ,`) under **Codebase Prompt Packer**:

- `codebasePromptPacker.maxFileSize` — *Default:* `1048576` (1MB)
- `codebasePromptPacker.includeFileStats` — *Default:* `true`
- `codebasePromptPacker.estimateTokens` — *Default:* `true`
- `codebasePromptPacker.outputFormat` — *Default:* `markdown` (`markdown` or `xml`)
- `codebasePromptPacker.ignorePatterns` — *Default:* `[]` (array of glob patterns)

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

- **Pack Codebase for LLM Prompt...** — Start the packing workflow
- **Copy Directory Tree Only** — Copy only the structure
- **Configure Prompt Packer** — Open extension settings
- **Refresh File List** — Re-scan workspace
- **Copy Packed Prompt** — Copy packed files to clipboard
- **Preview Packed Prompt** — Preview in editor
- **Select All / Deselect All** — Quick selection

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

**v1.0.0** — Initial release

- Interactive sidebar & checkbox tree
- Real-time statistics and token estimates
- Smart file filtering and preview

---

## ❓ FAQ

**Q:** Can the extension include empty folders?

**A:** Yes — empty folders are detected and displayed with an `(empty)` marker. You can choose to include them in the packed prompt.

**Q:** Are binary files included?

**A:** No — binary or non-text files (images, archives, videos) are treated as ignored and marked as `📁` in the tree.

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

💡 *Made by a student developer from Sri Lanka, passionate about open‑source and AI tools — building in public to inspire and empower others.*

*Generated on: 2025-08-22*
