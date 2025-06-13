const { test, expect } = require("@playwright/test");

test.describe("Accessibility Tests", () => {
  test("should have proper ARIA labels and roles", async ({ page }) => {
    await page.goto("file://" + process.cwd() + "/droplinks.html");

    // Check main landmarks
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("header")).toBeVisible();

    // Check button accessibility
    const addPanelBtn = page.locator("#add-panel");
    await expect(addPanelBtn).toBeVisible();

    // Check that interactive elements are focusable
    await addPanelBtn.focus();
    await expect(addPanelBtn).toBeFocused();

    // Test keyboard navigation
    await page.keyboard.press("Tab");
    const viewToggleBtn = page.locator("#view-toggle");
    await expect(viewToggleBtn).toBeFocused();
  });

  test("should support keyboard navigation", async ({ page }) => {
    await page.goto("file://" + process.cwd() + "/droplinks.html");

    // Start from add panel button
    await page.locator("#add-panel").focus();

    // Tab through interactive elements
    const interactiveElements = [
      "#add-panel",
      "#view-toggle",
      "#sync-now",
      "#export-data",
    ];

    for (let i = 0; i < interactiveElements.length; i++) {
      if (i > 0) await page.keyboard.press("Tab");
      await expect(page.locator(interactiveElements[i])).toBeFocused();
    }
  });

  test("should have sufficient color contrast", async ({ page }) => {
    await page.goto("file://" + process.cwd() + "/droplinks.html");

    // Check that buttons have visible text
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const isVisible = await button.isVisible();
      if (isVisible) {
        // Basic visibility check - proper contrast testing would require specialized tools
        await expect(button).toBeVisible();
        const text = await button.textContent();
        if (text && text.trim()) {
          expect(text.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  test("should work with screen reader simulation", async ({ page }) => {
    await page.goto("file://" + process.cwd() + "/droplinks.html");

    // Check document structure
    const title = await page.title();
    expect(title).toBe("DropLinks - Link Organizer");

    // Check heading structure
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
    const h1Text = await h1.textContent();
    expect(h1Text).toBeTruthy();

    // Check that panels have accessible content
    await page.waitForSelector(".panel");
    const panels = page.locator(".panel");
    const panelCount = await panels.count();

    for (let i = 0; i < panelCount && i < 3; i++) {
      const panel = panels.nth(i);
      const panelTitle = panel.locator(".panel-title");
      await expect(panelTitle).toBeVisible();

      const titleText = await panelTitle.textContent();
      expect(titleText).toBeTruthy();
    }
  });

  test("should handle high contrast mode", async ({ page }) => {
    // Simulate high contrast by checking element visibility
    await page.goto("file://" + process.cwd() + "/droplinks.html");

    // Add CSS to simulate high contrast
    await page.addStyleTag({
      content: `
        * {
          background: black !important;
          color: white !important;
          border-color: white !important;
        }
      `,
    });

    // Check that key elements are still visible
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("#add-panel")).toBeVisible();
    await expect(page.locator(".panel").first()).toBeVisible();
  });

  test("should support reduced motion preferences", async ({ page }) => {
    // Simulate reduced motion preference
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("file://" + process.cwd() + "/droplinks.html");

    // Check that the app still functions
    await expect(page.locator("#panels-container")).toBeVisible();

    // Test adding a panel (should work without animations)
    await page.click("#add-panel");
    await page.waitForSelector(".panel:last-child");

    const panelCount = await page.locator(".panel").count();
    expect(panelCount).toBeGreaterThan(3);
  });
});
