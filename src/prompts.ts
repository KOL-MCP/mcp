import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function setupServerPrompts(server: McpServer) {
  server.prompt(
    'viral_thread',
    'Generate a viral Twitter thread about a cryptocurrency or memecoin',
    {
      tokenSymbol: z.string().describe('Token symbol'),
      tokenName: z.string().optional().describe('Token name'),
      keyPoints: z.array(z.string()).optional().describe('Key points to highlight'),
      style: z.enum(['professional', 'degen', 'educational']).optional().describe('Thread style'),
    },
    async ({ tokenSymbol, tokenName, keyPoints = [], style = 'professional' }) => {
      let prompt = '';

      if (style === 'professional') {
        prompt = `Create a professional Twitter thread about ${tokenSymbol}${tokenName ? ` (${tokenName})` : ''}. ` +
                `The thread should be informative, balanced, and focus on fundamentals. ` +
                `Include 5-7 tweets covering: introduction, utility, team/community, roadmap, and conclusion. `;
      } else if (style === 'degen') {
        prompt = `Create an engaging, meme-friendly Twitter thread about ${tokenSymbol}${tokenName ? ` (${tokenName})` : ''}. ` +
                `The thread should be exciting and capture attention while staying authentic. ` +
                `Include 4-6 tweets with appropriate use of slang and hype without being scammy. `;
      } else {
        prompt = `Create an educational Twitter thread about ${tokenSymbol}${tokenName ? ` (${tokenName})` : ''}. ` +
                `The thread should teach readers about the token, its technology, and use cases. ` +
                `Include 6-8 tweets with clear explanations suitable for beginners. `;
      }

      if (keyPoints.length > 0) {
        prompt += `Make sure to cover these key points: ${keyPoints.join(', ')}. `;
      }

      prompt += `Each tweet should be under 280 characters. Number the tweets (1/n, 2/n, etc.).`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    }
  );

  server.prompt(
    'market_analysis',
    'Generate a market analysis for a cryptocurrency',
    {
      tokenSymbol: z.string().describe('Token symbol to analyze'),
      includeCharts: z.boolean().optional().describe('Whether to reference chart patterns'),
      timeframe: z.enum(['short', 'medium', 'long']).optional().describe('Analysis timeframe'),
    },
    async ({ tokenSymbol, includeCharts = true, timeframe = 'medium' }) => {
      const timeframeMap = {
        short: '24-hour to 7-day',
        medium: '1-month to 3-month',
        long: '6-month to 1-year',
      };

      let prompt = `Provide a comprehensive market analysis for ${tokenSymbol} with a ${timeframeMap[timeframe]} outlook. `;

      prompt += `Include: 1) Current market position and sentiment, 2) Key support/resistance levels, ` +
               `3) Volume and liquidity analysis, 4) Potential catalysts or risks, 5) Price prediction range. `;

      if (includeCharts) {
        prompt += `Reference relevant chart patterns and technical indicators. `;
      }

      prompt += `Keep the analysis objective and data-driven. Mention both bullish and bearish scenarios.`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    }
  );

  server.prompt(
    'content_calendar',
    'Generate a content calendar for social media marketing',
    {
      tokenSymbol: z.string().describe('Token to create content for'),
      duration: z.enum(['week', 'month']).optional().describe('Calendar duration'),
      postsPerDay: z.number().optional().describe('Number of posts per day'),
    },
    async ({ tokenSymbol, duration = 'week', postsPerDay = 3 }) => {
      const days = duration === 'week' ? 7 : 30;
      const totalPosts = days * postsPerDay;

      const prompt = `Create a ${duration}-long social media content calendar for ${tokenSymbol}. ` +
                    `Generate ${postsPerDay} post ideas per day (${totalPosts} posts total). ` +
                    `Include a mix of: educational content, community engagement, market updates, ` +
                    `memes/entertainment, and calls-to-action. Format as a daily schedule with ` +
                    `post type, content idea, and best posting time.`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    }
  );
} 