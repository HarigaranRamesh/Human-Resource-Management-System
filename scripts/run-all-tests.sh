#!/usr/bin/env bash
set -e

# ==============================================================================
# NIRALIX HRMS — Automated Test Verification Runner
# Runs both Backend (Node Test Runner) and Frontend (Vitest) suites.
# If any test fails, exits with non-zero code to abort Git commit or push.
# ==============================================================================

echo ""
echo "🔍 [NIRALIX Git Hook] Running pre-commit / pre-push test suites..."
echo "──────────────────────────────────────────────────────────────────"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 1. Run Backend Unit & Integration Tests
echo "⚙️  [1/2] Executing HRMS-Backend tests..."
if (cd "$ROOT_DIR/HRMS-Backend" && npm test); then
  echo "✅ Backend tests passed successfully!"
else
  echo ""
  echo "❌ [ERROR] HRMS-Backend tests failed! Commit/Push aborted."
  echo "👉 Please fix the failing tests before committing your code."
  exit 1
fi

echo ""
# 2. Run Frontend Unit & Integration Tests
echo "🎨 [2/2] Executing HRMS-Frontend tests..."
if (cd "$ROOT_DIR/HRMS-Frontend" && npm test); then
  echo "✅ Frontend tests passed successfully!"
else
  echo ""
  echo "❌ [ERROR] HRMS-Frontend tests failed! Commit/Push aborted."
  echo "👉 Please fix the failing tests before committing your code."
  exit 1
fi

echo ""
echo "🎉 [NIRALIX Git Hook] All Backend and Frontend tests PASSED!"
echo "──────────────────────────────────────────────────────────────────"
exit 0
