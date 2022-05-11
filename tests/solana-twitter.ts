import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolanaTwitter } from "../target/types/solana_twitter";
import * as assert from "assert";
import * as bs58 from "bs58";

describe("solana-twitter", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.SolanaTwitter as Program<SolanaTwitter>;

  it('can send a new tweet', async () => {
    const tweet = anchor.web3.Keypair.generate();
    
    await program.rpc.sendTweet('Best Pizza Topping', 'Pepperoni ofc...',{
      accounts: {
        tweet: tweet.publicKey,
        author: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [tweet],
    });

    //fetch the account details of created tweet
    const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);
    //console.log(tweetAccount);

    //ensure it has the right data (equality)
    assert.equal(tweetAccount.author.toBase58(), program.provider.wallet.publicKey.toBase58());
    assert.equal(tweetAccount.topic, 'Best Pizza Topping');
    assert.equal(tweetAccount.content, 'Pepperoni ofc...');

    //ensure something is truthy
    assert.ok(tweetAccount.timestamp);
  });

  it('can send a new tweet without a topic', async () => {
    const tweet = anchor.web3.Keypair.generate();
    
    await program.rpc.sendTweet('', 'gm',{
      accounts: {
        tweet: tweet.publicKey,
        author: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [tweet],
    });

    //fetch the account details of created tweet
    const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);
    //console.log(tweetAccount);

    //ensure it has the right data (equality)
    assert.equal(tweetAccount.author.toBase58(), program.provider.wallet.publicKey.toBase58());
    assert.equal(tweetAccount.topic, '');
    assert.equal(tweetAccount.content, 'gm');

    //ensure something is truthy
    assert.ok(tweetAccount.timestamp);
  });

  it('can send a tweet from different author', async () => {

    //generate user wallet
    const otherUser = anchor.web3.Keypair.generate();

    //airdrop otherUser
    const signature = await program.provider.connection.requestAirdrop(otherUser.publicKey,1000000000);
    await program.provider.connection.confirmTransaction(signature);

    const tweet = anchor.web3.Keypair.generate();
    
    await program.rpc.sendTweet('Veganism', 'Yay tofu!',{
      accounts: {
        tweet: tweet.publicKey,
        author: otherUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [otherUser, tweet],
    });

    //fetch the account details of created tweet
    const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);
    //console.log(tweetAccount);

    //ensure it has the right data (equality)
    assert.equal(tweetAccount.author.toBase58(), otherUser.publicKey.toBase58());
    assert.equal(tweetAccount.topic, 'Veganism');
    assert.equal(tweetAccount.content, 'Yay tofu!');

    //ensure something is truthy
    assert.ok(tweetAccount.timestamp);
  });

  it('cannot provide a topic with more than 50 characters', async () => {
    try {
      const tweet = anchor.web3.Keypair.generate();
    
      const topicWith51Chars = 'x'.repeat(51);

      await program.rpc.sendTweet(topicWith51Chars, 'Pepperoni ofc...',{
        accounts: {
          tweet: tweet.publicKey,
          author: program.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [tweet],
      });
        } catch (error) {
          assert.equal(error.error.errorMessage,'Topic should be 50 chars long max');
          return;
        }

        assert.fail('Instruction should fail with 51-char topic');

  

   
  });

  it('can fetch all tweets', async () => {
    const tweetAccounts = await program.account.tweet.all();
    assert.equal(tweetAccounts.length, 3);
  });

  it('can fetch tweets from wallet', async () => {
    const authorPublicKey= program.provider.wallet.publicKey;
    const tweetAccounts = await program.account.tweet.all([
      {
        memcmp: {
          offset: 8, //discriminator.
          bytes: authorPublicKey.toBase58(),
        }
      }
    ]);
    assert.equal(tweetAccounts.length, 2);
    assert.ok(tweetAccounts.every(tweetAccount => {
      return tweetAccount.account.author.toBase58() === authorPublicKey.toBase58()
    }))
  });

  it('can fetch tweets by topic', async () => {

    const topicBuffer = Buffer.from('Veganism')
    const tweetAccounts = await program.account.tweet.all([
      {
        memcmp: {
          offset: 8 + //discriminator
          32 + //author pub key
          8 + //timestamp
          4, //topic string prefix
          bytes: bs58.encode(topicBuffer),
        }
      }
    ]);

    assert.equal(tweetAccounts.length, 1);
    assert.ok(tweetAccounts.every(tweetAcc => {
      return tweetAcc.account.topic === 'Veganism'
    }))
  });

});
