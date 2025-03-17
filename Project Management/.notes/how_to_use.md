# How to Use Project Documentation & Rules

## Purpose of This Document
This guide explains how to effectively use the project documentation and rules during development, brainstorming, and AI collaboration. Following these practices will lead to more consistent, accurate, and efficient work on the ShanSong project.

## Referencing Documentation in Conversations

When working with AI assistants or team members, you can reference specific documents using the following format:

- `@.notes/project_overview.md` - For high-level project context and goals
- `@.notes/task_list.md` - For current priorities and task status
- `@.notes/directory_structure.md` - For locating relevant files and understanding project organization
- `@.notes/meeting_notes.md` - For recalling past decisions and discussions
- `@Project Management/Status Management/Status.md` - For current status of business functions

### Example Usage

```
"As mentioned in @.notes/project_overview.md, we need to prioritize the real-time tracking feature. According to @.notes/task_list.md, we should focus on WebSocket stability first."

"Based on our previous discussion (@.notes/meeting_notes.md from 2023-03-16), we decided to make Airtable backup optional."

"Looking at @Project Management/Status Management/Status.md, I see that the Price & Time Estimation feature needs recalculation methods."
```

## Benefits of Using Documentation References

1. **Consistent Context**: Ensures everyone (including AI) has the same understanding of the project
2. **Reduced Repetition**: Avoids explaining the same concepts multiple times
3. **Better AI Responses**: Helps AI assistants provide more relevant and accurate suggestions
4. **Decision Traceability**: Makes it easy to understand why certain approaches were chosen
5. **Efficient Onboarding**: Helps new team members quickly understand the project

## How .cursorrules Helps

The `.cursorrules` file automatically guides AI behavior in several ways:

1. **Context Prioritization**: Ensures AI focuses on the most relevant files and directories
2. **Operational Guidelines**: Enforces best practices for code changes and suggestions
3. **Safety Requirements**: Maintains code quality and prevents breaking changes
4. **Project Directives**: Keeps AI aligned with project goals and constraints

You don't need to explicitly reference `.cursorrules` - it works automatically in the background to improve AI assistance.

## Best Practices for AI Collaboration

1. **Be Specific**: Clearly state what you're trying to accomplish
2. **Provide Context**: Reference relevant documentation
3. **Set Constraints**: Mention any limitations or requirements
4. **Request Explanations**: Ask AI to explain its reasoning
5. **Verify Suggestions**: Always review AI-generated code before implementing

## Updating Documentation

Keep documentation current by:

1. **Adding Meeting Notes**: Record important discussions and decisions
2. **Updating Task Status**: Mark tasks as complete or in progress
3. **Refining Project Overview**: Update as project goals evolve
4. **Expanding Directory Structure**: Document new directories and files

Remember that well-maintained documentation leads to better collaboration, fewer misunderstandings, and more efficient development.

*Note: This approach to documentation and AI collaboration can be applied to any project, not just ShanSong.* 