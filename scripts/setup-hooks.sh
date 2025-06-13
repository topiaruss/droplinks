#!/bin/bash
set -e

echo "🔧 Setting up DropLinks development hooks..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required for pre-commit hooks"
    echo "   Install Python 3: https://www.python.org/downloads/"
    exit 1
fi

# Check if pip is available
if ! command -v pip3 &> /dev/null && ! command -v pip &> /dev/null; then
    echo "❌ pip is required for pre-commit hooks"
    echo "   Install pip: https://pip.pypa.io/en/stable/installation/"
    exit 1
fi

# Install pre-commit if not available
if ! command -v pre-commit &> /dev/null; then
    echo "📦 Installing pre-commit..."
    pip3 install pre-commit || pip install pre-commit
fi

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

# Install pre-commit hooks
echo "🪝 Installing pre-commit hooks..."
pre-commit install

# Install commit-msg hook for conventional commits
echo "💬 Installing commit message hook..."
pre-commit install --hook-type commit-msg

# Run initial check
echo "✅ Running initial pre-commit check..."
pre-commit run --all-files || echo "⚠️  Some pre-commit checks failed - this is normal on first run"

echo ""
echo "🎉 Development hooks setup complete!"
echo ""
echo "📋 Available commands:"
echo "   npm run pre-commit     - Run all pre-commit hooks manually"
echo "   npm run lint:fix       - Fix ESLint issues automatically"
echo "   npm test              - Run full test suite"
echo ""
echo "🔒 Pre-commit hooks will now run automatically on every commit!"
echo "   To skip hooks (not recommended): git commit --no-verify"
