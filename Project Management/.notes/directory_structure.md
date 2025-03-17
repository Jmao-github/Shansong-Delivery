# ShanSong Directory Structure

## Purpose of This Document
This document provides an overview of the project's directory structure, helping both team members and AI assistants quickly locate relevant files and understand the organization of the codebase. Reference this document when you need to find specific components or understand how the project is structured.

## Main Directories

```
.
├── .notes                       # Project documentation and notes
├── Airtable-Test-Sample         # Test scripts for Airtable integration
├── Project Management           # Project management documents
│   ├── Initial Requirements     # Initial project requirements
│   └── Status Management        # Status tracking for project components
├── Supabase - Test              # Test scripts for Supabase integration
├── Supabase_Backend             # Supabase backend configuration
├── public                       # Static assets and frontend files
└── utils                        # Utility functions and helpers
```

## Key Files

```
.
├── .cursorrules                 # AI assistant configuration rules
├── .env                         # Environment variables (not in version control)
├── package.json                 # Project dependencies and scripts
├── server.js                    # Main server application
└── vercel.json                  # Vercel deployment configuration
```

## Directory Details

### `.notes/`
Contains project documentation, task lists, and meeting notes to provide context for development.

### `Airtable-Test-Sample/`
Contains test scripts and examples for Airtable integration, which serves as a backup database option.

### `Project Management/`
Houses project management documents, including requirements and status tracking.

### `Supabase_Backend/` and `Supabase - Test/`
Contains configuration and test scripts for Supabase, which is the primary database and storage solution.

### `public/`
Contains static assets and frontend files that are served directly to clients.

### `utils/`
Contains utility functions and helpers used throughout the application, including the storage.js file for file uploads.

## How to Use This Document
- **For Navigation**: Use this document to quickly find where specific functionality is implemented
- **For New Features**: Understand where new code should be placed based on the existing structure
- **For AI Assistance**: Reference specific directories when asking for help with particular components
- **For Onboarding**: Help new team members understand the project organization

*Note: This document should be updated whenever significant changes are made to the project structure.* 