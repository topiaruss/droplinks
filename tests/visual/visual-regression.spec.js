const { test, expect } = require("@playwright/test");

test.describe("Visual Regression Tests", () => {
  test("should match initial layout screenshot", async ({ page }) => {
    await page.goto("file://" + process.cwd() + "/droplinks.html");

    // Wait for the app to fully load
    await page.waitForSelector("#panels-container");
    await page.waitForSelector(".panel");

    // Take screenshot of the initial state
    await expect(page).toHaveScreenshot("initial-layout.png");
  });

  test("should match compact view screenshot", async ({ page }) => {
    await page.goto("file://" + process.cwd() + "/droplinks.html");
    await page.waitForSelector(".panel");

    // Toggle to compact view
    await page.click("#view-toggle");
    await page.waitForTimeout(500); // Wait for animation

    // Take screenshot of compact view
    await expect(page).toHaveScreenshot("compact-view.png");
  });

  test("should match mobile layout screenshot", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("file://" + process.cwd() + "/droplinks.html");
    await page.waitForSelector(".panel");

    // Take screenshot of mobile layout
    await expect(page).toHaveScreenshot("mobile-layout.png");
  });

  test("should match panel with links screenshot", async ({ page }) => {
    await page.goto("file://" + process.cwd() + "/droplinks.html");
    await page.waitForSelector(".panel");

    // Add some test links to make the screenshot more interesting
    await page.evaluate(() => {
      const testLinks = [
        {
          url: "https://github.com",
          title: "GitHub",
          domain: "github.com",
          favicon: "https://www.google.com/s2/favicons?domain=github.com&sz=32",
        },
        {
          url: "https://stackoverflow.com",
          title: "Stack Overflow",
          domain: "stackoverflow.com",
          favicon:
            "https://www.google.com/s2/favicons?domain=stackoverflow.com&sz=32",
        },
      ];

      if (window.dropLinks && window.dropLinks.panels[0]) {
        window.dropLinks.panels[0].links = testLinks;
        window.dropLinks.render();
      }
    });

    await page.waitForTimeout(1000); // Wait for rendering

    // Take screenshot with links
    await expect(page).toHaveScreenshot("panel-with-links.png");
  });

  test("should match modal dialog screenshot", async ({ page }) => {
    await page.goto("file://" + process.cwd() + "/droplinks.html");
    await page.waitForSelector(".panel");

    // Trigger delete panel modal
    const deleteBtn = page.locator(".panel .delete-btn").first();
    await deleteBtn.click();

    // Wait for modal to appear
    await page.waitForSelector(".modal.show");

    // Take screenshot of modal
    await expect(page.locator(".modal")).toHaveScreenshot("delete-modal.png");
  });

  test("should match dark theme simulation", async ({ page }) => {
    await page.goto("file://" + process.cwd() + "/droplinks.html");
    await page.waitForSelector(".panel");

    // Add dark theme simulation
    await page.addStyleTag({
      content: `
        body {
          background: #1a1a1a !important;
          color: #ffffff !important;
        }
        .panel {
          background: #2d2d2d !important;
          color: #ffffff !important;
        }
        header {
          background: #333333 !important;
        }
      `,
    });

    await page.waitForTimeout(500);

    // Take screenshot of dark theme
    await expect(page).toHaveScreenshot("dark-theme.png");
  });
});
