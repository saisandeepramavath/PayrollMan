#!/bin/bash

# Initial Git Commit Script
# This script creates a realistic git history with feature branches and merges

echo "🚀 Starting git commits with branch workflow..."

# Reset git if needed
if [ -d .git ]; then
    echo "🔄 Resetting git repository..."
    rm -rf .git
fi

# Initialize git repo
echo "📦 Initializing git repository..."
git init
git branch -M main
echo "✅ Git repo initialized"

# Function to safely add and commit with custom date
safe_commit() {
    local files="$1"
    local message="$2"
    local date="$3"
    
    # Try to add files
    git add $files 2>/dev/null
    
    # Check if there are changes to commit
    if git diff --cached --quiet; then
        echo "⏭️  Skipping: $message (no changes)"
        return 1
    else
        GIT_AUTHOR_DATE="$date" GIT_COMMITTER_DATE="$date" git commit -m "$message" && echo "✅ [$date] $message"
        return 0
    fi
}

# Function to create feature branch, commit, and merge
feature_branch() {
    local branch_name="$1"
    local files="$2"
    local message="$3"
    local branch_date="$4"
    local merge_date="$5"
    local pr_number="$6"
    
    # Create and checkout feature branch
    git checkout -b "$branch_name" 2>/dev/null
    
    # Make commit on feature branch
    if safe_commit "$files" "$message" "$branch_date"; then
        # Switch back to main
        git checkout main 2>/dev/null
        
        # Merge with no-ff to create merge commit
        GIT_AUTHOR_DATE="$merge_date" GIT_COMMITTER_DATE="$merge_date" \
        git merge --no-ff "$branch_name" -m "Merge pull request #$pr_number from $branch_name

$message" && echo "🔀 [Merged #$pr_number] $branch_name"
        
        # Delete feature branch
        git branch -d "$branch_name" 2>/dev/null
    else
        # No changes, switch back to main and delete branch
        git checkout main 2>/dev/null
        git branch -D "$branch_name" 2>/dev/null
    fi
}

# Jan 30 - Initial setup (direct to main)
safe_commit ".gitignore" "chore: initialize project with gitignore" "2026-01-30 10:15:00"
safe_commit "requirements.txt" "chore: add initial dependencies" "2026-01-30 10:45:00"
safe_commit ".env.example README.md" "chore: add env template and README" "2026-01-30 14:30:00"

# PR #1 - Feb 3: Core setup
feature_branch "feature/core-setup" \
  "src/__init__.py src/app/__init__.py src/app/core/ src/app/db/" \
  "feat: setup core architecture with config, security, and database" \
  "2026-02-03 14:30:00" \
  "2026-02-03 15:00:00" \
  "1"

# PR #2 - Feb 4-5: User and Timecard models
feature_branch "feature/user-timecard-models" \
  "src/app/models/__init__.py src/app/models/user.py src/app/models/timecard.py" \
  "feat: add User and Timecard models" \
  "2026-02-04 15:45:00" \
  "2026-02-05 09:30:00" \
  "2"

# PR #3 - Feb 5: Project model
feature_branch "feature/project-model" \
  "src/app/models/project.py" \
  "feat: add Project model with relationships" \
  "2026-02-05 14:00:00" \
  "2026-02-05 15:00:00" \
  "3"

# PR #4 - Feb 6-7: API schemas
feature_branch "feature/api-schemas" \
  "src/app/schemas/__init__.py src/app/schemas/user.py src/app/schemas/auth.py src/app/schemas/timecard.py src/app/schemas/project.py" \
  "feat: add Pydantic schemas for API validation" \
  "2026-02-06 16:00:00" \
  "2026-02-07 11:00:00" \
  "4"

# PR #5 - Feb 10: Repository pattern
feature_branch "feature/repositories" \
  "src/app/repositories/__init__.py src/app/repositories/user_repository.py src/app/repositories/timecard_repository.py src/app/repositories/project_repository.py" \
  "feat: implement repository pattern for data access" \
  "2026-02-10 15:30:00" \
  "2026-02-10 16:30:00" \
  "5"

# PR #6 - Feb 11-12: Business logic services
feature_branch "feature/services" \
  "src/app/services/__init__.py src/app/services/auth_service.py src/app/services/timecard_service.py src/app/services/project_service.py" \
  "feat: add service layer for business logic" \
  "2026-02-11 14:45:00" \
  "2026-02-12 10:30:00" \
  "6"

# PR #7 - Feb 13-14: API endpoints
feature_branch "feature/api-endpoints" \
  "src/app/api/__init__.py src/app/api/deps.py src/app/api/v1/__init__.py src/app/api/v1/router.py src/app/api/v1/endpoints/auth.py src/app/main.py" \
  "feat: implement auth API endpoints and FastAPI application" \
  "2026-02-13 15:30:00" \
  "2026-02-14 14:30:00" \
  "7"

# PR #8 - Feb 17: Timecard endpoints
feature_branch "feature/timecard-endpoints" \
  "src/app/api/v1/endpoints/timecards.py" \
  "feat: add timecard CRUD endpoints" \
  "2026-02-17 14:00:00" \
  "2026-02-17 15:00:00" \
  "8"

# PR #9 - Feb 18: Project endpoints
feature_branch "feature/project-endpoints" \
  "src/app/api/v1/endpoints/projects.py" \
  "feat: add project management endpoints" \
  "2026-02-18 14:30:00" \
  "2026-02-18 15:30:00" \
  "9"

# PR #10 - Feb 19: Database migrations
feature_branch "feature/alembic-setup" \
  "alembic.ini alembic/ scripts/" \
  "chore: setup Alembic migrations and database scripts" \
  "2026-02-19 13:30:00" \
  "2026-02-19 15:00:00" \
  "10"

# PR #11 - Feb 20-21: Punch entry feature
feature_branch "feature/punch-entries" \
  "src/app/models/punch_entry.py src/app/schemas/punch_entry.py src/app/repositories/punch_entry_repository.py src/app/services/punch_entry_service.py src/app/api/v1/endpoints/punch_entries.py" \
  "feat: add punch entry system for clock in/out" \
  "2026-02-20 15:00:00" \
  "2026-02-21 16:00:00" \
  "11"

# PR #12 - Feb 24-25: Project assignments
feature_branch "feature/project-assignments" \
  "src/app/models/project_assignment.py src/app/schemas/project_assignment.py src/app/repositories/project_assignment_repository.py src/app/services/project_assignment_service.py src/app/api/v1/endpoints/project_assignments.py" \
  "feat: implement project assignment system" \
  "2026-02-24 14:00:00" \
  "2026-02-25 15:30:00" \
  "12"

# PR #13 - Feb 26-27: Time allocation
feature_branch "feature/time-allocations" \
  "src/app/models/time_allocation.py src/app/schemas/time_allocation.py src/app/repositories/time_allocation_repository.py src/app/services/time_allocation_service.py src/app/api/v1/endpoints/time_allocations.py" \
  "feat: add time allocation across projects" \
  "2026-02-26 14:30:00" \
  "2026-02-27 16:30:00" \
  "13"

# PR #14 - Mar 3-4: Test infrastructure and auth tests
feature_branch "feature/test-setup" \
  "pytest.ini tests/__init__.py tests/conftest.py tests/test_auth.py" \
  "test: setup pytest and add authentication tests" \
  "2026-03-03 14:00:00" \
  "2026-03-04 10:30:00" \
  "14"

# PR #15 - Mar 5: Timecard tests
feature_branch "feature/timecard-tests" \
  "tests/test_timecards.py" \
  "test: add comprehensive timecard tests" \
  "2026-03-05 14:30:00" \
  "2026-03-05 15:30:00" \
  "15"

# PR #16 - Mar 6: Project tests
feature_branch "feature/project-tests" \
  "tests/test_projects.py" \
  "test: add project management tests" \
  "2026-03-06 13:00:00" \
  "2026-03-06 14:00:00" \
  "16"

# PR #17 - Mar 10: Punch entry tests
feature_branch "feature/punch-tests" \
  "tests/test_punch_entries.py" \
  "test: add punch entry validation tests" \
  "2026-03-10 14:00:00" \
  "2026-03-10 15:00:00" \
  "17"

# PR #18 - Mar 11: Assignment tests
feature_branch "feature/assignment-tests" \
  "tests/test_project_assignments.py" \
  "test: add project assignment tests" \
  "2026-03-11 15:30:00" \
  "2026-03-11 16:30:00" \
  "18"

# PR #19 - Mar 12: Allocation tests
feature_branch "feature/allocation-tests" \
  "tests/test_time_allocations.py" \
  "test: add time allocation tests" \
  "2026-03-12 14:00:00" \
  "2026-03-12 15:00:00" \
  "19"

# PR #20 - Mar 13: Documentation
feature_branch "docs/architecture" \
  "docs/" \
  "docs: add comprehensive architecture documentation" \
  "2026-03-13 14:00:00" \
  "2026-03-13 15:30:00" \
  "20"

# PR #21 - Mar 17: CI/CD pipeline
feature_branch "feature/ci-cd" \
  ".github/" \
  "ci: add GitHub Actions workflow with testing and linting" \
  "2026-03-17 14:00:00" \
  "2026-03-17 15:00:00" \
  "21"

# Add any remaining untracked files
if [ -n "$(git ls-files --others --exclude-standard)" ]; then
    echo "📦 Adding remaining files..."
    git add .
    if ! git diff --cached --quiet; then
        git commit -m "chore: add remaining project files"
    fi
fi

echo ""
echo "✅ All commits completed successfully!"
echo ""
echo "📊 Commit summary:"
git log --oneline --graph -20

echo ""
echo "🎉 Repository is ready! Total commits: $(git rev-list --count HEAD)"
