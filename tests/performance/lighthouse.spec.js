const { test, expect } = require('@playwright/test');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

test.describe('Performance and Accessibility Tests', () => {
  test('should meet Lighthouse performance thresholds', async () => {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
    const options = {
      logLevel: 'info',
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices'],
      port: chrome.port,
    };
    
    const htmlPath = require('path').join(__dirname, '../../droplinks.html');
    const runnerResult = await lighthouse(`file://${htmlPath}`, options);

    // Parse results
    const { lhr } = runnerResult;
    
    // Performance thresholds
    expect(lhr.categories.performance.score).toBeGreaterThanOrEqual(0.9);
    expect(lhr.categories.accessibility.score).toBeGreaterThanOrEqual(0.9);
    expect(lhr.categories['best-practices'].score).toBeGreaterThanOrEqual(0.8);
    
    // Specific metrics
    const metrics = lhr.audits;
    expect(metrics['first-contentful-paint'].numericValue).toBeLessThan(2000);
    expect(metrics['largest-contentful-paint'].numericValue).toBeLessThan(4000);
    expect(metrics['cumulative-layout-shift'].numericValue).toBeLessThan(0.1);
    
    await chrome.kill();
  });

  test('should handle large datasets without performance degradation', async ({ page }) => {
    const htmlPath = require('path').join(__dirname, '../../droplinks.html');
    await page.goto(`file://${htmlPath}`);
    
    // Create large dataset
    const largeDataset = {
      panels: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        title: `Panel ${i + 1}`,
        links: Array.from({ length: 50 }, (_, j) => ({
          url: `https://example${j}.com`,
          title: `Example Site ${j}`,
          domain: `example${j}.com`,
          favicon: `https://www.google.com/s2/favicons?domain=example${j}.com&sz=32`
        }))
      })),
      panelCounter: 20,
      isCompactView: false,
      lastSaveTime: new Date().toISOString()
    };

    // Measure import time
    const startTime = Date.now();
    
    await page.evaluate((data) => {
      dropLinks.importData(JSON.stringify(data));
    }, largeDataset);
    
    const importTime = Date.now() - startTime;
    
    // Should complete import within reasonable time
    expect(importTime).toBeLessThan(5000);
    
    // Verify all data loaded
    await expect(page.locator('.panel')).toHaveCount(20);
    await expect(page.locator('.link-item')).toHaveCount(1000);
    
    // Test interaction performance
    const scrollStartTime = Date.now();
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(100);
    const scrollTime = Date.now() - scrollStartTime;
    
    expect(scrollTime).toBeLessThan(500);
  });

  test('should be accessible to screen readers', async ({ page }) => {
    const htmlPath = require('path').join(__dirname, '../../droplinks.html');
    await page.goto(`file://${htmlPath}`);
    
    // Check for proper ARIA labels and roles
    await expect(page.locator('h1')).toHaveAttribute('role', 'heading');
    await expect(page.locator('.panel')).toHaveAttribute('role', 'region');
    
    // Check keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('#add-panel')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('#view-toggle')).toBeFocused();
    
    // Test that all interactive elements are keyboard accessible
    const interactiveElements = await page.locator('button, [contenteditable], input').all();
    
    for (const element of interactiveElements) {
      await expect(element).toHaveAttribute('tabindex', /^-?[0-9]+$/);
    }
  });
});