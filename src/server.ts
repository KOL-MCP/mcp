import { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { McpHonoServerDO } from '@nullshot/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { setupServerTools } from './tools';
import { setupServerResources } from './resources';
import { setupServerPrompts } from './prompts';
import { SolanaRepository } from './repository';

export class KOLMcpServer extends McpHonoServerDO<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  getImplementation(): Implementation {
    return {
      name: 'KOLMcpServer',
      version: '1.0.0',
    };
  }

  configureServer(server: McpServer): void {
    const repository = new SolanaRepository(this.env);

    setupServerTools(server, repository, this.env);
    setupServerResources(server, repository, this.env);
    setupServerPrompts(server);
  }
} 