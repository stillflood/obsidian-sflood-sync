import { App, Plugin, PluginSettingTab, Setting, Notice, TFile, Editor, MarkdownView } from 'obsidian';

interface SfloodSyncSettings {
	apiBaseUrl: string;
	accessToken: string;
	autoSync: boolean;
	syncInterval: number; // 分钟
	syncOnSave: boolean;
	noteFolder: string; // 要同步的文件夹
	tagPrefix: string; // 标签前缀，例如 "publish/"
	categoryMapping: Record<string, string>; // 文件夹到分类ID的映射
}

const DEFAULT_SETTINGS: SfloodSyncSettings = {
	apiBaseUrl: 'http://localhost:4000/api',
	accessToken: '',
	autoSync: false,
	syncInterval: 30,
	syncOnSave: true,
	noteFolder: 'Notes',
	tagPrefix: 'publish/',
	categoryMapping: {}
}

interface NoteMetadata {
	title: string;
	slug: string;
	tags: string[];
	status: 'draft' | 'published';
	categoryId?: string;
	summary?: string;
	sfloodId?: string; // 存储在frontmatter中的笔记ID
}

export default class SfloodSyncPlugin extends Plugin {
	settings: SfloodSyncSettings;
	syncIntervalId: number | null = null;
	syncing: boolean = false;

	async onload() {
		await this.loadSettings();

		// 添加同步命令
		this.addCommand({
			id: 'sync-current-note',
			name: '同步当前笔记到Sflood',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				if (view.file) {
					await this.syncNote(view.file);
				}
			}
		});

		this.addCommand({
			id: 'sync-all-notes',
			name: '同步所有笔记到Sflood',
			callback: async () => {
				await this.syncAllNotes();
			}
		});

		// 添加功能区图标
		this.addRibbonIcon('upload-cloud', 'Sync to Sflood', async () => {
			const activeFile = this.app.workspace.getActiveFile();
			if (activeFile) {
				await this.syncNote(activeFile);
			} else {
				new Notice('请先打开一个笔记');
			}
		});

		// 添加设置面板
		this.addSettingTab(new SfloodSyncSettingTab(this.app, this));

		// 监听文件保存事件
		if (this.settings.syncOnSave) {
			this.registerEvent(
				this.app.vault.on('modify', async (file) => {
					if (file instanceof TFile && this.shouldSyncFile(file)) {
						await this.syncNote(file);
					}
				})
			);
		}

		// 启动自动同步
		if (this.settings.autoSync) {
			this.startAutoSync();
		}

