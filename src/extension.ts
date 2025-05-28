// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

interface Project {
	name: string;
	path: string;
}

interface Category {
	id: string;
	name: string;
	projects: Project[];
	parentId?: string;  // Optional parent category ID
	subcategories?: Category[];  // Optional subcategories
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('Extension "welcoming-menu" is now active!');

	let currentPanel: vscode.WebviewPanel | undefined = undefined;

	// --- CATEGORY HELPERS ---
	function getCategories(): Category[] {
		return context.globalState.get<Category[]>('categories', []);
	}
	function saveCategories(categories: Category[]) {
		context.globalState.update('categories', categories);
	}

	// --- CATEGORY OPERATIONS ---
	function createCategory(name: string) {
		const categories = getCategories();
		const newCategory: Category = { id: uuidv4(), name, projects: [] };
		categories.push(newCategory);
		saveCategories(categories);
		return newCategory;
	}
	function addProjectToCategory(categoryId: string, project: Project) {
		const categories = getCategories();
		
		// Helper function to find and add project to a category or its subcategories
		function addProjectToCategoryOrSubcategory(cats: Category[]): boolean {
			for (const cat of cats) {
				if (cat.id === categoryId) {
					if (!cat.projects.some(p => p.path === project.path)) {
						cat.projects.push(project);
						return true;
					}
					return false;
				}
				if (cat.subcategories) {
					if (addProjectToCategoryOrSubcategory(cat.subcategories)) {
						return true;
					}
				}
			}
			return false;
		}
		
		if (addProjectToCategoryOrSubcategory(categories)) {
			saveCategories(categories);
		}
	}
	function removeProjectFromCategory(categoryId: string, projectPath: string) {
		const categories = getCategories();
		
		// Helper function to find and remove project from a category or its subcategories
		function removeProjectFromCategoryOrSubcategory(cats: Category[]): boolean {
			for (const cat of cats) {
				if (cat.id === categoryId) {
					cat.projects = cat.projects.filter(p => p.path !== projectPath);
					return true;
				}
				if (cat.subcategories) {
					if (removeProjectFromCategoryOrSubcategory(cat.subcategories)) {
						return true;
					}
				}
			}
			return false;
		}
		
		if (removeProjectFromCategoryOrSubcategory(categories)) {
			saveCategories(categories);
		}
	}
	function removeCategory(categoryId: string) {
		let categories = getCategories();
		
		// First, try to find and remove from main categories
		const mainCategoryIndex = categories.findIndex(c => c.id === categoryId);
		if (mainCategoryIndex !== -1) {
			categories.splice(mainCategoryIndex, 1);
			saveCategories(categories);
			return;
		}
		
		// If not found in main categories, search in subcategories
		function removeSubcategory(cats: Category[]): boolean {
			for (let i = 0; i < cats.length; i++) {
				const category = cats[i];
				if (category.subcategories) {
					const subIndex = category.subcategories.findIndex(sub => sub.id === categoryId);
					if (subIndex !== -1) {
						category.subcategories.splice(subIndex, 1);
						return true;
					}
					if (removeSubcategory(category.subcategories)) {
						return true;
					}
				}
			}
			return false;
		}
		
		if (removeSubcategory(categories)) {
			saveCategories(categories);
		}
	}

	// Add this function after createCategory
	function createSubcategory(context: vscode.ExtensionContext, parentId: string, name: string) {
		const categories = getCategories();
		const parentCategory = categories.find(cat => cat.id === parentId);
		
		if (parentCategory) {
			// Check if parent is already a subcategory
			if (parentCategory.parentId) {
				return null; // Cannot create subcategory of a subcategory
			}
			
			const newSubcategory: Category = {
				id: uuidv4(),
				name,
				projects: [],
				parentId
			};
			
			if (!parentCategory.subcategories) {
				parentCategory.subcategories = [];
			}
			
			parentCategory.subcategories.push(newSubcategory);
			saveCategories(categories);
			return newSubcategory;
		}
		
		return null;
	}

