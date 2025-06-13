class DropLinks {
  constructor(options = {}) {
    this.panels = [];
    this.panelCounter = 0;
    this.draggedPanel = null;
    this.draggedLink = null;
    this.deleteTarget = null;
    this.isCompactView = false;
    this.lastSaveTime = null;
    this.syncInterval = null;
    this.fileHandle = null; // For File System Access API

    // Allow dependency injection for testing
    this.document =
      options.document || (typeof document !== "undefined" ? document : null);
    this.window =
      options.window || (typeof window !== "undefined" ? window : null);
    this.localStorage =
      options.localStorage ||
      (typeof localStorage !== "undefined" ? localStorage : null);

    // Only initialize if we have a document (skip for unit tests without DOM)
    if (this.document && !options.skipInit) {
      this.init();
    }
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

    // Start sync interval to check for file updates every 2 minutes
    // Disabled auto-sync due to browser security restrictions - use manual sync button instead
    // this.startSyncInterval();
  }

  bindEvents() {
    if (!this.document) return;

    // Add panel button
    const addPanelBtn = this.document.getElementById("add-panel");
    if (addPanelBtn) {
      addPanelBtn.addEventListener("click", () => {
        this.addPanel();
      });
    }

    // View toggle button
    const viewToggleBtn = this.document.getElementById("view-toggle");
    if (viewToggleBtn) {
      viewToggleBtn.addEventListener("click", () => {
        this.toggleView();
      });
    }

    // Manual sync button
    const syncBtn = this.document.getElementById("sync-now");
    if (syncBtn) {
      syncBtn.addEventListener("click", () => {
        this.checkForFileUpdates();
      });
    }

    // Export data button
    const exportBtn = this.document.getElementById("export-data");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        this.exportData();
      });
    }

    // Modal events
    const confirmBtn = this.document.getElementById("confirm-delete");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => {
        this.confirmDelete();
      });
    }

    const cancelBtn = this.document.getElementById("cancel-delete");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        this.cancelDelete();
      });
    }

    // Close modal on background click
    const modal = this.document.getElementById("confirmation-modal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target.id === "confirmation-modal") {
          this.cancelDelete();
        }
      });
    }

    // Global drag events for external links and JSON files
    this.document.addEventListener("dragenter", (e) => {
      console.log("Dragenter event");
      e.preventDefault();
    });

    this.document.addEventListener("dragover", (e) => {
      console.log("Dragover event");
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    });

    this.document.addEventListener("drop", (e) => {
      console.log("Drop event detected");
      e.preventDefault();
      this.handleGlobalDrop(e);
    });

    // Also bind to body specifically
    if (this.document.body) {
      this.document.body.addEventListener("dragover", (e) => {
        console.log("Body dragover");
        e.preventDefault();
      });

      this.document.body.addEventListener("drop", (e) => {
        console.log("Body drop");
        e.preventDefault();
        this.handleGlobalDrop(e);
      });

      // Make the page focusable for paste events
      this.document.body.tabIndex = -1;
      this.document.body.focus();
    }

    // Global paste event for URLs
    this.document.addEventListener("paste", (e) => {
      this.handleGlobalPaste(e);
    });

    // Alternative: keyboard shortcut (Ctrl+Shift+V or Cmd+Shift+V)
    this.document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "V") {
        e.preventDefault();
        this.triggerPasteFromClipboard();
      }
    });
  }

  addPanel() {
    const panel = {
      id: ++this.panelCounter,
      title: `Panel ${this.panelCounter}`,
      links: [],
    };

    this.panels.push(panel);
    this.saveToStorage();
    this.render();
  }

  deletePanel(panelId) {
    this.deleteTarget = panelId;
    const modal = this.document?.getElementById("confirmation-modal");
    if (modal) {
      modal.classList.add("show");
    }
  }

  confirmDelete() {
    if (this.deleteTarget) {
      this.panels = this.panels.filter(
        (panel) => panel.id !== this.deleteTarget,
      );
      this.saveToStorage();
      this.render();
    }
    this.cancelDelete();
  }

  cancelDelete() {
    this.deleteTarget = null;
    const modal = this.document?.getElementById("confirmation-modal");
    if (modal) {
      modal.classList.remove("show");
    }
  }

  toggleView() {
    this.isCompactView = !this.isCompactView;
    const container = this.document?.getElementById("panels-container");
    const toggleBtn = this.document?.getElementById("view-toggle");
    const toggleText = toggleBtn?.querySelector(".toggle-text");

    if (container) {
      if (this.isCompactView) {
        container.classList.add("compact");
      } else {
        container.classList.remove("compact");
      }
    }

    if (toggleText) {
      toggleText.textContent = this.isCompactView
        ? "Large View"
        : "Compact View";
    }

    this.saveToStorage();
  }

  handleGlobalDrop(e) {
    console.log("Global drop event triggered", e);
    console.log("Files:", e.dataTransfer.files);

    // Check if files were dropped
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      console.log("File dropped:", file.name, file.type);

      // Check if it's a JSON file (prioritize filename over MIME type for .droplinks files)
      if (
        file.name.endsWith(".droplinks") ||
        file.name.endsWith(".json") ||
        file.type === "application/json"
      ) {
        console.log("Valid file detected, importing...");
        this.importFromFile(file);
        return;
      } else {
        console.log(
          "File not recognized as importable. Name:",
          file.name,
          "Type:",
          file.type,
        );
      }
    } else {
      console.log("No files in drop event");
    }
  }

  handleGlobalPaste(e) {
    console.log("Paste event triggered", e.target);

    // Only handle paste if not in an editable element
    if (
      e.target.contentEditable === "true" ||
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA"
    ) {
      console.log("Ignoring paste in editable element");
      return;
    }

    e.preventDefault();
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData("text");

    console.log("Pasted text:", pastedText);

    if (this.isValidUrl(pastedText)) {
      console.log("Valid URL detected, showing panel selector");
      this.handleUrlPaste(pastedText);
    } else {
      console.log("Not a valid URL");
    }
  }

  async triggerPasteFromClipboard() {
    try {
      console.log("Attempting to read clipboard...");
      const text = await navigator.clipboard.readText();
      console.log("Clipboard text:", text);

      if (this.isValidUrl(text)) {
        console.log("Valid URL detected, showing panel selector");
        this.handleUrlPaste(text);
      } else {
        console.log("Not a valid URL");
        this.showMessage("Clipboard does not contain a valid URL", "error");
      }
    } catch (e) {
      console.error("Failed to read clipboard:", e);
      this.showMessage(
        "Could not access clipboard. Try using Ctrl+V instead.",
        "error",
      );
    }
  }

  handleUrlPaste(url) {
    // Find the panel under the cursor or add to the first panel
    const panels = document.querySelectorAll(".panel");

    if (panels.length === 0) {
      this.addPanel();
      // Wait for render then add link
      setTimeout(() => {
        this.addLinkToPanel(this.panels[0].id, url);
      }, 100);
      return;
    }

    // Add to the first panel by default, or show a selection UI
    this.showPanelSelector(url);
  }

  showPanelSelector(url) {
    const modal = document.createElement("div");
    modal.className = "modal show";
    modal.innerHTML = `
            <div class="modal-content">
                <h3>Add Link to Panel</h3>
                <p>Select which panel to add the link to:</p>
                <div class="panel-selector">
                    ${this.panels
                      .map(
                        (panel) => `
                        <button class="btn btn-secondary panel-select-btn" data-panel-id="${panel.id}">
                            ${panel.title}
                        </button>
                    `,
                      )
                      .join("")}
                </div>
                <div class="modal-actions" style="margin-top: 1rem;">
                    <button class="btn btn-secondary cancel-paste">Cancel</button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Handle panel selection
    modal.addEventListener("click", (e) => {
      if (e.target.classList.contains("panel-select-btn")) {
        const panelId = parseInt(e.target.dataset.panelId);
        this.addLinkToPanel(panelId, url);
        document.body.removeChild(modal);
      } else if (
        e.target.classList.contains("cancel-paste") ||
        e.target === modal
      ) {
        document.body.removeChild(modal);
      }
    });
  }

  showLinkEditModal(panelId, linkIndex) {
    const panel = this.panels.find((p) => p.id === panelId);
    if (!panel || !panel.links[linkIndex]) return;

    const link = panel.links[linkIndex];

    const modal = document.createElement("div");
    modal.className = "modal show";
    modal.innerHTML = `
            <div class="modal-content">
                <h3>Edit Link</h3>
                <div class="edit-fields">
                    <div class="field-group">
                        <label>Title:</label>
                        <input type="text" id="edit-title" value="${link.title}" class="edit-input">
                    </div>
                    <div class="field-group">
                        <label>URL:</label>
                        <input type="text" id="edit-url" value="${link.url}" class="edit-input">
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary save-link">Save</button>
                    <button class="btn btn-secondary cancel-edit">Cancel</button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Focus on title input
    const titleInput = modal.querySelector("#edit-title");
    titleInput.focus();
    titleInput.select();

    // Handle save/cancel
    modal.addEventListener("click", (e) => {
      if (e.target.classList.contains("save-link")) {
        const newTitle = modal.querySelector("#edit-title").value.trim();
        const newUrl = modal.querySelector("#edit-url").value.trim();

        if (newTitle && newUrl && this.isValidUrl(newUrl)) {
          // Update the link
          link.title = newTitle;
          link.url = newUrl;

          // Update domain if URL changed
          try {
            link.domain = new URL(newUrl).hostname;
            link.favicon = `https://www.google.com/s2/favicons?domain=${link.domain}&sz=32`;
          } catch (e) {
            link.domain = "Unknown";
          }

          this.saveToStorage();
          this.render();
          this.showMessage("Link updated successfully!", "success");
        } else {
          this.showMessage("Please enter a valid title and URL", "error");
          return;
        }

        document.body.removeChild(modal);
      } else if (
        e.target.classList.contains("cancel-edit") ||
        e.target === modal
      ) {
        document.body.removeChild(modal);
      }
    });

    // Handle Enter key to save
    modal.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        modal.querySelector(".save-link").click();
      } else if (e.key === "Escape") {
        document.body.removeChild(modal);
      }
    });
  }

  async importFromFile(file) {
    try {
      const text = await file.text();
      const success = this.importData(text);

      if (success) {
        // Show success message briefly
        this.showMessage("Data imported successfully!", "success");
      } else {
        this.showMessage(
          "Failed to import data. Invalid JSON format.",
          "error",
        );
      }
    } catch (e) {
      console.error("Import error:", e);
      this.showMessage("Failed to read file.", "error");
    }
  }

  showMessage(message, type = "info") {
    // Create a temporary message overlay
    const messageDiv = document.createElement("div");
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${
              type === "success"
                ? "#48bb78"
                : type === "error"
                  ? "#e53e3e"
                  : "#4299e1"
            };
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            font-weight: 500;
        `;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
      document.body.removeChild(messageDiv);
    }, 3000);
  }

  async addLinkToPanel(panelId, url) {
    const panel = this.panels.find((p) => p.id === panelId);
    if (!panel) return;

    // Check if link already exists in panel
    if (panel.links.some((link) => link.url === url)) {
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
        timestamp: Date.now(),
      };

      // Try to fetch page title (this will work for same-origin or CORS-enabled pages)
      try {
        await fetch(url, { mode: "no-cors" }); // Try to fetch (result not used due to CORS)
        // Since we can't read the response due to CORS, we'll use the URL-based title
      } catch (_e) {
        // Fallback to URL-based title
      }

      return linkData;
    } catch (_e) {
      return {
        url: url,
        title: url,
        favicon: null,
        domain: "Unknown",
        timestamp: Date.now(),
      };
    }
  }

  extractTitleFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      // Remove leading slash and file extensions
      let title = pathname.replace(/^\/+/, "").replace(/\.[^/.]+$/, "");

      // Replace hyphens and underscores with spaces
      title = title.replace(/[-_]/g, " ");

      // Capitalize first letter of each word
      title = title.replace(/\b\w/g, (l) => l.toUpperCase());

      // If empty, use domain
      if (!title) {
        title = urlObj.hostname.replace(/^www\./, "");
      }

      return title || url;
    } catch (e) {
      return url;
    }
  }

  removeLinkFromPanel(panelId, linkIndex) {
    const panel = this.panels.find((p) => p.id === panelId);
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
    const container = this.document?.getElementById("panels-container");
    if (!container) return;

    container.innerHTML = "";

    this.panels.forEach((panel, index) => {
      const panelElement = this.createPanelElement(panel, index);
      container.appendChild(panelElement);
    });
  }

  createPanelElement(panel, index) {
    const panelDiv = this.document.createElement("div");
    panelDiv.className = "panel";
    panelDiv.draggable = true;
    panelDiv.dataset.panelId = panel.id;
    panelDiv.dataset.index = index;

    panelDiv.innerHTML = `
            <div class="panel-header">
                <div class="panel-title" contenteditable="true">${
                  panel.title
                }</div>
                <button class="delete-btn" title="Delete Panel">×</button>
            </div>
            <div class="panel-content">
                ${
                  panel.links.length === 0
                    ? '<div class="panel-empty">Drop links here</div>'
                    : panel.links
                        .map((link, linkIndex) =>
                          this.createLinkElement(link, linkIndex, panel.id),
                        )
                        .join("")
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
            <div class="link-item" data-link-index="${linkIndex}" data-panel-id="${panelId}" data-url="${link.url}" draggable="false">
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
    const deleteBtn = panelElement.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.deletePanel(panel.id);
    });

    // Editable title
    const titleElement = panelElement.querySelector(".panel-title");
    titleElement.addEventListener("blur", () => {
      panel.title = titleElement.textContent;
      this.saveToStorage();
    });

    titleElement.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        titleElement.blur();
      }
    });

    // Drag and drop for panel reordering
    panelElement.addEventListener("dragstart", (e) => {
      // Only allow panel dragging if the drag started from panel background, not a link
      if (e.target.closest(".link-item")) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      this.draggedPanel = { element: panelElement, index: index };
      panelElement.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    panelElement.addEventListener("dragend", () => {
      panelElement.classList.remove("dragging");
      this.draggedPanel = null;
    });

    panelElement.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      if (
        this.draggedLink ||
        (this.draggedPanel && this.draggedPanel.element !== panelElement)
      ) {
        panelElement.classList.add("drag-over");
      }
    });

    panelElement.addEventListener("dragleave", () => {
      panelElement.classList.remove("drag-over");
    });

    panelElement.addEventListener("drop", (e) => {
      e.preventDefault();
      panelElement.classList.remove("drag-over");

      const dragData = e.dataTransfer.getData("text/plain");

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
    panelElement.addEventListener("dragenter", (e) => {
      e.preventDefault();
      panelElement.classList.add("drag-over");
    });
  }

  bindLinkEvents(panelElement, _panel) {
    const linkElements = panelElement.querySelectorAll(".link-item");

    linkElements.forEach((linkElement) => {
      const linkIndex = parseInt(linkElement.dataset.linkIndex);
      const panelId = parseInt(linkElement.dataset.panelId);
      const url = linkElement.dataset.url;
      let isDragging = false;
      let dragStarted = false;
      let longPressTimer = null;
      let longPressTriggered = false;

      // Remove draggable attribute and use mouse events instead
      linkElement.draggable = false;

      const startLongPress = (e) => {
        if (e.target.classList.contains("delete-btn")) return;

        longPressTimer = setTimeout(() => {
          longPressTriggered = true;
          this.showLinkEditModal(panelId, linkIndex);
        }, 800); // 800ms for long press
      };

      const cancelLongPress = () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      };

      // Mouse events
      linkElement.addEventListener("mousedown", (e) => {
        if (e.target.classList.contains("delete-btn")) return;

        longPressTriggered = false;
        startLongPress(e);

        // Small delay to distinguish between click, drag, and long press
        setTimeout(() => {
          if (longPressTriggered) return;

          dragStarted = true;
          linkElement.style.pointerEvents = "none";
          linkElement.classList.add("dragging");

          this.draggedLink = {
            panelId: panelId,
            linkIndex: linkIndex,
            element: linkElement,
          };

          const rect = linkElement.getBoundingClientRect();
          const offsetX = e.clientX - rect.left;
          const offsetY = e.clientY - rect.top;

          const handleMouseMove = (e) => {
            if (!dragStarted || longPressTriggered) return;

            cancelLongPress();
            isDragging = true;
            linkElement.style.position = "fixed";
            linkElement.style.left = e.clientX - offsetX + "px";
            linkElement.style.top = e.clientY - offsetY + "px";
            linkElement.style.zIndex = "1000";

            // Find what's under the cursor
            const elementUnder = document.elementFromPoint(
              e.clientX,
              e.clientY,
            );
            const targetPanel = elementUnder?.closest(".panel");

            // Remove drag-over class from all panels
            document
              .querySelectorAll(".panel")
              .forEach((p) => p.classList.remove("drag-over"));

            // Add drag-over class to target panel
            if (targetPanel && targetPanel !== panelElement) {
              targetPanel.classList.add("drag-over");
            }
          };

          const handleMouseUp = (e) => {
            cancelLongPress();
            dragStarted = false;
            linkElement.style.pointerEvents = "";
            linkElement.classList.remove("dragging");
            linkElement.style.position = "";
            linkElement.style.left = "";
            linkElement.style.top = "";
            linkElement.style.zIndex = "";

            // Remove drag-over class from all panels
            document
              .querySelectorAll(".panel")
              .forEach((p) => p.classList.remove("drag-over"));

            if (longPressTriggered) {
              // Long press was triggered, do nothing
            } else if (isDragging) {
              // Find the target panel
              const elementUnder = document.elementFromPoint(
                e.clientX,
                e.clientY,
              );
              const targetPanel = elementUnder?.closest(".panel");

              if (targetPanel && targetPanel !== panelElement) {
                const targetPanelId = parseInt(targetPanel.dataset.panelId);
                this.moveLinkBetweenPanels(panelId, targetPanelId, linkIndex);
              }
            } else if (!isDragging) {
              // This was a click, not a drag
              window.open(url, "_blank");
            }

            this.draggedLink = null;
            isDragging = false;

            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
          };

          document.addEventListener("mousemove", handleMouseMove);
          document.addEventListener("mouseup", handleMouseUp);
        }, 150); // 150ms delay to allow for long press detection

        e.preventDefault();
      });

      // Touch events for mobile
      linkElement.addEventListener(
        "touchstart",
        (e) => {
          if (e.target.classList.contains("delete-btn")) return;

          longPressTriggered = false;
          startLongPress(e);
          e.preventDefault();
        },
        { passive: false },
      );

      linkElement.addEventListener(
        "touchmove",
        (_e) => {
          cancelLongPress();
        },
        { passive: true },
      );

      linkElement.addEventListener(
        "touchend",
        (e) => {
          cancelLongPress();
          if (!longPressTriggered) {
            // This was a tap, open the URL
            window.open(url, "_blank");
          }
          e.preventDefault();
        },
        { passive: false },
      );

      linkElement.addEventListener("mouseup", cancelLongPress);
      linkElement.addEventListener("mouseleave", cancelLongPress);
    });
  }

  moveLinkBetweenPanels(sourcePanelId, targetPanelId, linkIndex) {
    const sourcePanel = this.panels.find((p) => p.id === sourcePanelId);
    const targetPanel = this.panels.find((p) => p.id === targetPanelId);

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
    this.lastSaveTime = new Date().toISOString();

    const data = {
      panels: this.panels,
      panelCounter: this.panelCounter,
      isCompactView: this.isCompactView,
      lastSaveTime: this.lastSaveTime,
    };

    if (this.localStorage) {
      this.localStorage.setItem("droplinks-data", JSON.stringify(data));
    }

    // Auto-save to Downloads folder
    this.autoSaveToDownloads(data);
  }

  autoSaveToDownloads(data) {
    try {
      const exportData = {
        ...data,
        exportDate: new Date().toISOString(),
        version: "1.0",
      };

      // Use a more unique approach to try to force overwrite
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      // Try using the File System Access API for better file control (Chrome/Edge)
      if ("showSaveFilePicker" in window) {
        this.saveWithFileSystemAPI(blob);
      } else {
        // Fallback to regular download (will still increment unfortunately)
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = ".droplinks";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.log("Auto-save failed:", e);
    }
  }

  async saveWithFileSystemAPI(blob) {
    try {
      // Only prompt for file location on first save
      if (!this.fileHandle) {
        this.fileHandle = await window.showSaveFilePicker({
          suggestedName: ".droplinks",
          types: [
            {
              description: "DropLinks files",
              accept: { "application/json": [".droplinks", ".json"] },
            },
          ],
        });
        this.saveFileHandleToStorage();
      }

      const writable = await this.fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      console.log("Auto-saved to", this.fileHandle.name);
    } catch (e) {
      console.log("File System API save failed, falling back:", e);
      // Reset file handle if save failed
      this.fileHandle = null;

      // Fallback to regular download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ".droplinks";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  startSyncInterval() {
    // Check for file updates every 2 minutes (120,000 ms)
    this.syncInterval = setInterval(() => {
      this.checkForFileUpdates();
    }, 120000);

    console.log("Auto-sync started - checking for updates every 2 minutes");
  }

  stopSyncInterval() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log("Auto-sync stopped");
    }
  }

  async checkForFileUpdates() {
    try {
      // If we have a saved file handle, use it directly
      if (this.fileHandle) {
        console.log("Reading from saved file location...");
        const file = await this.fileHandle.getFile();
        await this.checkFileTimestamp(file);
        return;
      }

      // If File System Access API is available, use it to remember the file
      if ("showOpenFilePicker" in window) {
        console.log(
          "Please select your .droplinks file once (location will be remembered)",
        );
        const [fileHandle] = await window.showOpenFilePicker({
          types: [
            {
              description: "DropLinks files",
              accept: { "application/json": [".droplinks", ".json"] },
            },
          ],
        });

        // Remember this file handle for future syncs
        this.fileHandle = fileHandle;
        this.saveFileHandleToStorage();

        const file = await fileHandle.getFile();
        await this.checkFileTimestamp(file);
        return;
      }

      // Fallback for browsers without File System Access API
      this.fallbackFileSelection();
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error("File access failed:", e);
        this.fallbackFileSelection();
      }
    }
  }

  fallbackFileSelection() {
    // Create a hidden file input to trigger file selection
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".droplinks,.json";
    input.style.display = "none";

    console.log("Please select your .droplinks file to check for updates");

    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        this.checkFileTimestamp(file);
      }
      document.body.removeChild(input);
    });

    document.body.appendChild(input);
    input.click();
  }

  saveFileHandleToStorage() {
    // Note: File handles can't be serialized directly to localStorage
    // We just track that we have one for this session
    this.hasRememberedFile = true;
  }

  async checkFileTimestamp(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.lastSaveTime) {
        const fileTime = new Date(data.lastSaveTime);
        const localTime = new Date(this.lastSaveTime || 0);

        if (fileTime > localTime) {
          console.log("File is newer than local data, importing...");
          this.showMessage("Newer data found - syncing...", "info");

          // Import the newer data
          const success = this.importData(text);
          if (success) {
            this.showMessage("Synced with newer data!", "success");
          }
        } else {
          console.log("Local data is up to date");
        }
      }
    } catch (e) {
      console.error("Failed to check file timestamp:", e);
    }
  }

  loadFromStorage() {
    if (!this.localStorage) return;

    const data = this.localStorage.getItem("droplinks-data");
    if (data) {
      const parsed = JSON.parse(data);
      this.panels = parsed.panels || [];
      this.panelCounter = parsed.panelCounter || 0;
      this.isCompactView = parsed.isCompactView || false;
      this.lastSaveTime = parsed.lastSaveTime || null;

      // Apply the view state
      const container = this.document?.getElementById("panels-container");
      const toggleBtn = this.document?.getElementById("view-toggle");
      const toggleText = toggleBtn?.querySelector(".toggle-text");

      if (container) {
        if (this.isCompactView) {
          container.classList.add("compact");
        } else {
          container.classList.remove("compact");
        }
      }

      if (toggleText) {
        toggleText.textContent = this.isCompactView
          ? "Large View"
          : "Compact View";
      }
    }
  }

  exportData() {
    const data = {
      panels: this.panels,
      exportDate: new Date().toISOString(),
      version: "1.0",
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `droplinks-export-${
      new Date().toISOString().split("T")[0]
    }.json`;
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
        this.panelCounter = Math.max(...this.panels.map((p) => p.id), 0);

        // Import timestamps
        if (data.lastSaveTime) {
          this.lastSaveTime = data.lastSaveTime;
        }

        // Import view state if available
        if (data.isCompactView !== undefined) {
          this.isCompactView = data.isCompactView;

          // Apply the view state
          const container = this.document?.getElementById("panels-container");
          const toggleBtn = this.document?.getElementById("view-toggle");
          const toggleText = toggleBtn?.querySelector(".toggle-text");

          if (container) {
            if (this.isCompactView) {
              container.classList.add("compact");
            } else {
              container.classList.remove("compact");
            }
          }

          if (toggleText) {
            toggleText.textContent = this.isCompactView
              ? "Large View"
              : "Compact View";
          }
        }

        // Save to localStorage but don't auto-save to Downloads (to avoid sync loops)
        const saveData = {
          panels: this.panels,
          panelCounter: this.panelCounter,
          isCompactView: this.isCompactView,
          lastSaveTime: this.lastSaveTime,
        };
        if (this.localStorage) {
          this.localStorage.setItem("droplinks-data", JSON.stringify(saveData));
        }

        this.render();
        return true;
      }
    } catch (e) {
      console.error("Import failed:", e);
    }
    return false;
  }
}

// Initialize the application
console.log("hello - DropLinks script loaded");
let dropLinks;
try {
  dropLinks = new DropLinks();
  window.dropLinks = dropLinks; // Make it globally accessible
  console.log("DropLinks initialized successfully");
} catch (e) {
  console.error("Failed to initialize DropLinks:", e);
}

// Export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = DropLinks;
}
