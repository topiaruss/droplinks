const { test, expect } = require('@playwright/test');

test.describe('Performance Tests', () => {
  test('should meet basic performance requirements', async ({ page }) => {
    // Start measuring performance
    const startTime = Date.now();
    
    // Navigate to the app
    await page.goto('file://' + process.cwd() + '/droplinks.html');
    
    // Wait for the app to load
    await page.waitForSelector('#panels-container');
    await page.waitForSelector('.panel');
    
    const loadTime = Date.now() - startTime;
    
    // Performance assertions
    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    
    // Check if panels are rendered
    const panelCount = await page.locator('.panel').count();
    expect(panelCount).toBeGreaterThan(0);
    
    // Test interaction performance
    const interactionStart = Date.now();
    await page.click('#add-panel');
    await page.waitForSelector('.panel:last-child');
    const interactionTime = Date.now() - interactionStart;
    
    expect(interactionTime).toBeLessThan(500); // Interactions should be fast
  });

  test('should handle large amounts of data efficiently', async ({ page }) => {
    await page.goto('file://' + process.cwd() + '/droplinks.html');
    
    // Add multiple panels and links to test performance
    await page.evaluate(() => {
      // Create test data with many panels and links
      const testData = {
        panels: Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          title: `Performance Test Panel ${i + 1}`,
          links: Array.from({ length: 20 }, (_, j) => ({
            url: `https://example${j}.com`,
            title: `Test Link ${j + 1}`,
            domain: `example${j}.com`,
            favicon: `https://www.google.com/s2/favicons?domain=example${j}.com&sz=32`
          }))
        })),
        panelCounter: 10
      };
      
      if (window.dropLinks) {
        window.dropLinks.importData(JSON.stringify(testData));
      }
    });
    
    // Wait for rendering to complete
    await page.waitForTimeout(1000);
    
    // Check that all panels are rendered
    const panelCount = await page.locator('.panel').count();
    expect(panelCount).toBe(10);
    
    // Check that links are rendered
    const linkCount = await page.locator('.link-item').count();
    expect(linkCount).toBeGreaterThan(100);
  });

  test('should maintain responsiveness during drag operations', async ({ page }) => {
    await page.goto('file://' + process.cwd() + '/droplinks.html');
    
    // Ensure we have panels to work with
    await page.waitForSelector('.panel');
    
    // Test panel dragging performance
    const panel = page.locator('.panel').first();
    const panelBox = await panel.boundingBox();
    
    if (panelBox) {
      const startTime = Date.now();
      
      // Simulate drag operation
      await page.mouse.move(panelBox.x + panelBox.width / 2, panelBox.y + 10);
      await page.mouse.down();
      await page.mouse.move(panelBox.x + 100, panelBox.y + 10);
      await page.mouse.up();
      
      const dragTime = Date.now() - startTime;
      expect(dragTime).toBeLessThan(1000); // Drag operation should be smooth
    }
  });
});