import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SolanaRepository } from './repository';
import { CoinScraper } from './scrapers';
import { z } from 'zod';
import { TwitterApi } from 'twitter-api-v2';
import axios from 'axios';

interface Env {
  TWITTER_API_KEY?: string;
  TWITTER_API_SECRET?: string;
  TWITTER_ACCESS_TOKEN?: string;
  TWITTER_ACCESS_SECRET?: string;
  TWITTER_BEARER_TOKEN?: string;
  FARCASTER_API_KEY?: string;
}

export function setupServerTools(
  server: McpServer,
  repository: SolanaRepository,
  env: Env
) {
  const scraper = new CoinScraper();

  server.tool(
    'create_solana_token',
    'Create a new SPL token on Solana',
    {
      name: z.string().describe('Token name'),
      symbol: z.string().describe('Token symbol'),
      decimals: z.number().optional().describe('Token decimals (default: 9)'),
      supply: z.number().optional().describe('Initial supply (default: 1 billion)'),
    },
    async ({ name, symbol, decimals = 9, supply = 1000000000 }) => {
      try {
        const tokenData = await repository.createToken(name, symbol, decimals, supply);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(tokenData, null, 2)
            }
          ],
        };
      } catch (error) {
        throw new Error(`Failed to create token: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  server.tool(
    'scrape_trending_tokens',
    'Scrape Twitter and Farcaster for trending cryptocurrency mentions',
    {
      platform: z.enum(['twitter', 'farcaster', 'both']).optional().describe('Platform to scrape (default: both)'),
      limit: z.number().optional().describe('Number of posts to analyze (default: 100)'),
    },
    async ({ platform = 'both', limit = 100 }) => {
      try {
        const trending = new Map<string, any>();

        if ((platform === 'twitter' || platform === 'both') && env.TWITTER_BEARER_TOKEN) {
          try {
            const twitterClient = new TwitterApi(env.TWITTER_BEARER_TOKEN);

            const tweets = await twitterClient.v2.search('crypto OR memecoin OR solana OR $', {
              max_results: Math.min(limit, 100),
              'tweet.fields': ['public_metrics'],
            });

            for (const tweet of tweets.data.data || []) {
              const symbols = scraper.detectCoins(tweet.text);

              for (const symbol of symbols) {
                if (!trending.has(symbol)) {
                  trending.set(symbol, {
                    symbol,
                    mentions: 0,
                    engagement: 0,
                    sources: [],
                  });
                }

                const data = trending.get(symbol);
                data.mentions++;
                data.engagement += (tweet.public_metrics?.like_count || 0) +
                                   (tweet.public_metrics?.retweet_count || 0) * 2;

                if (!data.sources.find((s: any) => s.source === 'twitter')) {
                  data.sources.push({ source: 'twitter', mentions: 0, engagement: 0 });
                }
                const twitterSource = data.sources.find((s: any) => s.source === 'twitter');
                twitterSource.mentions++;
                twitterSource.engagement += data.engagement;
              }
            }
          } catch (err) {
            console.error('Twitter scraping error:', err);
          }
        }

        if ((platform === 'farcaster' || platform === 'both') && env.FARCASTER_API_KEY) {
          try {
            const response = await axios.get('https://api.neynar.com/v2/farcaster/feed/trending', {
              headers: { 'api_key': env.FARCASTER_API_KEY },
              params: { limit: Math.min(limit, 100) },
            });

            for (const cast of response.data.casts || []) {
              const symbols = scraper.detectCoins(cast.text);

              for (const symbol of symbols) {
                if (!trending.has(symbol)) {
                  trending.set(symbol, {
                    symbol,
                    mentions: 0,
                    engagement: 0,
                    sources: [],
                  });
                }

                const data = trending.get(symbol);
                data.mentions++;
                data.engagement += (cast.reactions?.likes_count || 0) +
                                   (cast.reactions?.recasts_count || 0) * 3;

                if (!data.sources.find((s: any) => s.source === 'farcaster')) {
                  data.sources.push({ source: 'farcaster', mentions: 0, engagement: 0 });
                }
                const farcasterSource = data.sources.find((s: any) => s.source === 'farcaster');
                farcasterSource.mentions++;
                farcasterSource.engagement += data.engagement;
              }
            }
          } catch (err) {
            console.error('Farcaster scraping error:', err);
          }
        }

        const trendingArray = scraper.aggregateMentions(trending).slice(0, 20);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                trending: trendingArray,
                totalAnalyzed: limit,
                timestamp: new Date().toISOString(),
              }, null, 2)
            }
          ],
        };
      } catch (error) {
        throw new Error(`Failed to scrape trending tokens: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  server.tool(
    'post_to_twitter',
    'Post a tweet to Twitter/X',
    {
      text: z.string().describe('Tweet text (max 280 characters)'),
    },
    async ({ text }) => {
      try {
        if (!env.TWITTER_API_KEY || !env.TWITTER_API_SECRET ||
            !env.TWITTER_ACCESS_TOKEN || !env.TWITTER_ACCESS_SECRET) {
          throw new Error('Twitter credentials not configured');
        }

        if (text.length > 280) {
          throw new Error('Tweet exceeds 280 characters');
        }

        const client = new TwitterApi({
          appKey: env.TWITTER_API_KEY,
          appSecret: env.TWITTER_API_SECRET,
          accessToken: env.TWITTER_ACCESS_TOKEN,
          accessSecret: env.TWITTER_ACCESS_SECRET,
        });

        const tweet = await client.v2.tweet(text);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                tweetId: tweet.data.id,
                text: tweet.data.text,
                url: `https://twitter.com/i/status/${tweet.data.id}`,
              }, null, 2)
            }
          ],
        };
      } catch (error) {
        throw new Error(`Failed to post tweet: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  server.tool(
    'check_token_balance',
    'Check token balance for a Solana address',
    {
      mint: z.string().describe('Token mint address'),
      owner: z.string().describe('Owner wallet address'),
    },
    async ({ mint, owner }) => {
      try {
        const balance = await repository.getTokenBalance(mint, owner);
        const solBalance = await repository.getWalletSOLBalance(owner);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                tokenBalance: balance,
                solBalance,
                mint,
                owner,
              }, null, 2)
            }
          ],
        };
      } catch (error) {
        throw new Error(`Failed to check balance: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  server.tool(
    'analyze_sentiment',
    'Analyze sentiment of social media mentions for a token',
    {
      symbol: z.string().describe('Token symbol to analyze'),
      timeframe: z.enum(['1h', '24h', '7d']).optional().describe('Timeframe for analysis (default: 24h)'),
    },
    async ({ symbol, timeframe = '24h' }) => {
      try {
        let sentimentScore = 0;
        let totalMentions = 0;
        const keywords = {
          bullish: ['moon', 'bullish', 'buy', 'pump', 'gem', '100x', 'lfg'],
          bearish: ['dump', 'bearish', 'sell', 'rug', 'scam', 'dead'],
        };

        if (env.TWITTER_BEARER_TOKEN) {
          const client = new TwitterApi(env.TWITTER_BEARER_TOKEN);
          const tweets = await client.v2.search(`${symbol}`, {
            max_results: 100,
          });

          for (const tweet of tweets.data.data) {
            totalMentions++;
            const text = tweet.text.toLowerCase();

            for (const word of keywords.bullish) {
              if (text.includes(word)) sentimentScore += 1;
            }
            for (const word of keywords.bearish) {
              if (text.includes(word)) sentimentScore -= 1;
            }
          }
        }

        const normalizedSentiment = totalMentions > 0 ? sentimentScore / totalMentions : 0;
        const sentiment = normalizedSentiment > 0.2 ? 'bullish' :
                         normalizedSentiment < -0.2 ? 'bearish' : 'neutral';

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                symbol,
                sentiment,
                sentimentScore: normalizedSentiment.toFixed(2),
                totalMentions,
                timeframe,
                timestamp: new Date().toISOString(),
              }, null, 2)
            }
          ],
        };
      } catch (error) {
        throw new Error(`Failed to analyze sentiment: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  server.tool(
    'get_follower_count',
    'Get follower count for a Twitter account',
    {
      username: z.string().optional().describe('Twitter username (uses authenticated user if not provided)'),
    },
    async ({ username }) => {
      try {
        if (!env.TWITTER_API_KEY || !env.TWITTER_API_SECRET ||
            !env.TWITTER_ACCESS_TOKEN || !env.TWITTER_ACCESS_SECRET) {
          throw new Error('Twitter credentials not configured');
        }

        const client = new TwitterApi({
          appKey: env.TWITTER_API_KEY,
          appSecret: env.TWITTER_API_SECRET,
          accessToken: env.TWITTER_ACCESS_TOKEN,
          accessSecret: env.TWITTER_ACCESS_SECRET,
        });

        let userId: string;
        if (username) {
          const user = await client.v2.userByUsername(username);
          userId = user.data.id;
        } else {
          const me = await client.v2.me();
          userId = me.data.id;
        }

        const user = await client.v2.user(userId, {
          'user.fields': ['public_metrics'],
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                username: user.data.username,
                followersCount: user.data.public_metrics?.followers_count || 0,
                followingCount: user.data.public_metrics?.following_count || 0,
                tweetCount: user.data.public_metrics?.tweet_count || 0,
                timestamp: new Date().toISOString(),
              }, null, 2)
            }
          ],
        };
      } catch (error) {
        throw new Error(`Failed to get follower count: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}