	// Function to get the HTML content of the welcome page
	function getWelcomePageContent(context: vscode.ExtensionContext, webview: vscode.Webview): string {
		const htmlPath = path.join(context.extensionPath, 'dist', 'webview', 'welcome.html');
		let html = fs.readFileSync(htmlPath, 'utf8');
		const nonce = getNonce();
		// Inject CSP meta tag
		const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">`;
		html = html.replace('<head>', `<head>\n    ${csp}`);
		// Inject nonce into script tag
		html = html.replace(/<script([^>]*)nonce="\{\{nonce\}\}"/, `<script$1nonce="${nonce}"`);
		// Replace local resource references with webview URIs
		html = html.replace(
			/(src|href)="([^"]+)"/g,
			(match, p1, p2) => {
				const resourcePath = path.join(context.extensionPath, 'dist', p2);
				const resourceUri = webview.asWebviewUri(vscode.Uri.file(resourcePath));
				return `${p1}="${resourceUri}"`;
			}
		);
		return html;
	}

	// Function to get saved projects
	function getSavedProjects(): Project[] {
		const projects = context.globalState.get<Project[]>('projects', []);
		return projects;
	}

	// Function to save projects
	function saveProjects(projects: Project[]) {
		context.globalState.update('projects', projects);
	}

	// Function to add a new project
	async function addProject() {
		const result = await vscode.window.showOpenDialog({
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
			openLabel: 'Select Project Folder'
		});

		if (result && result.length > 0) {
			const folderUri = result[0];
			const folderName = path.basename(folderUri.fsPath);
			
			const projects = getSavedProjects();
			// Check if project already exists
			if (!projects.some(p => p.path === folderUri.fsPath)) {
				projects.push({
					name: folderName,
					path: folderUri.fsPath
				});
				saveProjects(projects);
				
				// Update the webview with new projects
				if (currentPanel) {
					updateProjects(currentPanel.webview, context);
				}
			} else {
				vscode.window.showInformationMessage('This project is already in your list!');
			}
		}
	}

	// Function to create and show the welcome page
	function createWelcomePage() {
		if (currentPanel) {
			currentPanel.reveal(vscode.ViewColumn.One);
			return;
		}

		currentPanel = vscode.window.createWebviewPanel(
			'welcomingMenu',
			'Project Manager',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);

		currentPanel.webview.html = getWelcomePageContent(context, currentPanel.webview);

		// Handle messages from the webview
		currentPanel.webview.onDidReceiveMessage(
			async message => {
				switch (message.type) {
					case 'getCategories': {
						const categories = getCategories();
						currentPanel?.webview.postMessage({ type: 'categories', categories });
						break;
					}
					case 'createCategory': {
						const newCategory = createCategory(message.name);
						currentPanel?.webview.postMessage({ type: 'categoryCreated', category: newCategory });
						break;
					}
					case 'addProjectToCategory': {
						// message: { categoryId, project: {name, path} }
						addProjectToCategory(message.categoryId, message.project);
						const categories = getCategories();
						currentPanel?.webview.postMessage({ type: 'categories', categories });
						break;
					}
					case 'removeProjectFromCategory': {
						removeProjectFromCategory(message.categoryId, message.projectPath);
						const categories = getCategories();
						currentPanel?.webview.postMessage({ type: 'categories', categories });
						break;
					}
					case 'removeCategory': {
						removeCategory(message.categoryId);
						const categories = getCategories();
						currentPanel?.webview.postMessage({ type: 'categories', categories });
						break;
					}
					case 'openProject': {
						vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(message.path));
						break;
					}
					case 'addProject': {
						// message: { categoryId }
						const result = await vscode.window.showOpenDialog({
							canSelectFiles: false,
							canSelectFolders: true,
							canSelectMany: false,
							openLabel: 'Select Project Folder'
						});
						if (result && result.length > 0) {
							const folderUri = result[0];
							const folderName = path.basename(folderUri.fsPath);
							addProjectToCategory(message.categoryId, { name: folderName, path: folderUri.fsPath });
							const categories = getCategories();
							currentPanel?.webview.postMessage({ type: 'categories', categories });
						}
						break;
					}
					case 'createSubcategory': {
						const subcategory = createSubcategory(context, message.parentId, message.name);
						if (subcategory) {
							const categories = getCategories();
							currentPanel?.webview.postMessage({ 
								type: 'categories', 
								categories 
							});
						}
						break;
					}
				}
			},
			undefined,
			context.subscriptions
		);

		currentPanel.onDidDispose(
			() => {
				currentPanel = undefined;
			},
			null,
			context.subscriptions
		);
	}

	// Try to close the default VS Code welcome page if it is open
	vscode.window.tabGroups.all.forEach(group => {
		group.tabs.forEach(tab => {
			if (tab.label.toLowerCase().includes('welcome')) {
				vscode.window.tabGroups.close(tab);
			}
		});
	});

	// Register commands
	let disposable = vscode.commands.registerCommand('welcoming-menu.openWelcome', () => {
		createWelcomePage();
	});

	context.subscriptions.push(disposable);

	// Show welcome page on startup
	createWelcomePage();
}

function updateProjects(webview: vscode.Webview, context: vscode.ExtensionContext) {
	// Get workspace projects
	const workspaceProjects = vscode.workspace.workspaceFolders?.map(folder => ({
		name: folder.name,
		path: folder.uri.fsPath
	})) || [];

	// Get saved projects from global state
	const savedProjects = context.globalState.get<Project[]>('projects', []);

	// Combine both lists, removing duplicates
	const allProjects = [...workspaceProjects];
	savedProjects.forEach((savedProject: Project) => {
		if (!allProjects.some(p => p.path === savedProject.path)) {
			allProjects.push(savedProject);
		}
	});

	webview.postMessage({
		type: 'updateProjects',
		projects: allProjects
	});
}

// This method is called when your extension is deactivated
export function deactivate() {}
