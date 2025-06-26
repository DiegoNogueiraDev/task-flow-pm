# MCP Local - Cursor Prompts

## Task Management Prompts

### @next-task
```
Query the MCP server for my next recommended task. Include:
- Task title and description
- Estimated time and priority
- Dependencies that need to be completed first
- Related context from previous tasks

Use the getNextTask MCP command and provide actionable guidance.
```

### @search-tasks  
```
Search for tasks related to: {query}

Use the hybridSearch MCP command to find:
- Semantically similar tasks
- Tasks with related dependencies
- Historical context and decisions
- Code examples from similar implementations

Provide the top 5 most relevant results with context.
```

### @task-context
```
I'm working on task ID: {task-id}

Please use getTaskDetails to retrieve:
- Complete task information
- All dependencies and blockers
- Child tasks and subtasks
- Related code or documentation
- Previous reflections and learnings

Provide a comprehensive context summary for coding.
```

### @plan-project
```
Analyze the following specification and create a project plan:

{specification_text}

Use generateTasksFromSpec to create:
- Epic-level breakdown
- User stories with acceptance criteria
- Technical tasks with dependencies
- Time estimates and priorities

Provide a structured roadmap with milestones.
```

### @reflect-task
```
I just completed task {task-id} and it took {actual-time} minutes.

Key learnings and challenges:
{reflection_notes}

Use reflectTask to store this learning and ask the system to:
- Update estimation models
- Capture lessons learned
- Suggest improvements for similar future tasks
- Update project knowledge base
```

## Development Prompts

### @scaffold-task
```
Generate a code scaffold for task: {task-id}

Use generateScaffold MCP command to create:
- Implementation file structure
- Test files with initial cases
- Documentation templates
- TODO comments with acceptance criteria

Then help me understand the generated structure and next steps.
```

### @code-with-context
```
I need to implement: {feature_description}

First, search for related tasks and context using MCP, then:
- Provide implementation guidance based on project patterns
- Suggest code structure following established conventions
- Include error handling and edge cases
- Add appropriate tests and documentation

Use project context to ensure consistency.
```

### @estimate-effort
```
Help me estimate the effort for: {task_description}

Consider:
- Similar tasks completed in this project (query MCP)
- Complexity factors and dependencies
- Team velocity and historical data
- Technical risks and unknowns

Provide estimate range with confidence level.
```

## Analysis Prompts

### @project-status
```
Give me a comprehensive project status using MCP data:

Query for:
- Tasks by status (pending, in-progress, completed)
- Velocity trends and estimation accuracy
- Blocked tasks and dependency issues
- Recent completions and team productivity

Provide dashboard-style summary with insights.
```

### @learning-insights
```
Analyze our development patterns and learnings:

Use MCP to review:
- Estimation accuracy trends
- Common bottlenecks and challenges
- Most productive work patterns
- Areas for process improvement

Provide actionable recommendations for team efficiency.
```

### @dependency-analysis
```
Analyze the dependency graph for: {epic_or_feature}

Use MCP to map:
- Critical path dependencies
- Potential bottlenecks
- Parallel work opportunities
- Risk factors and mitigation

Provide visual dependency summary and recommendations.
```

## Integration Prompts

### @sync-external
```
Help me sync MCP data with external tools:

- Export current project status for stakeholder updates
- Generate reports for project management tools
- Create documentation for team knowledge base
- Prepare metrics for retrospectives

Format outputs for easy copy-paste into other tools.
```

### @onboard-teammate
```
Create an onboarding guide for a new team member:

Use MCP to gather:
- Current project structure and priorities
- Key decisions and architectural choices
- Development patterns and conventions
- Important context and tribal knowledge

Provide comprehensive getting-started guide.
```

## Usage Instructions

1. **Copy desired prompt** into Cursor chat
2. **Replace placeholders** like {task-id}, {query} with actual values
3. **Cursor will automatically** use MCP commands when available
4. **Follow up** with specific questions based on MCP responses

## Custom Commands

You can also ask Cursor to:
- "Check my next task using MCP"
- "Search for authentication-related tasks"
- "Generate scaffold for the login feature"
- "Show me project statistics from MCP"
- "Help me reflect on the API task I just finished"

## Tips

- **Be specific** with task IDs and search terms
- **Ask follow-up questions** to dive deeper into MCP data
- **Combine prompts** for complex workflows
- **Save frequently used** prompts as Cursor snippets