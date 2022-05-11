use anchor_lang::prelude::*;

use anchor_lang::solana_program::system_program;

declare_id!("DUxkTsCrXHJKWzuPcT9xta1s3iZma6eXt7KaYvSSgDX1");

#[program]
pub mod solana_twitter {
    use super::*;

    pub fn send_tweet(ctx: Context<SendTweet>, topic: String, content: String) -> Result<()>{
        
        if topic.chars().count() > 50  {
           return Err(error!(ErrorCode::TopicTooLong))
        }

        if content.chars().count() > 280 {
            return Err(error!(ErrorCode::ContentTooLong))
        }

        let tweet: &mut Account<Tweet> = &mut ctx.accounts.tweet;
        let author: &Signer = &ctx.accounts.author;
        let clock: Clock = Clock::get().unwrap();

        //set the author in Tweet struct to author from SendTweet, ei the one calling the function sendtweet
        tweet.author = *author.key;

        //set timestamp usine clock.unix_timestamp
        tweet.timestamp = clock.unix_timestamp;

        tweet.topic = topic;
        tweet.content = content;

        Ok(())
    }
}

//public key should be provided when sending instruction
#[derive(Accounts)]
pub struct SendTweet<'info> {
    #[account(init, payer = author, space = Tweet::LEN)]
    pub tweet: Account<'info, Tweet>,
    #[account(mut)] //author is paying to make tweet so account must be mutable
    pub author: Signer<'info>,
    #[account(address = system_program::ID)] //account constraint requires pubkey match system program pubkey exactly
    //pub system_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>, //updated ensures official system program
}


//  Discriminator - whenever a new account is created
//  a discriminator of 8 bytes will be added to the beginning of the data.

// 8 bits in one byte

#[account]
pub struct Tweet {
    pub author: Pubkey, //32 bytes
    pub timestamp: i64, //8 bytes
    pub topic: String,
    pub content: String,
}

const DISCRIMINATOR_LENGTH: usize = 8;
const PUBLIC_KEY_LENGTH: usize = 32;
const TIMESTAMP_LENGTH: usize = 8;
const STRING_LENGTH_PREFIX: usize = 4; //stores the size of the string (length)
const MAX_TOPIC_LENGTH: usize = 50 * 4; //50 character limit for topic

// make character count for content max 280 characters
const MAX_CONTENT_LENGTH: usize = 280 * 4; // 280 chars max.

impl Tweet {
    const LEN: usize = DISCRIMINATOR_LENGTH
        + PUBLIC_KEY_LENGTH //author
        + TIMESTAMP_LENGTH //Timestamp
        + STRING_LENGTH_PREFIX + MAX_TOPIC_LENGTH //Topic
        + STRING_LENGTH_PREFIX + MAX_CONTENT_LENGTH; //Content

}

#[error_code]
pub enum ErrorCode {
    #[msg("Topic should be 50 chars long max")]
    TopicTooLong,
    #[msg("Content should be 50 chars long max")]
    ContentTooLong,
}
