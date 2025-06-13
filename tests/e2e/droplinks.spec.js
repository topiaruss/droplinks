const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('DropLinks E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Load the HTML file
    const htmlPath = path.join(__dirname, '../../droplinks.html');
    await page.goto(`file://${htmlPath}`);
    
    // Wait for app to initialize
    await page.waitForSelector('.panels-grid');
    await expect(page.locator('h1')).toHaveText('DropLinks');
  });

  test('should initialize with default panels', async ({ page }) => {
    // Check that 3 default panels are created
    const panels = page.locator('.panel');
    await expect(panels).toHaveCount(3);
    
    // Verify panel titles
    await expect(panels.nth(0).locator('.panel-title')).toHaveText('Panel 1');
    await expect(panels.nth(1).locator('.panel-title')).toHaveText('Panel 2');
    await expect(panels.nth(2).locator('.panel-title')).toHaveText('Panel 3');
  });

  test('should add new panel', async ({ page }) => {
    await page.click('#add-panel');
    
    const panels = page.locator('.panel');
    await expect(panels).toHaveCount(4);
    await expect(panels.nth(3).locator('.panel-title')).toHaveText('Panel 4');
  });

  test('should toggle compact view', async ({ page }) => {
    const container = page.locator('#panels-container');
    
    // Should start in large view
    await expect(container).not.toHaveClass(/compact/);
    
    // Toggle to compact view
    await page.click('#view-toggle');
    await expect(container).toHaveClass(/compact/);
    
    // Toggle back to large view
    await page.click('#view-toggle');
    await expect(container).not.toHaveClass(/compact/);
  });

  test('should edit panel title', async ({ page }) => {
    const titleElement = page.locator('.panel').first().locator('.panel-title');
    
    // Edit title
    await titleElement.click();
    await titleElement.fill('My Custom Panel');
    await titleElement.blur();
    
    // Verify title changed
    await expect(titleElement).toHaveText('My Custom Panel');
  });

  test('should delete panel with confirmation', async ({ page }) => {
    const initialPanelCount = await page.locator('.panel').count();
    
    // Click delete button
    await page.locator('.panel').first().locator('.delete-btn').click();
    
    // Confirm deletion
    await expect(page.locator('#confirmation-modal')).toHaveClass(/show/);
    await page.click('#confirm-delete');
    
    // Verify panel is deleted
    await expect(page.locator('.panel')).toHaveCount(initialPanelCount - 1);
    await expect(page.locator('#confirmation-modal')).not.toHaveClass(/show/);
  });

  test('should cancel panel deletion', async ({ page }) => {
    const initialPanelCount = await page.locator('.panel').count();
    
    // Click delete button
    await page.locator('.panel').first().locator('.delete-btn').click();
    
    // Cancel deletion
    await page.click('#cancel-delete');
    
    // Verify panel still exists
    await expect(page.locator('.panel')).toHaveCount(initialPanelCount);
    await expect(page.locator('#confirmation-modal')).not.toHaveClass(/show/);
  });

  test('should simulate file drop', async ({ page }) => {
    // Create test data
    const testData = {
      panels: [
        {
          id: 1,
          title: 'Test Panel',
          links: [
            {
              url: 'https://example.com',
              title: 'Example Site',
              domain: 'example.com',
              favicon: 'https://www.google.com/s2/favicons?domain=example.com&sz=32'
            }
          ]
        }
      ],
      panelCounter: 1,
      isCompactView: false,
      lastSaveTime: new Date().toISOString(),
      version: '1.0'
    };

    // Simulate file drop using JavaScript
    await page.evaluate((data) => {
      const event = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
      
      // Create a mock file
      const file = new File([JSON.stringify(data)], 'test.droplinks', {
        type: 'application/json'
      });
      
      event.dataTransfer.files = [file];
      document.dispatchEvent(event);
    }, testData);

    // Verify import worked
    await expect(page.locator('.panel-title').first()).toHaveText('Test Panel');
    await expect(page.locator('.link-item')).toHaveCount(1);
  });

  test('should handle paste URL functionality', async ({ page }) => {
    // Mock clipboard API
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          readText: () => Promise.resolve('https://github.com')
        }
      });
    });

    // Trigger paste with keyboard shortcut
    await page.keyboard.press('Control+Shift+V');
    
    // Should show panel selector
    await expect(page.locator('.modal')).toHaveClass(/show/);
    await expect(page.locator('.modal h3')).toHaveText('Add Link to Panel');
    
    // Select first panel
    await page.locator('.panel-select-btn').first().click();
    
    // Verify link was added (would need to wait for async operations)
    await page.waitForTimeout(1000);
    await expect(page.locator('.link-item')).toHaveCount(1);
  });

  test('should persist data in localStorage', async ({ page }) => {
    // Add a panel
    await page.click('#add-panel');
    
    // Edit its title
    const newTitle = 'Persistent Panel';
    await page.locator('.panel').last().locator('.panel-title').fill(newTitle);
    await page.locator('.panel').last().locator('.panel-title').blur();
    
    // Reload page
    await page.reload();
    await page.waitForSelector('.panels-grid');
    
    // Verify data persisted
    await expect(page.locator('.panel')).toHaveCount(4);
    await expect(page.locator('.panel').last().locator('.panel-title')).toHaveText(newTitle);
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check responsive layout
    const header = page.locator('header');
    await expect(header).toHaveCSS('flex-direction', 'column');
    
    // Check that panels stack vertically
    const panelsGrid = page.locator('.panels-grid');
    await expect(panelsGrid).toHaveCSS('grid-template-columns', '1fr');
  });

  test('should handle long press on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Add a test link first (simplified for test)
    await page.evaluate(() => {
      const testLink = {
        url: 'https://example.com',
        title: 'Test Link',
        domain: 'example.com',
        favicon: 'https://www.google.com/s2/favicons?domain=example.com&sz=32'
      };
      dropLinks.panels[0].links.push(testLink);
      dropLinks.render();
    });

    // Simulate long press using touch events
    const linkCard = page.locator('.link-item').first();
    
    // Start touch
    await linkCard.dispatchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    // Wait for long press duration
    await page.waitForTimeout(900);
    
    // End touch
    await linkCard.dispatchEvent('touchend');
    
    // Should show edit modal
    await expect(page.locator('.modal h3')).toHaveText('Edit Link');
  });
});