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
    
    // Wait for the app to initialize
    await page.waitForSelector('#panels-container');
    
    // Add multiple panels programmatically
    for (let i = 0; i < 7; i++) {
      await page.click('#add-panel');
      await page.waitForTimeout(100); // Small delay between panel creation
    }
    
    // Wait for all panels to be rendered
    await page.waitForTimeout(500);
    
    // Check that all panels are rendered (3 default + 7 added = 10)
    const panelCount = await page.locator('.panel').count();
    expect(panelCount).toBe(10);
    
    // Test that the UI remains responsive with many panels
    const startTime = Date.now();
    await page.click('#add-panel');
    await page.waitForSelector('.panel:nth-child(11)');
    const responseTime = Date.now() - startTime;
    
    expect(responseTime).toBeLessThan(1000); // Should still be responsive
    expect(await page.locator('.panel').count()).toBe(11);
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