use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};
use spl_token_lending;

pub mod addresses;
use crate::addresses::*;

declare_id!("GEpoZx3h32X7caJjFtoNseaN7BCgJgFTKmP53zMm3BkK");

#[program]
pub mod user_deposit {
    use super::*;

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> ProgramResult {
        // deposit to Solend
        solana_program::program::invoke(
            &spl_token_lending::instruction::deposit_reserve_liquidity(
                get_pubkey(DEVNET_SOLEND_PROGRAM),
                amount,
                *ctx.accounts.source_liquidity.to_account_info().key,
                *ctx.accounts.destination_collateral_account.to_account_info().key,
                get_pubkey(DEVNET_SOLEND_SOL_RESERVE),
                get_pubkey(DEVNET_SOLEND_CSOL_LIQUIDITY_SUPPLY),
                get_pubkey(DEVNET_SOLEND_CSOL_COLLATERAL_MINT),
                get_pubkey(DEVNET_SOLEND_LENDING_MARKET),
                *ctx.accounts.transfer_authority.to_account_info().key,
            ),
            &ToAccountInfos::to_account_infos(ctx.accounts),
        )?;

        // mint tickets to user
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.ticket.to_account_info(),
                    to: ctx.accounts.receiver_ticket.to_account_info(),
                    authority: ctx.accounts.sender.to_account_info(),
                }),
            amount,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    // solend part
    #[account(mut)]
    pub source_liquidity: Account<'info, TokenAccount>,
    #[account(mut)]
    pub destination_collateral_account: Account<'info, TokenAccount>,
    /// CHECK: Safe because `transfer_authority` is not modified in the handler
    pub transfer_authority: AccountInfo<'info>,

    // tickets part
    pub sender: Signer<'info>,
    #[account(mut)]
    pub receiver_ticket: Account<'info, TokenAccount>,
    #[account(mut)]
    pub ticket: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}
