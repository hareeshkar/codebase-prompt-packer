import * as vscode from 'vscode';
import * as path from 'path';

export class FileTreeItem extends vscode.TreeItem {
	public children: FileTreeItem[] = [];
	public parent?: FileTreeItem; // This property is essential

	constructor(
		public readonly resourceUri: vscode.Uri,
		public readonly isDirectory: boolean,
		public checkedState: vscode.TreeItemCheckboxState = vscode.TreeItemCheckboxState.Checked
	) {
		super(path.basename(resourceUri.fsPath), isDirectory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
		this.tooltip = this.resourceUri.fsPath;
		this.checkboxState = checkedState;
		this.iconPath = isDirectory ? new vscode.ThemeIcon('folder') : new vscode.ThemeIcon('file');
		this.contextValue = isDirectory ? 'directory' : 'file';

		// Stable id so VS Code can persist item state across refreshes
		this.id = this.resourceUri.fsPath;
	}

	public updateCheckboxState(state: vscode.TreeItemCheckboxState): void {
		this.checkedState = state;
		this.checkboxState = state;
	}
}