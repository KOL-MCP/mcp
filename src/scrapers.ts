export interface CoinMention {
  symbol: string;
  mentions: number;
  engagement: number;
  category: 'major' | 'memecoin' | 'unknown';
  sources: Array<{
    source: string;
    mentions: number;
    engagement: number;
  }>;
}

export class CoinScraper {
  detectCoins(text: string): string[] {
    const symbolPattern = /\$([A-Z]{2,10})\b/g;
    const matches = text.matchAll(symbolPattern);
    return Array.from(matches, m => `$${m[1]}`);
  }

  categorizeCoin(symbol: string): 'major' | 'memecoin' | 'unknown' {
    const majorCoins = ['BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'AVAX', 'MATIC', 'DOT'];
    const memecoins = ['DOGE', 'SHIB', 'PEPE', 'BONK', 'WIF', 'FLOKI', 'ELON', 'SAMO'];

    const cleanSymbol = symbol.replace('$', '').toUpperCase();

    if (majorCoins.includes(cleanSymbol)) return 'major';
    if (memecoins.includes(cleanSymbol)) return 'memecoin';
    return 'unknown';
  }

  aggregateMentions(mentions: Map<string, any>): CoinMention[] {
    const result: CoinMention[] = [];

    for (const [symbol, data] of mentions.entries()) {
      result.push({
        symbol,
        mentions: data.mentions,
        engagement: data.engagement,
        category: this.categorizeCoin(symbol),
        sources: data.sources || [],
      });
    }

    return result.sort((a, b) => b.engagement - a.engagement);
  }
}
