import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SolanaRepository } from './repository';

interface Env {
  SOLANA_PRIVATE_KEY?: string;
}

export function setupServerResources(
  server: McpServer,
  repository: SolanaRepository,
  env: Env
) {
  server.resource(
    'agent_stats',
    'agent://stats',
    async () => {
      const stats = {
        status: 'active',
        uptime: '100%',
        capabilities: [
          'Token Creation',
          'Social Media Scraping',
          'Sentiment Analysis',
          'Automated Posting',
          'Balance Checking',
        ],
        walletConfigured: !!env.SOLANA_PRIVATE_KEY,
        lastUpdated: new Date().toISOString(),
      };

      return {
        contents: [
          {
            uri: 'agent://stats',
            mimeType: 'application/json',
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    }
  );

  server.resource(
    'supported_networks',
    'agent://networks',
    async () => {
      const networks = {
        solana: {
          mainnet: 'https://api.mainnet-beta.solana.com',
          devnet: 'https://api.devnet.solana.com',
          testnet: 'https://api.testnet.solana.com',
        },
        socialPlatforms: ['twitter', 'farcaster'],
      };

      return {
        contents: [
          {
            uri: 'agent://networks',
            mimeType: 'application/json',
            text: JSON.stringify(networks, null, 2),
          },
        ],
      };
    }
  );

  server.resource(
    'api_documentation',
    'agent://docs',
    async () => {
      const docs = {
        name: 'KOL Agent MCP',
        version: '1.0.0',
        description: 'Autonomous agent for creating tokens, analyzing trends, and managing social media presence',
        tools: {
          create_solana_token: 'Creates SPL tokens on Solana',
          scrape_trending_tokens: 'Analyzes trending tokens on social media',
          post_to_twitter: 'Posts tweets to Twitter/X',
          check_token_balance: 'Checks token balances',
          analyze_sentiment: 'Analyzes social sentiment for tokens',
          get_follower_count: 'Gets Twitter follower count',
        },
        resources: {
          'agent://stats': 'Agent statistics and status',
          'agent://networks': 'Supported networks',
          'agent://docs': 'API documentation',
        },
        prompts: {
          viral_thread: 'Generate viral Twitter thread',
          market_analysis: 'Generate market analysis',
        },
      };

      return {
        contents: [
          {
            uri: 'agent://docs',
            mimeType: 'application/json',
            text: JSON.stringify(docs, null, 2),
          },
        ],
      };
    }
  );
} 