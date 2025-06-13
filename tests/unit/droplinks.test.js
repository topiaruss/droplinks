/**
 * Unit tests for DropLinks functionality
 * These tests focus on the core logic without browser dependencies
 */

// Mock DOM elements and browser APIs
const { JSDOM } = require('jsdom');

describe('DropLinks Unit Tests', () => {
  let dom, window, document, DropLinks, dropLinks;

  beforeEach(() => {
    // Create a minimal DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="panels-container" class="panels-grid"></div>
          <button id="add-panel"></button>
          <button id="view-toggle"><span class="toggle-text">Compact View</span></button>
          <button id="sync-now"></button>
          <button id="export-data"></button>
          <button id="confirm-delete"></button>
          <button id="cancel-delete"></button>
          <div id="confirmation-modal" class="modal"></div>
        </body>
      </html>
    `);
    
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    global.localStorage = {
      data: {},
      getItem: (key) => global.localStorage.data[key] || null,
      setItem: (key, value) => { global.localStorage.data[key] = value; },
      removeItem: (key) => { delete global.localStorage.data[key]; }
    };

    // Load the DropLinks class from separate file
    const DropLinks = require('../../droplinks.js');
    
    // Create DropLinks instance with injected dependencies
    dropLinks = new DropLinks({
      document: document,
      window: window,
      localStorage: global.localStorage,
      skipInit: true  // Skip initialization to start with clean state
    });
  });

  afterEach(() => {
    global.localStorage.data = {};
  });

  describe('Panel Management', () => {
    test('should initialize with empty panels array', () => {
      expect(dropLinks.panels).toEqual([]);
      expect(dropLinks.panelCounter).toBe(0);
    });

    test('should add a new panel', () => {
      const initialLength = dropLinks.panels.length;
      const initialCounter = dropLinks.panelCounter;
      
      dropLinks.addPanel();
      
      expect(dropLinks.panels).toHaveLength(initialLength + 1);
      expect(dropLinks.panels[dropLinks.panels.length - 1]).toMatchObject({
        id: initialCounter + 1,
        title: `Panel ${initialCounter + 1}`,
        links: []
      });
      expect(dropLinks.panelCounter).toBe(initialCounter + 1);
    });

    test('should delete a panel', () => {
      dropLinks.addPanel();
      dropLinks.addPanel();
      const initialLength = dropLinks.panels.length;
      
      const panelIdToDelete = dropLinks.panels[0].id;
      dropLinks.deleteTarget = panelIdToDelete;
      dropLinks.confirmDelete();
      
      expect(dropLinks.panels).toHaveLength(initialLength - 1);
      expect(dropLinks.panels.some(p => p.id === panelIdToDelete)).toBe(false);
    });

    test('should move panel from one position to another', () => {
      dropLinks.addPanel(); // Panel 1
      dropLinks.addPanel(); // Panel 2
      dropLinks.addPanel(); // Panel 3
      
      const originalOrder = dropLinks.panels.map(p => p.id);
      
      // Move panel from index 0 to index 2
      dropLinks.movePanel(0, 2);
      
      expect(dropLinks.panels[0].id).toBe(originalOrder[1]);
      expect(dropLinks.panels[1].id).toBe(originalOrder[2]);
      expect(dropLinks.panels[2].id).toBe(originalOrder[0]);
    });
  });

  describe('Link Management', () => {
    beforeEach(() => {
      dropLinks.addPanel();
    });

    test('should add link to panel', async () => {
      const url = 'https://example.com';
      const panelId = dropLinks.panels[0].id;
      await dropLinks.addLinkToPanel(panelId, url);
      
      expect(dropLinks.panels[0].links).toHaveLength(1);
      expect(dropLinks.panels[0].links[0]).toMatchObject({
        url: 'https://example.com',
        domain: 'example.com'
      });
    });

    test('should not add duplicate links to same panel', async () => {
      const url = 'https://example.com';
      const panelId = dropLinks.panels[0].id;
      await dropLinks.addLinkToPanel(panelId, url);
      await dropLinks.addLinkToPanel(panelId, url);
      
      expect(dropLinks.panels[0].links).toHaveLength(1);
    });

    test('should extract title from URL', () => {
      const testCases = [
        ['https://github.com/user/repo', 'User/Repo'],
        ['https://example.com/about-us', 'About Us'],
        ['https://site.com/products/awesome_widget', 'Products/Awesome Widget'],
        ['https://domain.com/', 'domain.com'],
        ['https://www.test.com', 'test.com']
      ];

      testCases.forEach(([url, expected]) => {
        expect(dropLinks.extractTitleFromUrl(url)).toBe(expected);
      });
    });

    test('should validate URLs correctly', () => {
      const validUrls = [
        'https://example.com',
        'http://test.org',
        'https://sub.domain.co.uk/path',
        'ftp://files.example.com'
      ];

      const invalidUrls = [
        'not-a-url',
        'example.com',
        'https://',
        ''
      ];

      validUrls.forEach(url => {
        expect(dropLinks.isValidUrl(url)).toBe(true);
      });

      invalidUrls.forEach(url => {
        expect(dropLinks.isValidUrl(url)).toBe(false);
      });
    });

    test('should remove link from panel', () => {
      dropLinks.panels[0].links = [
        { url: 'https://example.com', title: 'Example' },
        { url: 'https://test.com', title: 'Test' }
      ];

      const panelId = dropLinks.panels[0].id;
      dropLinks.removeLinkFromPanel(panelId, 0);
      
      expect(dropLinks.panels[0].links).toHaveLength(1);
      expect(dropLinks.panels[0].links[0].url).toBe('https://test.com');
    });

    test('should move link between panels', () => {
      dropLinks.addPanel(); // Add second panel
      
      const testLink = { url: 'https://example.com', title: 'Example' };
      dropLinks.panels[0].links = [testLink];
      
      const sourcePanelId = dropLinks.panels[0].id;
      const targetPanelId = dropLinks.panels[1].id;
      dropLinks.moveLinkBetweenPanels(sourcePanelId, targetPanelId, 0);
      
      expect(dropLinks.panels[0].links).toHaveLength(0);
      expect(dropLinks.panels[1].links).toHaveLength(1);
      expect(dropLinks.panels[1].links[0]).toEqual(testLink);
    });
  });

  describe('Data Persistence', () => {
    test('should save data to localStorage', () => {
      dropLinks.addPanel();
      dropLinks.toggleView(); // Change compact view
      
      dropLinks.saveToStorage();
      
      const savedData = JSON.parse(global.localStorage.getItem('droplinks-data'));
      expect(savedData).toMatchObject({
        panels: expect.any(Array),
        panelCounter: expect.any(Number),
        isCompactView: true,
        lastSaveTime: expect.any(String)
      });
    });

    test('should load data from localStorage', () => {
      const testData = {
        panels: [{ id: 1, title: 'Loaded Panel', links: [] }],
        panelCounter: 1,
        isCompactView: true,
        lastSaveTime: '2023-01-01T00:00:00.000Z'
      };
      
      global.localStorage.setItem('droplinks-data', JSON.stringify(testData));
      
      const DropLinksClass = require('../../droplinks.js');
      const newDropLinks = new DropLinksClass({
        document: document,
        window: window,
        localStorage: global.localStorage,
        skipInit: true
      });
      newDropLinks.loadFromStorage();
      
      expect(newDropLinks.panels).toEqual(testData.panels);
      expect(newDropLinks.panelCounter).toBe(testData.panelCounter);
      expect(newDropLinks.isCompactView).toBe(testData.isCompactView);
      expect(newDropLinks.lastSaveTime).toBe(testData.lastSaveTime);
    });

    test('should import data from JSON', () => {
      const importData = {
        panels: [
          { id: 5, title: 'Imported Panel', links: [] }
        ],
        panelCounter: 5,
        isCompactView: false,
        lastSaveTime: '2023-06-01T00:00:00.000Z'
      };

      const success = dropLinks.importData(JSON.stringify(importData));
      
      expect(success).toBe(true);
      expect(dropLinks.panels).toEqual(importData.panels);
      expect(dropLinks.panelCounter).toBe(5); // Should be max ID from panels
    });

    test('should reject invalid import data', () => {
      const invalidData = [
        'invalid json',
        '{"invalid": "structure"}',
        '{"panels": "not an array"}',
        ''
      ];

      invalidData.forEach(data => {
        const success = dropLinks.importData(data);
        expect(success).toBe(false);
      });
    });
  });

  describe('View Management', () => {
    test('should toggle compact view', () => {
      const initialView = dropLinks.isCompactView;
      
      dropLinks.toggleView();
      expect(dropLinks.isCompactView).toBe(!initialView);
      
      dropLinks.toggleView();
      expect(dropLinks.isCompactView).toBe(initialView);
    });
  });
});

// Helper function to extract DropLinks class from HTML file
function getDropLinksClassCode() {
  const fs = require('fs');
  const path = require('path');
  
  const htmlContent = fs.readFileSync(
    path.join(__dirname, '../../droplinks.html'), 
    'utf8'
  );
  
  // Extract the class definition from the HTML file
  const classMatch = htmlContent.match(/class DropLinks \{[\s\S]*?\n        \}/);
  
  if (!classMatch) {
    throw new Error('Could not extract DropLinks class from HTML file');
  }
  
  return classMatch[0];
}