		console.log('Sflood Sync Plugin loaded');
	}

	onunload() {
		this.stopAutoSync();
		console.log('Sflood Sync Plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	shouldSyncFile(file: TFile): boolean {
		// 检查文件是否在指定的同步文件夹中
		if (this.settings.noteFolder) {
			const folderPath = this.settings.noteFolder.endsWith('/') 
				? this.settings.noteFolder 
				: this.settings.noteFolder + '/';
			return file.path.startsWith(folderPath);
		}
		return file.extension === 'md';
	}

	async syncNote(file: TFile) {
		if (this.syncing) {
			new Notice('正在同步中，请稍候...');
			return;
		}

		try {
			this.syncing = true;
			new Notice(`开始同步: ${file.basename}`);

			const content = await this.app.vault.read(file);
			const metadata = this.parseNoteMetadata(file, content);

			if (!metadata) {
				new Notice('无法解析笔记元数据');
				return;
			}

			// 提取markdown内容（去除frontmatter）
			const markdown = this.extractMarkdown(content);

			if (metadata.sfloodId) {
				// 更新现有笔记
				await this.updateNote(metadata.sfloodId, metadata, markdown);
				new Notice(`✓ 笔记已更新: ${metadata.title}`);
			} else {
				// 创建新笔记
				const noteId = await this.createNote(metadata, markdown);
				// 将ID写回到frontmatter
				await this.updateNoteFrontmatter(file, noteId);
				new Notice(`✓ 笔记已创建: ${metadata.title}`);
			}
		} catch (error) {
			console.error('同步失败:', error);
			new Notice(`✗ 同步失败: ${error.message}`);
		} finally {
			this.syncing = false;
		}
	}

	async syncAllNotes() {
		new Notice('开始批量同步所有笔记...');
		
		const files = this.app.vault.getMarkdownFiles().filter(file => 
			this.shouldSyncFile(file)
		);

		let successCount = 0;
		let failCount = 0;

		for (const file of files) {
			try {
				await this.syncNote(file);
				successCount++;
			} catch (error) {
				console.error(`同步失败: ${file.path}`, error);
				failCount++;
			}
		}

		new Notice(`同步完成: ${successCount} 成功, ${failCount} 失败`);
	}

	parseNoteMetadata(file: TFile, content: string): NoteMetadata | null {
		const cache = this.app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;

		// 生成slug
		const slug = frontmatter?.slug || this.generateSlug(file.basename);

		// 提取标签
		let tags: string[] = [];
		if (frontmatter?.tags) {
			tags = Array.isArray(frontmatter.tags) 
				? frontmatter.tags 
				: [frontmatter.tags];
		}

		// 从内容中提取标签
		if (cache?.tags) {
			const contentTags = cache.tags.map(t => t.tag.replace('#', ''));
			tags = [...new Set([...tags, ...contentTags])];
		}

		// 过滤标签前缀
		if (this.settings.tagPrefix) {
			tags = tags.filter(tag => tag.startsWith(this.settings.tagPrefix))
				.map(tag => tag.replace(this.settings.tagPrefix, ''));
		}

		// 确定分类
		const categoryId = this.getCategoryId(file.parent?.path || '');

		return {
			title: frontmatter?.title || file.basename,
			slug: slug,
			tags: tags,
			status: frontmatter?.status || 'draft',
			categoryId: frontmatter?.categoryId || categoryId,
			summary: frontmatter?.summary || frontmatter?.description || '',
			sfloodId: frontmatter?.sfloodId
		};
	}

	extractMarkdown(content: string): string {
		// 移除frontmatter
		const frontmatterRegex = /^---\n[\s\S]*?\n---\n/;
		return content.replace(frontmatterRegex, '').trim();
	}

	generateSlug(title: string): string {
		return title
			.toLowerCase()
			.replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.trim();
	}

	getCategoryId(folderPath: string): string | undefined {
		return this.settings.categoryMapping[folderPath];
	}

	async createNote(metadata: NoteMetadata, markdown: string): Promise<string> {
		const response = await this.apiRequest('POST', '/v1/admin/notes', {
			title: metadata.title,
			slug: metadata.slug,
			markdown: markdown,
			summary: metadata.summary || '',
			tags: metadata.tags,
			status: metadata.status,
			categoryId: metadata.categoryId
		});

		return response.id;
	}

	async updateNote(noteId: string, metadata: NoteMetadata, markdown: string) {
		await this.apiRequest('PUT', `/v1/admin/notes/${noteId}`, {
			title: metadata.title,
			slug: metadata.slug,
			markdown: markdown,
			summary: metadata.summary || '',
			tags: metadata.tags,
			status: metadata.status,
			categoryId: metadata.categoryId
		});
	}

	async updateNoteFrontmatter(file: TFile, sfloodId: string) {
		const content = await this.app.vault.read(file);
		const cache = this.app.metadataCache.getFileCache(file);
		
		let newContent: string;
		
		if (cache?.frontmatter) {
			// 已有frontmatter，添加sfloodId
			const frontmatterRegex = /^(---\n[\s\S]*?)\n---/;
			newContent = content.replace(frontmatterRegex, (match, fm) => {
				if (match.includes('sfloodId:')) {
					return match; // 已存在，不修改
				}
				return `${fm}\nsfloodId: ${sfloodId}\n---`;
			});
		} else {
			// 没有frontmatter，创建新的
			newContent = `---\nsfloodId: ${sfloodId}\n---\n\n${content}`;
		}

		await this.app.vault.modify(file, newContent);
	}

	async apiRequest(method: string, endpoint: string, data?: any): Promise<any> {
		if (!this.settings.accessToken) {
			throw new Error('请先配置API访问令牌');
		}

		const url = `${this.settings.apiBaseUrl}${endpoint}`;
		
		const options: RequestInit = {
			method: method,
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.settings.accessToken}`
			}
		};

		if (data) {
			options.body = JSON.stringify(data);
		}

		const response = await fetch(url, options);

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: response.statusText }));
			throw new Error(error.message || `HTTP ${response.status}`);
		}

		return await response.json();
	}

	startAutoSync() {
		if (this.syncIntervalId) {
			this.stopAutoSync();
		}

		const intervalMs = this.settings.syncInterval * 60 * 1000;
		this.syncIntervalId = window.setInterval(() => {
			this.syncAllNotes();
		}, intervalMs);

		console.log(`Auto-sync started: every ${this.settings.syncInterval} minutes`);
	}

	stopAutoSync() {
		if (this.syncIntervalId) {
			window.clearInterval(this.syncIntervalId);
			this.syncIntervalId = null;
			console.log('Auto-sync stopped');
		}
	}
}

class SfloodSyncSettingTab extends PluginSettingTab {
	plugin: SfloodSyncPlugin;

	constructor(app: App, plugin: SfloodSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Sflood同步设置' });

		new Setting(containerEl)
			.setName('API地址')
			.setDesc('Sflood API的基础URL')
			.addText(text => text
				.setPlaceholder('http://localhost:4000/api')
				.setValue(this.plugin.settings.apiBaseUrl)
				.onChange(async (value) => {
					this.plugin.settings.apiBaseUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('访问令牌')
			.setDesc('从Sflood管理后台获取的JWT令牌')
			.addText(text => {
				text.inputEl.type = 'password';
				text
					.setPlaceholder('输入访问令牌')
					.setValue(this.plugin.settings.accessToken)
					.onChange(async (value) => {
						this.plugin.settings.accessToken = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('同步文件夹')
			.setDesc('要同步的笔记文件夹路径（留空则同步所有）')
			.addText(text => text
				.setPlaceholder('Notes')
				.setValue(this.plugin.settings.noteFolder)
				.onChange(async (value) => {
					this.plugin.settings.noteFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('保存时同步')
			.setDesc('文件保存时自动同步到Sflood')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.syncOnSave)
				.onChange(async (value) => {
					this.plugin.settings.syncOnSave = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('启用自动同步')
			.setDesc('定时自动同步所有笔记')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoSync)
				.onChange(async (value) => {
					this.plugin.settings.autoSync = value;
					await this.plugin.saveSettings();
					
					if (value) {
						this.plugin.startAutoSync();
					} else {
						this.plugin.stopAutoSync();
					}
				}));

		new Setting(containerEl)
			.setName('同步间隔')
			.setDesc('自动同步的时间间隔（分钟）')
			.addSlider(slider => slider
				.setLimits(5, 120, 5)
				.setValue(this.plugin.settings.syncInterval)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.syncInterval = value;
					await this.plugin.saveSettings();
					
					if (this.plugin.settings.autoSync) {
						this.plugin.startAutoSync();
					}
				}));

		new Setting(containerEl)
			.setName('标签前缀')
			.setDesc('只同步带有此前缀的标签（如 publish/）')
			.addText(text => text
				.setPlaceholder('publish/')
				.setValue(this.plugin.settings.tagPrefix)
				.onChange(async (value) => {
					this.plugin.settings.tagPrefix = value;
					await this.plugin.saveSettings();
				}));

		// 分类映射设置
		containerEl.createEl('h3', { text: '文件夹到分类映射' });
		containerEl.createEl('p', { 
			text: '设置Obsidian文件夹到Sflood笔记分类的映射关系',
			cls: 'setting-item-description'
		});

		const mappingContainer = containerEl.createDiv('category-mapping');
		this.displayCategoryMappings(mappingContainer);

		new Setting(containerEl)
			.setName('添加映射')
			.setDesc('添加新的文件夹到分类ID的映射')
			.addButton(button => button
				.setButtonText('添加')
				.onClick(() => {
					const folder = prompt('输入Obsidian文件夹路径:');
					const categoryId = prompt('输入Sflood分类ID:');
					
					if (folder && categoryId) {
						this.plugin.settings.categoryMapping[folder] = categoryId;
						this.plugin.saveSettings();
						this.displayCategoryMappings(mappingContainer);
					}
				}));
	}

	displayCategoryMappings(container: HTMLElement) {
		container.empty();

		const mappings = this.plugin.settings.categoryMapping;
		
		if (Object.keys(mappings).length === 0) {
			container.createEl('p', { text: '暂无映射', cls: 'setting-item-description' });
			return;
		}

		for (const [folder, categoryId] of Object.entries(mappings)) {
			new Setting(container)
				.setName(folder)
				.setDesc(`分类ID: ${categoryId}`)
				.addButton(button => button
					.setButtonText('删除')
					.setWarning()
					.onClick(async () => {
						delete this.plugin.settings.categoryMapping[folder];
						await this.plugin.saveSettings();
						this.displayCategoryMappings(container);
					}));
		}
	}
}
