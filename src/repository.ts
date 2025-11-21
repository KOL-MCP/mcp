import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from '@solana/spl-token';

interface Env {
  SOLANA_RPC_URL: string;
  SOLANA_PRIVATE_KEY?: string;
}

export interface TokenData {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
  network: string;
  signature?: string;
}

export class SolanaRepository {
  private connection: Connection;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.connection = new Connection(env.SOLANA_RPC_URL, 'confirmed');
  }

  async createToken(
    name: string,
    symbol: string,
    decimals: number,
    supply: number
  ): Promise<TokenData> {
    if (!this.env.SOLANA_PRIVATE_KEY) {
      throw new Error('SOLANA_PRIVATE_KEY not configured');
    }

    const payer = Keypair.fromSecretKey(
      Buffer.from(this.env.SOLANA_PRIVATE_KEY, 'base64')
    );

    const mintAuthority = payer;
    const freezeAuthority = payer;

    const mint = await createMint(
      this.connection,
      payer,
      mintAuthority.publicKey,
      freezeAuthority.publicKey,
      decimals,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );

    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      payer,
      mint,
      payer.publicKey
    );

    const signature = await mintTo(
      this.connection,
      payer,
      mint,
      tokenAccount.address,
      mintAuthority,
      supply * Math.pow(10, decimals)
    );

    return {
      mint: mint.toBase58(),
      name,
      symbol,
      decimals,
      supply,
      network: this.env.SOLANA_RPC_URL.includes('devnet') ? 'devnet' : 'mainnet',
      signature,
    };
  }

  async getTokenBalance(mintAddress: string, ownerAddress: string): Promise<number> {
    const mintPubkey = new PublicKey(mintAddress);
    const ownerPubkey = new PublicKey(ownerAddress);

    const tokenAccounts = await this.connection.getTokenAccountsByOwner(
      ownerPubkey,
      { mint: mintPubkey }
    );

    if (tokenAccounts.value.length === 0) {
      return 0;
    }

    const balance = await this.connection.getTokenAccountBalance(
      tokenAccounts.value[0].pubkey
    );

    return parseFloat(balance.value.uiAmountString || '0');
  }

  async getWalletSOLBalance(address: string): Promise<number> {
    const pubkey = new PublicKey(address);
    const balance = await this.connection.getBalance(pubkey);
    return balance / 1e9;
  }
}
