# MCP Server Best Practices

This document outlines best practices for developing and maintaining Model Context Protocol (MCP) servers, based on Anthropic's official guidelines and the MCP community standards.

## Table of Contents

- [Security & Privacy](#security--privacy)
- [Tool Design](#tool-design)
- [Performance & Reliability](#performance--reliability)
- [Technical Requirements](#technical-requirements)
- [Documentation](#documentation)
- [Interoperability](#interoperability)

## Security & Privacy

### Authentication

**Remote MCP servers** requiring authentication must:
- Use secure OAuth 2.0
- Use certificates from recognized authorities
- Never store credentials in plain text
- Follow industry-standard authentication practices

**Local MCP servers** should:
- Validate the `SIYUAN_TOKEN` environment variable
- Provide clear error messages when authentication fails
- Never log or expose sensitive tokens

### Data Collection

MCP servers must adhere to strict data collection principles:

- ✅ **Do**: Only collect data necessary to perform the tool's function
- ✅ **Do**: Process data in-memory when possible
- ❌ **Don't**: Collect extraneous conversation data
- ❌ **Don't**: Access information about users' previous chats
- ❌ **Don't**: Attempt to access the contents of users' memory
- ❌ **Don't**: Log sensitive user data unnecessarily

### Usage Policy Compliance

MCP servers must:
- Not facilitate violation of Anthropic's Usage Policy
- Comply with Universal Usage Standards
- Meet High-Risk Use Case requirements when applicable
- Prioritize user privacy protection

## Tool Design

### Tool Descriptions

Tool descriptions are critical for AI models to understand when and how to use tools. Follow these guidelines:

#### Be Specific and Unambiguous

**Bad Example:**
```typescript
{
  name: "updateDoc",
  description: "Update a document"
}
```

**Good Example:**
```typescript
{
  name: "updateDoc",
  description: "Update the content of an existing SiYuan document by its ID. Use this when modifying document text, NOT for creating new documents."
}
```

#### Match Actual Functionality

- Tool descriptions must precisely match what the tool actually does
- Never promise features that aren't implemented
- Don't include unexpected functionality
- Update descriptions when functionality changes

#### Parameter Documentation

Document each parameter clearly:

```typescript
params: z.object({
  id: z.string().describe('The unique block ID (e.g., "20210808180117-6v0mkxr")'),
  data: z.string().describe('New content in Markdown format'),
  dataType: z.enum(['markdown', 'dom']).describe('Content format: "markdown" for Kramdown, "dom" for HTML')
})
```

### Tool Annotations

Provide annotations to help clients understand tool behavior:

```typescript
{
  name: "getBlockAttrs",
  annotations: {
    readOnlyHint: true,  // Doesn't modify environment
    idempotentHint: true  // Same args = same result
  }
}

{
  name: "deleteBlock",
  annotations: {
    destructiveHint: true  // May perform destructive updates
  }
}
```

**Available Annotations:**
- `readOnlyHint`: Tool doesn't modify the environment
- `destructiveHint`: Tool may perform destructive updates
- `idempotentHint`: Repeated calls with same args have no additional effect

**Important:** These are hints only and should not be relied upon for security decisions.

## Performance & Reliability

### Response Times

- Aim for sub-second response times for simple operations
- Provide streaming responses for long-running operations when possible
- Set appropriate timeouts (SiYuan client uses axios defaults)

### Token Efficiency

MCP servers should be frugal with token usage:

- ✅ Return concise, structured responses
- ✅ Use `_meta` field for detailed data that might not need to be shown
- ❌ Don't include redundant information in text responses
- ❌ Don't return entire documents when a summary would suffice

**Example:**

```typescript
// Good - Concise text, detailed data in _meta
return {
  content: [{
    type: 'text',
    text: `Created block with ID: ${response.data[0].doOperations[0].id}`
  }],
  _meta: response.data
};

// Bad - Verbose, includes raw data in text
return {
  content: [{
    type: 'text',
    text: `Block created successfully! Here's the full response: ${JSON.stringify(response.data)}`
  }]
};
```

### Error Handling

Provide helpful, actionable error messages:

**Bad:**
```typescript
catch (error) {
  return {
    content: [{ type: 'text', text: 'Error occurred' }],
    isError: true
  };
}
```

**Good:**
```typescript
catch (error) {
  if (error.response?.status === 401) {
    return {
      content: [{
        type: 'text',
        text: 'Authentication failed. Please check your SIYUAN_TOKEN environment variable.'
      }],
      isError: true
    };
  }

  return {
    content: [{
      type: 'text',
      text: `Failed to insert block: ${error.message}`
    }],
    isError: true
  };
}
```

### Resource Management

- Clean up resources (connections, file handles) properly
- Handle timeouts gracefully
- Implement retry logic for transient failures
- Use connection pooling for HTTP clients

## Technical Requirements

### Dependencies

- Use reasonably current versions of all dependencies
- Keep packages up-to-date for security patches
- Pin major versions to avoid breaking changes
- Document minimum required versions

### Transport Support

- **Local servers**: Use stdio transport (current implementation)
- **Remote servers**: Support Streamable HTTP transport
  - Note: SSE transport is being deprecated

### TypeScript/JavaScript Specific

When using TypeScript:
- Enable strict mode
- Use Zod or similar for runtime validation
- Provide type definitions (`.d.ts` files)
- Use ESM (ES modules) for modern compatibility

## Documentation

### Required Documentation

Every MCP server should include:

1. **README.md** with:
   - Clear description of functionality
   - Installation instructions
   - Configuration requirements
   - Usage examples
   - Environment variables

2. **In-tool help** via the help command:
   ```typescript
   documentation: {
     description: "Detailed description",
     params: { /* parameter docs */ },
     returns: { /* return value docs */ },
     examples: [ /* usage examples */ ],
     apiLink: "https://link-to-api-docs"
   }
   ```

3. **Privacy Policy** (if applicable):
   - Required if collecting user data
   - Required if connecting to remote services
   - Must be clear and accessible

4. **Support Information**:
   - Contact information
   - Issue tracker link
   - Community channels

### CLAUDE.md

Create a `CLAUDE.md` file for repositories to guide Claude Code:
- Common development commands
- Architecture overview
- Adding new features
- Configuration details

## Interoperability

### Server Isolation

MCP servers should:
- ✅ Focus on their specific domain
- ✅ Be self-contained and independent
- ❌ Not intentionally call other servers
- ❌ Not coerce Claude into calling other servers
- ❌ Not interfere with Claude calling tools from other servers

### Namespace Best Practices

Use namespaces to organize related commands:

```typescript
// Good - Clear namespace organization
notebook.lsNotebooks
notebook.openNotebook
notebook.createNotebook

block.insertBlock
block.updateBlock
block.deleteBlock
```

This helps avoid naming conflicts and improves discoverability.

## Testing

### Recommended Testing Approach

1. **Unit Tests**: Test individual handlers with mocked client
2. **Integration Tests**: Test against real SiYuan instance
3. **Performance Tests**: Check behavior under load
4. **Error Tests**: Verify error handling

Example test structure:
```typescript
describe('block.insertBlock', () => {
  it('should insert a block with valid params', async () => {
    // Test implementation
  });

  it('should handle authentication errors', async () => {
    // Test error handling
  });
});
```

## Deployment

### Publishing to npm

Before publishing:
- Run `npm run build` to compile TypeScript
- Test the built artifacts
- Update version in `package.json`
- Create a git tag for the release

### Registering with Anthropic

To list your server in Anthropic's MCP Directory:
1. Ensure compliance with all policies
2. Submit via official channels
3. Provide clear documentation
4. Maintain the server actively

## Resources

- [Official MCP Documentation](https://modelcontextprotocol.io/)
- [Anthropic MCP Directory Policy](https://support.anthropic.com/en/articles/11697096-anthropic-mcp-directory-policy)
- [SiYuan API Documentation](https://github.com/siyuan-note/siyuan/blob/master/API.md)
- [Claude Documentation](https://docs.claude.com/)
