interface Env {
  THIRDWEB_SECRET_KEY: string;
  SOLANA_RPC_URL: string;
}

export interface TokenData {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
  network: string;
  signature?: string;
  wallet?: string;
}

export class SolanaRepository {
  private env: Env;
  private thirdwebBaseUrl: string = 'https://api.thirdweb.com/v1/solana';

  constructor(env: Env) {
    this.env = env;
  }

  async createToken(
    name: string,
    symbol: string,
    decimals: number,
    supply: number
  ): Promise<TokenData> {
    if (!this.env.THIRDWEB_SECRET_KEY) {
      throw new Error('THIRDWEB_SECRET_KEY not configured');
    }

    const chainId = this.env.SOLANA_RPC_URL.includes('devnet') ? 'solana:devnet' : 'solana:mainnet';

    const walletLabel = `${symbol.toLowerCase()}-treasury`;
    const wallet = await this.createOrGetWallet(walletLabel, chainId);

    const deployResponse = await fetch(`${this.thirdwebBaseUrl}/tokens/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret-key': this.env.THIRDWEB_SECRET_KEY,
      },
      body: JSON.stringify({
        name,
        symbol,
        decimals,
        initialSupply: supply.toString(),
        chainId,
        from: wallet.address,
      }),
    });

    if (!deployResponse.ok) {
      const error = await deployResponse.text();
      throw new Error(`Thirdweb token deployment failed: ${deployResponse.statusText} - ${error}`);
    }

    const tokenData = await deployResponse.json();

    return {
      mint: tokenData.mint || tokenData.address,
      name,
      symbol,
      decimals,
      supply,
      network: chainId.split(':')[1],
      signature: tokenData.signature || tokenData.transactionHash,
      wallet: wallet.address,
    };
  }

  private async createOrGetWallet(label: string, chainId: string): Promise<{ address: string }> {
    const response = await fetch(`${this.thirdwebBaseUrl}/wallets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret-key': this.env.THIRDWEB_SECRET_KEY,
      },
      body: JSON.stringify({ label, chainId }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Thirdweb wallet creation failed: ${response.statusText} - ${error}`);
    }

    return await response.json();
  }

  async getTokenBalance(mintAddress: string, ownerAddress: string): Promise<number> {
    const chainId = this.env.SOLANA_RPC_URL.includes('devnet') ? 'solana:devnet' : 'solana:mainnet';

    const response = await fetch(
      `${this.thirdwebBaseUrl}/wallets/${ownerAddress}/balance?chainId=${chainId}`,
      {
        method: 'GET',
        headers: {
          'x-secret-key': this.env.THIRDWEB_SECRET_KEY,
        },
      }
    );

    if (!response.ok) {
      return 0;
    }

    const balanceData = await response.json();
    const token = balanceData.tokens?.find((t: any) => t.mint === mintAddress);

    return token ? parseFloat(token.balance) : 0;
  }

  async getWalletSOLBalance(address: string): Promise<number> {
    const chainId = this.env.SOLANA_RPC_URL.includes('devnet') ? 'solana:devnet' : 'solana:mainnet';

    const response = await fetch(
      `${this.thirdwebBaseUrl}/wallets/${address}/balance?chainId=${chainId}`,
      {
        method: 'GET',
        headers: {
          'x-secret-key': this.env.THIRDWEB_SECRET_KEY,
        },
      }
    );

    if (!response.ok) {
      return 0;
    }

    const balanceData = await response.json();
    return parseFloat(balanceData.sol || '0');
  }

  async sendTokens(from: string, to: string, amount: string, tokenAddress?: string): Promise<{ signature: string }> {
    const chainId = this.env.SOLANA_RPC_URL.includes('devnet') ? 'solana:devnet' : 'solana:mainnet';

    const response = await fetch(`${this.thirdwebBaseUrl}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret-key': this.env.THIRDWEB_SECRET_KEY,
      },
      body: JSON.stringify({
        from,
        to,
        amount,
        tokenAddress,
        chainId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Thirdweb send failed: ${response.statusText} - ${error}`);
    }

    return await response.json();
  }
}
