# DropLinks - Responsive Link Organizer

A modern, responsive drag-and-drop link organizer built with vanilla JavaScript.

## Features

- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🎯 **Drag & Drop** - Intuitive panel and link organization
- 💾 **Data Persistence** - Local storage with export/import capabilities
- 🔄 **File Sync** - Automatic synchronization with local files
- 📋 **Clipboard Integration** - Paste URLs directly from clipboard
- 🎨 **View Modes** - Compact and large view options
- ♿ **Accessibility** - Keyboard navigation and screen reader support

## Development Setup

### Pre-commit Hooks

We use comprehensive pre-commit hooks to maintain code quality:

#### 🔍 **What the hooks check:**

- **Code Quality**: ESLint, Prettier, no debug statements
- **Security**: Secret detection, large file prevention  
- **Testing**: Unit tests must pass, proper test naming
- **File Hygiene**: Whitespace, line endings, syntax validation

#### 🚀 **Quick Commands:**

```bash
# Set up hooks (one-time)
chmod +x scripts/setup-hooks.sh && ./scripts/setup-hooks.sh

# Run manually
npm run pre-commit

# Fix automatically
npm run lint:fix
```

## Testing

- **Unit Tests**: 15/15 passing (100%)
- **E2E Tests**: 7/11 core functionality (64%)  
- **Coverage**: Panel management, links, persistence, responsive design