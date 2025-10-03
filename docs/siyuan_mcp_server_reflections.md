# SiYuan MCP Server Architecture Discussion Summary

## Overview
Analysis of an existing SiYuan Note MCP server implementation and architectural recommendations for improving its design, particularly for use with Claude Code and managing complexity through agent decomposition.

## Current Implementation Assessment

### Strengths
- 45+ tools across 15 namespaces with comprehensive API coverage
- Clean TypeScript implementation with Zod validation
- Well-documented command handlers

### Critical Issues
1. **Anti-pattern tool registration**: Uses only 3 meta-tools (`executeCommand`, `queryCommands`, `help`) instead of exposing 45+ tools directly to MCP, breaking discovery and autocomplete
2. **Missing MCP features**: Only implements Tools, ignores Resources, Prompts, and Sampling
3. **Simplistic error handling**: Returns raw JSON strings instead of structured responses
4. **Security concerns**: Direct SQL execution and network proxy capabilities

## MCP Features Reality Check

### Resources
- **Theory**: Could expose notebooks/documents as browsable URIs (`siyuan://notebook/id`)
- **Practice**: Requires constant updates for dynamic content, making tools more practical
- **Verdict**: Nice-to-have for static content, impractical for SiYuan's dynamic nature

### Sampling
- **Status**: Not currently used by Claude Desktop/Code
- **Verdict**: Can be ignored for now

## Inter-Agent Communication Challenge

### File Transfer Options
1. **Filesystem Bridge** (Recommended)
   - Agents share `/tmp/mcp-shared/` directory
   - Most efficient for large files

2. **S3 Temporary Exchange** (Proposed Solution)
   - Create small MCP server for S3 temp storage with TTL
   - Agents exchange S3 URIs instead of base64 data
   - Reduces context pollution

3. **Base64 Through Context** (Avoid)
   - Memory intensive
   - Clutters conversation context

### Key Limitation
SiYuan API only accepts base64 uploads, not URL references - someone must fetch and convert.

## Agent Decomposition Strategy

### Design Principle: Organize by Context Impact, Not CRUD

**Problem**: 45+ tools in one agent causes:
- Cognitive overload
- Massive context pollution (50KB+ per complex operation)
- Poor discoverability

### Recommended Architecture

#### 1. `siyuan-search` (5 tools)
- **Purpose**: Discovery and search
- **Why separate**: Search results can be massive; agent summarizes before returning
- **Returns**: Condensed summaries, not raw results

#### 2. `siyuan-editor` (12 tools)
- **Purpose**: Document editing INCLUDING asset uploads
- **Key insight**: Assets and blocks are tightly coupled - separating them creates coordination overhead
- **Handles**: Complete edit workflows with images
- **Returns**: Operation summaries, not full documents

#### 3. `siyuan-workspace` (8 tools)
- **Purpose**: System-wide operations (export, backup, templates)
- **Why separate**: Heavy operations affecting multiple documents

#### 4. `siyuan-coordinator` (10-12 tools)
- **Purpose**: Lightweight coordination and simple operations
- **Keeps only**: Tools with small responses (list, create, metadata)

### Alternative Considered: Asset Preprocessor
```
asset-preprocessor (generic) → siyuan-editor (specific)
```
Separates URL fetching/image processing from SiYuan-specific operations.

## Context Management Strategy

### Without Subagents
- Search results: ~10KB
- Document reads: ~20KB
- Edit cycles: ~30KB
- **Total pollution**: 50KB+ per operation

### With Subagents
- Search summary: ~1KB
- Edit confirmation: ~0.5KB
- **Total in main**: <2KB

## Key Architectural Decisions

1. **Group by workflow frequency**, not by read/write operations
2. **Isolate context-heavy operations** in subagents
3. **Keep related operations together** (e.g., assets with document editing)
4. **Separate by system boundaries**, not operation types

## Implementation Recommendations

1. **Fix tool registration**: Expose tools directly to MCP, not through meta-commands
2. **Implement subagents**: Start with 3-4 focused agents instead of one monolithic server
3. **Add S3 exchange**: For efficient inter-agent file sharing
4. **Structure responses**: Return formatted text, not raw JSON
5. **Consider Resources**: Only for truly static/cacheable content

## Metrics
- Original: 45 tools in 1 agent
- Proposed: 35 active tools across 4 agents
- Context reduction: ~95% in main conversation thread
- Cognitive load: Reduced from 45 to 10-12 tools per context

This architecture prioritizes practical usability and context management over theoretical purity, acknowledging MCP's current limitations while optimizing for real-world usage with Claude Code.