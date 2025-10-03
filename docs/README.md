# Documentation

This directory contains best practices, guidelines, and configuration guides for the SiYuan MCP Server.

## Available Documents

### [MCP Best Practices](./mcp-best-practices.md)
Comprehensive best practices for developing and maintaining MCP servers based on Anthropic's official guidelines.

**Topics covered:**
- Security & Privacy
- Tool Design & Descriptions
- Performance & Reliability
- Technical Requirements
- Documentation Standards
- Interoperability
- Testing & Deployment

**Who should read this:** Developers working on the MCP server codebase.

---

### [Tool Assignment Guidelines](./tool-assignment-guidelines.md)
Guidelines on how many tools to assign to AI agents for optimal performance.

**Topics covered:**
- Tool limits and performance impacts
- Recommended tool counts by use case
- Tool assignment strategies
- Performance considerations
- Token budget analysis
- A/B testing approaches

**Who should read this:** Developers creating Claude Code subagents or configuring MCP tools for AI agents.

**Key Takeaway:** Aim for 10-20 tools per agent for optimal balance between flexibility and performance.

---

### [Claude Code Subagents Configuration Guide](./claude-code-subagents.md)
Complete guide to creating, configuring, and optimizing Claude Code subagents with MCP tools.

**Topics covered:**
- Subagent configuration methods
- MCP tools integration
- Example subagents for SiYuan
- Best practices
- Troubleshooting
- Advanced patterns

**Who should read this:** Users of Claude Code who want to create specialized agents for SiYuan operations.

**Key Takeaway:** Specialized subagents with focused tool sets perform better than general-purpose agents.

---

## Quick Start

### For Developers

1. Read [MCP Best Practices](./mcp-best-practices.md) to understand server development standards
2. Follow guidelines when adding new commands or features
3. Keep tool descriptions concise and accurate

### For Claude Code Users

1. Read [Claude Code Subagents](./claude-code-subagents.md) to learn about agent configuration
2. Review [Tool Assignment Guidelines](./tool-assignment-guidelines.md) for performance optimization
3. Create specialized subagents for your SiYuan workflows

## Example Workflow

### Creating a Notebook Management Agent

1. **Review Guidelines**
   - Check [tool-assignment-guidelines.md](./tool-assignment-guidelines.md) for recommended tool count (5-7 for notebook management)

2. **Create Agent File**
   - Location: `.claude/agents/siyuan-notebook-manager.md`
   - Tools: `executeCommand`
   - Commands: 6 notebook-related commands

3. **Reference Example**
   - See example in [claude-code-subagents.md](./claude-code-subagents.md#1-notebook-manager)

4. **Test Performance**
   - Measure response times
   - Verify tool selection accuracy
   - Adjust as needed

## Common Questions

### How many tools should my agent have?

See [Tool Assignment Guidelines](./tool-assignment-guidelines.md#executive-summary):
- **Optimal**: 10-20 tools
- **Maximum recommended**: 40 tools
- **Notebook management**: 5-7 tools
- **Content creation**: 8-12 tools

### How do I configure MCP tools for subagents?

See [Claude Code Subagents](./claude-code-subagents.md#mcp-tools-integration):
- Omit `tools` field to inherit all tools (default)
- Specify `tools: executeCommand` for selective access
- Document available commands in system prompt

### What are the security best practices?

See [MCP Best Practices](./mcp-best-practices.md#security--privacy):
- Use OAuth 2.0 for remote servers
- Never log sensitive tokens
- Only collect necessary data
- Validate environment variables

### How do I optimize performance?

See multiple sections:
- [MCP Best Practices - Performance](./mcp-best-practices.md#performance--reliability)
- [Tool Assignment Guidelines - Performance](./tool-assignment-guidelines.md#performance-considerations)
- [Subagents - Best Practices](./claude-code-subagents.md#best-practices)

## Contributing

When adding new features to the SiYuan MCP Server:

1. ✅ Follow [MCP Best Practices](./mcp-best-practices.md)
2. ✅ Write clear, concise tool descriptions
3. ✅ Add appropriate annotations (readOnlyHint, destructiveHint)
4. ✅ Document with examples
5. ✅ Update this documentation if adding new patterns

## Resources

### Official Documentation
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code)
- [Anthropic MCP Directory Policy](https://support.anthropic.com/en/articles/11697096-anthropic-mcp-directory-policy)
- [SiYuan API Documentation](https://github.com/siyuan-note/siyuan/blob/master/API.md)

### Community Resources
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Awesome Claude Code Agents](https://github.com/hesreallyhim/awesome-claude-code-agents)

## License

This documentation is part of the SiYuan MCP Server project and follows the same ISC license.
