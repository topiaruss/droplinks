/**
 * Test utilities and helpers for DropLinks testing
 */

class TestHelpers {
  /**
   * Create mock file for drag and drop testing
   */
  static createMockFile(filename, content, type = "application/json") {
    return new File([content], filename, { type });
  }

  /**
   * Generate test data for import/export testing
   */
  static generateTestData(panelCount = 3, linksPerPanel = 5) {
    return {
      panels: Array.from({ length: panelCount }, (_, i) => ({
        id: i + 1,
        title: `Test Panel ${i + 1}`,
        links: Array.from({ length: linksPerPanel }, (_, j) => ({
          url: `https://test${i}-${j}.com`,
          title: `Test Link ${i}-${j}`,
          domain: `test${i}-${j}.com`,
          favicon: `https://www.google.com/s2/favicons?domain=test${i}-${j}.com&sz=32`,
          timestamp: Date.now(),
        })),
      })),
      panelCounter: panelCount,
      isCompactView: false,
      lastSaveTime: new Date().toISOString(),
      version: "1.0",
    };
  }

  /**
   * Simulate drag and drop events
   */
  static async simulateDragDrop(
    page,
    sourceSelector,
    targetSelector,
    dataTransferData = {},
  ) {
    await page.evaluate(
      ({ source, target, data }) => {
        const sourceElement = document.querySelector(source);
        const targetElement = document.querySelector(target);

        // Create drag start event
        const dragStartEvent = new DragEvent("dragstart", {
          bubbles: true,
          cancelable: true,
          dataTransfer: new DataTransfer(),
        });

        // Add data to dataTransfer
        Object.keys(data).forEach((key) => {
          dragStartEvent.dataTransfer.setData(key, data[key]);
        });

        sourceElement.dispatchEvent(dragStartEvent);

        // Create drag over event
        const dragOverEvent = new DragEvent("dragover", {
          bubbles: true,
          cancelable: true,
          dataTransfer: dragStartEvent.dataTransfer,
        });

        targetElement.dispatchEvent(dragOverEvent);

        // Create drop event
        const dropEvent = new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer: dragStartEvent.dataTransfer,
        });

        targetElement.dispatchEvent(dropEvent);
      },
      {
        source: sourceSelector,
        target: targetSelector,
        data: dataTransferData,
      },
    );
  }

  /**
   * Simulate file drop
   */
  static async simulateFileDrop(page, files, targetSelector = "body") {
    await page.evaluate(
      ({ fileData, target }) => {
        const targetElement = document.querySelector(target);

        const dropEvent = new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer: new DataTransfer(),
        });

        // Create File objects
        const fileObjects = fileData.map(
          ({ name, content, type }) => new File([content], name, { type }),
        );

        // Add files to dataTransfer
        fileObjects.forEach((file) => {
          dropEvent.dataTransfer.items.add(file);
        });

        targetElement.dispatchEvent(dropEvent);
      },
      { fileData: files, target: targetSelector },
    );
  }

  /**
   * Wait for element to be stable (not moving/changing)
   */
  static async waitForStable(page, selector, timeout = 5000) {
    let lastPosition = null;
    let stableCount = 0;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const currentPosition = await page.locator(selector).boundingBox();

      if (
        lastPosition &&
        currentPosition.x === lastPosition.x &&
        currentPosition.y === lastPosition.y
      ) {
        stableCount++;
        if (stableCount >= 3) break; // Stable for 3 checks
      } else {
        stableCount = 0;
      }

      lastPosition = currentPosition;
      await page.waitForTimeout(100);
    }
  }

  /**
   * Simulate long press/touch
   */
  static async simulateLongPress(page, selector, duration = 800) {
    const element = page.locator(selector);
    const boundingBox = await element.boundingBox();

    const x = boundingBox.x + boundingBox.width / 2;
    const y = boundingBox.y + boundingBox.height / 2;

    // Start touch
    await page.touchscreen.tap(x, y);

    // Hold for duration
    await page.waitForTimeout(duration);

    // Release
    await element.dispatchEvent("touchend");
  }

  /**
   * Check localStorage data
   */
  static async getLocalStorageData(page, key = "droplinks-data") {
    return await page.evaluate((storageKey) => {
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : null;
    }, key);
  }

  /**
   * Set localStorage data
   */
  static async setLocalStorageData(page, data, key = "droplinks-data") {
    await page.evaluate(
      ({ storageKey, storageData }) => {
        localStorage.setItem(storageKey, JSON.stringify(storageData));
      },
      { storageKey: key, storageData: data },
    );
  }

  /**
   * Clear localStorage
   */
  static async clearLocalStorage(page) {
    await page.evaluate(() => {
      localStorage.clear();
    });
  }

  /**
   * Take screenshot with custom name
   */
  static async takeScreenshot(
    page,
    name,
    path = "./test-results/screenshots/",
  ) {
    await page.screenshot({
      path: `${path}${name}-${Date.now()}.png`,
      fullPage: true,
    });
  }

  /**
   * Mock clipboard API
   */
  static async mockClipboard(page, text) {
    await page.addInitScript((clipboardText) => {
      Object.defineProperty(navigator, "clipboard", {
        value: {
          readText: () => Promise.resolve(clipboardText),
          writeText: (_text) => Promise.resolve(),
        },
      });
    }, text);
  }

  /**
   * Verify panel order
   */
  static async verifyPanelOrder(page, expectedTitles) {
    const actualTitles = await page.locator(".panel-title").allTextContents();
    return actualTitles.every(
      (title, index) => title === expectedTitles[index],
    );
  }

  /**
   * Count elements with retry
   */
  static async countElementsWithRetry(
    page,
    selector,
    expectedCount,
    maxRetries = 5,
  ) {
    for (let i = 0; i < maxRetries; i++) {
      const count = await page.locator(selector).count();
      if (count === expectedCount) return count;
      await page.waitForTimeout(500);
    }
    return await page.locator(selector).count();
  }
}

module.exports = TestHelpers;
