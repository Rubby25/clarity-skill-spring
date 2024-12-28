import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Freelancer can create profile",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('skill_spring', 'create-profile', [
        types.utf8("John Doe"),
        types.utf8("Web Development, Smart Contracts")
      ], wallet1.address)
    ]);
    
    block.receipts[0].result.expectOk();
    
    let profileQuery = chain.mineBlock([
      Tx.contractCall('skill_spring', 'get-profile', [
        types.principal(wallet1.address)
      ], wallet1.address)
    ]);
    
    profileQuery.receipts[0].result.expectSome();
  },
});

Clarinet.test({
  name: "Client can post job and freelancer can bid",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const client = accounts.get('wallet_1')!;
    const freelancer = accounts.get('wallet_2')!;
    
    // Post job
    let jobBlock = chain.mineBlock([
      Tx.contractCall('skill_spring', 'post-job', [
        types.utf8("Build DApp"),
        types.utf8("Need a decentralized application built"),
        types.uint(1000)
      ], client.address)
    ]);
    
    const jobId = jobBlock.receipts[0].result.expectOk();
    
    // Place bid
    let bidBlock = chain.mineBlock([
      Tx.contractCall('skill_spring', 'place-bid', [
        jobId,
        types.uint(900),
        types.utf8("I can help build your DApp")
      ], freelancer.address)
    ]);
    
    bidBlock.receipts[0].result.expectOk();
    
    // Accept bid
    let acceptBlock = chain.mineBlock([
      Tx.contractCall('skill_spring', 'accept-bid', [
        jobId,
        types.principal(freelancer.address)
      ], client.address)
    ]);
    
    acceptBlock.receipts[0].result.expectOk();
  },
});

Clarinet.test({
  name: "Client can rate freelancer",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const client = accounts.get('wallet_1')!;
    const freelancer = accounts.get('wallet_2')!;
    
    // Create freelancer profile first
    chain.mineBlock([
      Tx.contractCall('skill_spring', 'create-profile', [
        types.utf8("Jane Smith"),
        types.utf8("Smart Contract Development")
      ], freelancer.address)
    ]);
    
    // Rate freelancer
    let rateBlock = chain.mineBlock([
      Tx.contractCall('skill_spring', 'rate-freelancer', [
        types.principal(freelancer.address),
        types.uint(5)
      ], client.address)
    ]);
    
    rateBlock.receipts[0].result.expectOk();
    
    // Check updated rating
    let profileQuery = chain.mineBlock([
      Tx.contractCall('skill_spring', 'get-profile', [
        types.principal(freelancer.address)
      ], client.address)
    ]);
    
    const profile = profileQuery.receipts[0].result.expectSome();
    assertEquals(profile['rating'], types.uint(5));
    assertEquals(profile['review-count'], types.uint(1));
  },
});