# Knock CLI - AI Agent Guide

This is the official command-line interface for [Knock](https://knock.app), a notification platform that helps developers build, send, and manage notifications.

## Project Overview

The Knock CLI is a TypeScript-based CLI tool built with [oclif](https://oclif.io/) that enables developers to:
- Manage notification workflows
- Handle in-app guides and message types
- Manage translations and email layouts
- Work with template partials
- Control environment branches and commits
- Push/pull resources between local filesystem and Knock

## Architecture

### Tech Stack
- **Framework**: oclif (CLI framework)
- **Language**: TypeScript
- **Build**: SWC for fast compilation
- **Testing**: Mocha + Chai + Sinon
- **API Client**: @knocklabs/mgmt for Knock API interactions

### Key Directories

- **`src/commands/`** - CLI command implementations organized by resource type (workflow, guide, partial, etc.)
- **`src/lib/`** - Shared library code:
  - `helpers/` - Utility functions for common operations
  - `marshal/` - Data transformation and validation logic
  - `run-context/` - Runtime context management
- **`dist/`** - Compiled JavaScript output
- **`test/`** - Test files mirroring source structure

### Command Structure

Commands follow a resource-based organization:
- `branch/` - Branch management (create, delete, switch, merge)
- `workflow/` - Workflow operations (pull, push, validate, activate, run)
- `guide/` - In-app guide management
- `message-type/` - Message type schemas for guides
- `partial/` - Template partial management
- `translation/` - Translation file handling
- `layout/` - Email layout management
- `commit/` - Commit and promotion operations

## Development Patterns

### Command Implementation
All commands extend `BaseCommand` from `src/lib/base-command.ts` which provides:
- Authentication handling
- Service token management
- Common flags (environment, branch, service-token)
- Error handling utilities

### Marshal Pattern
The `src/lib/marshal/` directory contains logic for:
- **Marshaling**: Converting resources to/from local filesystem format
- **Validation**: Validating resource schemas
- **Serialization**: Formatting data for API communication

### Resource Operations
Most resources follow a standard pattern with these commands:
- `get` - Retrieve a single resource
- `list` - List all resources
- `pull` - Download from Knock to local filesystem
- `push` - Upload from local filesystem to Knock
- `validate` - Validate local resource files
- `new` - Create new resource with scaffolding
- `open` - Open resource in Knock dashboard

## Important Concepts

### Environments & Branches
- Knock uses environment-based workflows (development → staging → production)
- Branches allow isolated development off the development environment
- Changes must be committed before promotion to subsequent environments

### Service Token Authentication
- Commands can authenticate via `--service-token` flag or `KNOCK_SERVICE_TOKEN` env var
- Alternative: `knock login` for user-based authentication

### Project Configuration
- `knock.json` - Project-level configuration file (created via `knock init`)
- Stores resource directory paths and project settings

## Build & Development

```bash
# Install dependencies
yarn install

# Build the project
yarn build

# Run tests
yarn test

# Lint code
yarn lint

# Format code
yarn format.write

# Type check
yarn type.check

# Run all checks
yarn check
```

## Testing Notes

- Tests use nock for HTTP mocking
- Factory helpers in `test/support/factory.ts` for creating test data
- Tests follow the source structure in `test/` directory

## Key Files for Understanding

1. **`src/lib/base-command.ts`** - Base class all commands extend
2. **`src/lib/resources.ts`** - Resource type definitions
3. **`src/lib/api-v1.ts`** - Knock API client wrapper
4. **`src/lib/marshal/index.isomorphic.ts`** - Marshaling helpers that are runtime agnostic, and can be used in either a node.js or browser environment
5. **`src/commands/knock.ts`** - Main entry point command

## Common Workflows

### Adding a New Command
1. Create command file in appropriate `src/commands/` subdirectory
2. Extend `BaseCommand`
3. Define command flags and arguments
4. Implement `run()` method
5. Add corresponding test in `test/commands/`

### Adding Resource Type Support
1. Add marshal logic in `src/lib/marshal/{resource-type}/`
2. Create command files for standard operations (get, list, pull, push, validate)
3. Update `src/lib/resources.ts` if needed
4. Add tests

## API Integration

The CLI primarily interacts with Knock's Management API via the `@knocklabs/mgmt` package. Authentication, environment selection, and branch context are handled automatically by `BaseCommand`.

## Notes for AI Assistants

- This is a production CLI tool used by Knock customers
- Maintain backward compatibility with existing commands
- Follow oclif conventions for command structure and flags
- Use the existing marshal patterns for resource handling
- All commands should support `--json` flag for machine-readable output
- Error messages should be user-friendly and actionable
- Tests are required for new commands and features

