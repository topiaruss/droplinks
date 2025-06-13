class DropLinks {
    constructor() {
        this.panels = [];
        this.panelCounter = 0;
        this.draggedPanel = null;
        this.draggedLink = null;
        this.deleteTarget = null;
        
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.bindEvents();
        this.render();
        
        // Create initial panels if none exist
        if (this.panels.length === 0) {
            this.addPanel();
            this.addPanel();
            this.addPanel();
        }
    }

    bindEvents() {
        // Add panel button
        document.getElementById('add-panel').addEventListener('click', () => {
            this.addPanel();
        });

        // Export data button
        document.getElementById('export-data').addEventListener('click', () => {
            this.exportData();
        });

        // Modal events
        document.getElementById('confirm-delete').addEventListener('click', () => {
            this.confirmDelete();
        });

        document.getElementById('cancel-delete').addEventListener('click', () => {
            this.cancelDelete();
        });

        // Close modal on background click
        document.getElementById('confirmation-modal').addEventListener('click', (e) => {
            if (e.target.id === 'confirmation-modal') {
                this.cancelDelete();
            }
        });

        // Global drag events for external links
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
        });
    }

    addPanel() {
        const panel = {
            id: ++this.panelCounter,
            title: `Panel ${this.panelCounter}`,
            links: []
        };
        
        this.panels.push(panel);
        this.saveToStorage();
        this.render();
    }

    deletePanel(panelId) {
        this.deleteTarget = panelId;
        document.getElementById('confirmation-modal').classList.add('show');
    }

    confirmDelete() {
        if (this.deleteTarget) {
            this.panels = this.panels.filter(panel => panel.id !== this.deleteTarget);
            this.saveToStorage();
            this.render();
        }
        this.cancelDelete();
    }

    cancelDelete() {
        this.deleteTarget = null;
        document.getElementById('confirmation-modal').classList.remove('show');
    }

    async addLinkToPanel(panelId, url) {
        const panel = this.panels.find(p => p.id === panelId);
        if (!panel) return;

        // Check if link already exists in panel
        if (panel.links.some(link => link.url === url)) {
            return;
        }

        const linkData = await this.extractLinkData(url);
        panel.links.push(linkData);
        
        this.saveToStorage();
        this.render();
    }

    async extractLinkData(url) {
        try {
            // Try to get favicon and title
            const domain = new URL(url).hostname;
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
            
            // Create a simple link object
            const linkData = {
                url: url,
                title: this.extractTitleFromUrl(url),
                favicon: faviconUrl,
                domain: domain,
                timestamp: Date.now()
            };

            // Try to fetch page title (this will work for same-origin or CORS-enabled pages)
            try {
                const response = await fetch(url, { mode: 'no-cors' });
                // Since we can't read the response due to CORS, we'll use the URL-based title
            } catch (e) {
                // Fallback to URL-based title
            }

            return linkData;
        } catch (e) {
            return {
                url: url,
                title: url,
                favicon: null,
                domain: 'Unknown',
                timestamp: Date.now()
            };
        }
    }

    extractTitleFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            
            // Remove leading slash and file extensions
            let title = pathname.replace(/^\/+/, '').replace(/\.[^/.]+$/, '');
            
            // Replace hyphens and underscores with spaces
            title = title.replace(/[-_]/g, ' ');
            
            // Capitalize first letter of each word
            title = title.replace(/\b\w/g, l => l.toUpperCase());
            
            // If empty, use domain
            if (!title) {
                title = urlObj.hostname.replace(/^www\./, '');
            }
            
            return title || url;
        } catch (e) {
            return url;
        }
    }

    removeLinkFromPanel(panelId, linkIndex) {
        const panel = this.panels.find(p => p.id === panelId);
        if (panel && panel.links[linkIndex]) {
            panel.links.splice(linkIndex, 1);
            this.saveToStorage();
            this.render();
        }
    }

    movePanel(fromIndex, toIndex) {
        const panel = this.panels.splice(fromIndex, 1)[0];
        this.panels.splice(toIndex, 0, panel);
        this.saveToStorage();
        this.render();
    }

    render() {
        const container = document.getElementById('panels-container');
        container.innerHTML = '';

        this.panels.forEach((panel, index) => {
            const panelElement = this.createPanelElement(panel, index);
            container.appendChild(panelElement);
        });
    }

    createPanelElement(panel, index) {
        const panelDiv = document.createElement('div');
        panelDiv.className = 'panel';
        panelDiv.draggable = true;
        panelDiv.dataset.panelId = panel.id;
        panelDiv.dataset.index = index;

        panelDiv.innerHTML = `
            <div class="panel-header">
                <div class="panel-title" contenteditable="true">${panel.title}</div>
                <button class="delete-btn" title="Delete Panel">×</button>
            </div>
            <div class="panel-content">
                ${panel.links.length === 0 
                    ? '<div class="panel-empty">Drop links here</div>'
                    : panel.links.map((link, linkIndex) => this.createLinkElement(link, linkIndex, panel.id)).join('')
                }
            </div>
        `;

        // Bind events for this panel
        this.bindPanelEvents(panelDiv, panel, index);
        this.bindLinkEvents(panelDiv, panel);

        return panelDiv;
    }

    createLinkElement(link, linkIndex, panelId) {
        const faviconHtml = link.favicon 
            ? `<img src="${link.favicon}" alt="" class="link-favicon" onerror="this.style.display='none'">`
            : '<div class="link-favicon" style="background: #e2e8f0; border-radius: 3px;"></div>';

        return `
            <div class="link-item" data-link-index="${linkIndex}" data-panel-id="${panelId}" data-url="${link.url}" draggable="true">
                ${faviconHtml}
                <div class="link-info">
                    <div class="link-title">${link.title}</div>
                    <div class="link-url">${link.domain}</div>
                </div>
                <button class="delete-btn" onclick="event.preventDefault(); event.stopPropagation(); dropLinks.removeLinkFromPanel(${panelId}, ${linkIndex})" title="Remove Link">×</button>
            </div>
        `;
    }

    bindPanelEvents(panelElement, panel, index) {
        // Delete panel button
        const deleteBtn = panelElement.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deletePanel(panel.id);
        });

        // Editable title
        const titleElement = panelElement.querySelector('.panel-title');
        titleElement.addEventListener('blur', () => {
            panel.title = titleElement.textContent;
            this.saveToStorage();
        });

        titleElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                titleElement.blur();
            }
        });

        // Drag and drop for panel reordering
        panelElement.addEventListener('dragstart', (e) => {
            // Only allow panel dragging if the drag started from panel background, not a link
            if (e.target.closest('.link-item')) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            this.draggedPanel = { element: panelElement, index: index };
            panelElement.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        panelElement.addEventListener('dragend', () => {
            panelElement.classList.remove('dragging');
            this.draggedPanel = null;
        });

        panelElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (this.draggedLink || (this.draggedPanel && this.draggedPanel.element !== panelElement)) {
                panelElement.classList.add('drag-over');
            }
        });

        panelElement.addEventListener('dragleave', () => {
            panelElement.classList.remove('drag-over');
        });

        panelElement.addEventListener('drop', (e) => {
            e.preventDefault();
            panelElement.classList.remove('drag-over');

            // Check if it's a link being moved between panels
            if (this.draggedLink) {
                const targetPanelId = panel.id;
                const sourcePanelId = this.draggedLink.panelId;
                const linkIndex = this.draggedLink.linkIndex;
                
                if (targetPanelId !== sourcePanelId) {
                    this.moveLinkBetweenPanels(sourcePanelId, targetPanelId, linkIndex);
                }
                return;
            }
            
            // Check if it's a panel being reordered
            if (this.draggedPanel && this.draggedPanel.element !== panelElement) {
                const fromIndex = this.draggedPanel.index;
                const toIndex = parseInt(panelElement.dataset.index);
                this.movePanel(fromIndex, toIndex);
                return;
            }

            // Check if it's an external link being dropped
            if (dragData && this.isValidUrl(dragData)) {
                this.addLinkToPanel(panel.id, dragData);
            }
        });

        // Handle external link drops
        panelElement.addEventListener('dragenter', (e) => {
            e.preventDefault();
            panelElement.classList.add('drag-over');
        });
    }

    bindLinkEvents(panelElement, panel) {
        const linkElements = panelElement.querySelectorAll('.link-item');
        
        linkElements.forEach((linkElement) => {
            const linkIndex = parseInt(linkElement.dataset.linkIndex);
            const panelId = parseInt(linkElement.dataset.panelId);
            const url = linkElement.dataset.url;
            let isDragging = false;
            let dragStarted = false;
            
            // Remove draggable attribute and use mouse events instead
            linkElement.draggable = false;
            
            linkElement.addEventListener('mousedown', (e) => {
                if (e.target.classList.contains('delete-btn')) return;
                
                dragStarted = true;
                linkElement.style.pointerEvents = 'none';
                linkElement.classList.add('dragging');
                
                this.draggedLink = {
                    panelId: panelId,
                    linkIndex: linkIndex,
                    element: linkElement
                };
                
                const rect = linkElement.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                const offsetY = e.clientY - rect.top;
                
                const handleMouseMove = (e) => {
                    if (!dragStarted) return;
                    
                    isDragging = true;
                    linkElement.style.position = 'fixed';
                    linkElement.style.left = (e.clientX - offsetX) + 'px';
                    linkElement.style.top = (e.clientY - offsetY) + 'px';
                    linkElement.style.zIndex = '1000';
                    
                    // Find what's under the cursor
                    const elementUnder = document.elementFromPoint(e.clientX, e.clientY);
                    const targetPanel = elementUnder?.closest('.panel');
                    
                    // Remove drag-over class from all panels
                    document.querySelectorAll('.panel').forEach(p => p.classList.remove('drag-over'));
                    
                    // Add drag-over class to target panel
                    if (targetPanel && targetPanel !== panelElement) {
                        targetPanel.classList.add('drag-over');
                    }
                };
                
                const handleMouseUp = (e) => {
                    dragStarted = false;
                    linkElement.style.pointerEvents = '';
                    linkElement.classList.remove('dragging');
                    linkElement.style.position = '';
                    linkElement.style.left = '';
                    linkElement.style.top = '';
                    linkElement.style.zIndex = '';
                    
                    // Remove drag-over class from all panels
                    document.querySelectorAll('.panel').forEach(p => p.classList.remove('drag-over'));
                    
                    if (isDragging) {
                        // Find the target panel
                        const elementUnder = document.elementFromPoint(e.clientX, e.clientY);
                        const targetPanel = elementUnder?.closest('.panel');
                        
                        if (targetPanel && targetPanel !== panelElement) {
                            const targetPanelId = parseInt(targetPanel.dataset.panelId);
                            this.moveLinkBetweenPanels(panelId, targetPanelId, linkIndex);
                        }
                    } else if (!isDragging) {
                        // This was a click, not a drag
                        window.open(url, '_blank');
                    }
                    
                    this.draggedLink = null;
                    isDragging = false;
                    
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
                
                e.preventDefault();
            });
        });
    }

    moveLinkBetweenPanels(sourcePanelId, targetPanelId, linkIndex) {
        const sourcePanel = this.panels.find(p => p.id === sourcePanelId);
        const targetPanel = this.panels.find(p => p.id === targetPanelId);
        
        if (sourcePanel && targetPanel && sourcePanel.links[linkIndex]) {
            const link = sourcePanel.links.splice(linkIndex, 1)[0];
            targetPanel.links.push(link);
            
            this.saveToStorage();
            this.render();
        }
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    saveToStorage() {
        localStorage.setItem('droplinks-data', JSON.stringify({
            panels: this.panels,
            panelCounter: this.panelCounter
        }));
    }

    loadFromStorage() {
        const data = localStorage.getItem('droplinks-data');
        if (data) {
            const parsed = JSON.parse(data);
            this.panels = parsed.panels || [];
            this.panelCounter = parsed.panelCounter || 0;
        }
    }

    exportData() {
        const data = {
            panels: this.panels,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `droplinks-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.panels && Array.isArray(data.panels)) {
                this.panels = data.panels;
                this.panelCounter = Math.max(...this.panels.map(p => p.id), 0);
                this.saveToStorage();
                this.render();
                return true;
            }
        } catch (e) {
            console.error('Import failed:', e);
        }
        return false;
    }
}

// Initialize the application
const dropLinks = new DropLinks();