import * as vscode from 'vscode';
import * as path from 'path';
import { FileTreeItem } from './FileTreeItem';

export class CodebaseTreeProvider implements vscode.TreeDataProvider<FileTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<FileTreeItem | undefined | null | void> = new vscode.EventEmitter();
	readonly onDidChangeTreeData: vscode.Event<FileTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	// Add checkbox state change event
	private _onDidChangeCheckboxState: vscode.EventEmitter<vscode.TreeCheckboxChangeEvent<FileTreeItem>> = new vscode.EventEmitter();
	readonly onDidChangeCheckboxState: vscode.Event<vscode.TreeCheckboxChangeEvent<FileTreeItem>> = this._onDidChangeCheckboxState.event;

	private rootItems: FileTreeItem[] = [];
	private allItems: Map<string, FileTreeItem> = new Map();
	private previewUpdateCallback?: (files: string[], includeFullTree: boolean) => void;

	// NEW: option to include full project structure in previews
	private showFullProjectStructure: boolean = false;

	constructor(private workspaceRoot: string, private getFilteredFiles: (rootPath: string) => Promise<string[]>) {
		if (this.workspaceRoot) {
			void this.refresh();
		}
	}

	public setPreviewUpdateCallback(callback: (files: string[], includeFullTree: boolean) => void): void {
		this.previewUpdateCallback = callback;
		// Initial update with current selection
		this.triggerPreviewUpdate();
	}

	// NEW: toggle and getter for the "Show full project structure" option
	public toggleFullTree(): void {
		this.showFullProjectStructure = !this.showFullProjectStructure;
		this._onDidChangeTreeData.fire();
		this.triggerPreviewUpdate();
	}

	public isFullTreeEnabled(): boolean {
		return this.showFullProjectStructure;
	}

	public async refresh(): Promise<void> {
		await this.buildFileTree();
		this._onDidChangeTreeData.fire();
		this.triggerPreviewUpdate();
	}

	// This build logic is now corrected to properly link children to parents.
	private async buildFileTree(): Promise<void> {
		this.rootItems = [];
		this.allItems.clear();
		if (!this.workspaceRoot) return;

		const filteredFiles = await this.getFilteredFiles(this.workspaceRoot);

		for (const filePath of filteredFiles) {
			const relativePath = path.relative(this.workspaceRoot, filePath);
			const parts = relativePath.split(path.sep);
			let currentChildren = this.rootItems;
			let accumulatedPath = this.workspaceRoot;
			let parentNode: FileTreeItem | undefined = undefined;

			for (let i = 0; i < parts.length; i++) {
				const part = parts[i];
				accumulatedPath = path.join(accumulatedPath, part);
				let node = currentChildren.find(c => c.label === part);

				if (!node) {
					const isDirectory = i < parts.length - 1;
					node = new FileTreeItem(vscode.Uri.file(accumulatedPath), isDirectory, vscode.TreeItemCheckboxState.Checked);
					node.parent = parentNode;
					currentChildren.push(node);
					this.allItems.set(accumulatedPath, node);
				}
				
				// This was the missing link in the previous build logic.
				// We must re-assign the children array from the node itself.
				if (parentNode) {
					// Ensure parent's children array is the one we add to
					if (!parentNode.children.includes(node)) {
						parentNode.children.push(node);
					}
				}

				parentNode = node;
				currentChildren = node.children;
			}
		}
		
		const sortRec = (items: FileTreeItem[]) => {
			items.sort((a, b) => {
				if (a.isDirectory && !b.isDirectory) return -1;
				if (!a.isDirectory && b.isDirectory) return 1;
				return String(a.label).localeCompare(String(b.label));
			});
			items.forEach(i => sortRec(i.children));
		};
		sortRec(this.rootItems);
	}

	getTreeItem(element: FileTreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: FileTreeItem): vscode.ProviderResult<FileTreeItem[]> {
		return element ? element.children : this.rootItems;
	}

	// NEW: Handle checkbox state changes from VS Code tree view
	public handleCheckboxChange(items: readonly vscode.TreeCheckboxChangeEvent<FileTreeItem>[]): void {
		for (const item of items) {
			if (item.items && item.items.length > 0) {
				for (const [treeItem, newState] of item.items) {
					// If it's a directory, propagate down. If it's a file, just update it.
					if (treeItem.isDirectory) {
						this.setNodeStateDown(treeItem, newState);
					} else {
						treeItem.updateCheckboxState(newState);
					}
					// Always update the parent hierarchy after any change.
					this.updateParentStates(treeItem);
				}
			}
		}
		this._onDidChangeTreeData.fire();
		this.triggerPreviewUpdate();
	}

	// NEW: Update parent states based on children's states
	private updateParentStates(item: FileTreeItem): void {
		let current = item.parent;
		while (current) {
			const childStates = current.children.map(child => child.checkedState);
			// Two-state behavior: keep parent CHECKED if any child is checked.
			// Only set parent UNCHECKED when all children are unchecked.
			const anyChecked = childStates.some(state => state === vscode.TreeItemCheckboxState.Checked);
			if (anyChecked) {
				current.updateCheckboxState(vscode.TreeItemCheckboxState.Checked);
			} else {
				current.updateCheckboxState(vscode.TreeItemCheckboxState.Unchecked);
			}

			current = current.parent;
		}
	}

	public toggleCheckbox(item: FileTreeItem): void {
		const newState = item.checkedState === vscode.TreeItemCheckboxState.Checked
			? vscode.TreeItemCheckboxState.Unchecked
			: vscode.TreeItemCheckboxState.Checked;

		if (item.isDirectory) {
			this.setNodeStateDown(item, newState);
		} else {
			item.updateCheckboxState(newState);
		}
		this.updateParentStates(item);

		this._onDidChangeTreeData.fire();
		this.triggerPreviewUpdate();
	}

	/**
	 * Recursively sets the state for a node and all its descendants.
	 * This is the "Top-Down" update.
	 */
	private setNodeStateDown(node: FileTreeItem, state: vscode.TreeItemCheckboxState): void {
		node.updateCheckboxState(state);
		if (node.children) {
			for (const child of node.children) {
				this.setNodeStateDown(child, state);
			}
		}
	}

	public selectAll(): void {
		this.rootItems.forEach(r => this.setNodeStateDown(r, vscode.TreeItemCheckboxState.Checked));
		this._onDidChangeTreeData.fire();
		this.triggerPreviewUpdate();
	}

	public deselectAll(): void {
		this.rootItems.forEach(r => this.setNodeStateDown(r, vscode.TreeItemCheckboxState.Unchecked));
		this._onDidChangeTreeData.fire();
		this.triggerPreviewUpdate();
	}

	/**
	 * This function is now 100% reliable because the data model is always kept in sync.
	 */
	public getSelectedFiles(): string[] {
		const selected: string[] = [];
		for (const [filePath, item] of this.allItems.entries()) {
			if (!item.isDirectory && item.checkedState === vscode.TreeItemCheckboxState.Checked) {
				selected.push(filePath);
			}
		}
		return selected;
	}

	public toggleByPath(filePath: string): void {
		const item = this.allItems.get(filePath);
		if (item) {
			this.toggleCheckbox(item);
		}
	}

	private triggerPreviewUpdate(): void {
		if (this.previewUpdateCallback) {
			setTimeout(() => {
				const selectedFiles = this.getSelectedFiles();
				this.previewUpdateCallback!(selectedFiles, this.showFullProjectStructure);
			}, 50);
		}
	}
}