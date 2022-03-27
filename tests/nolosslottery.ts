import * as token from "@solana/spl-token";
import * as anchor from "@project-serum/anchor";
import { Nolosslottery } from "../target/types/nolosslottery";
import process from "process";
import * as assert from "assert";

describe("nolosslottery",  () => {
    const provider = anchor.Provider.env();
    anchor.setProvider(provider);
    const nolosslottery = anchor.workspace.Nolosslottery as anchor.Program<Nolosslottery>;
    console.log(nolosslottery.programId.toString())
    let ticket;
    let receiver_token;
    let source_token;
    let destinationCollateralAccount_token;
    const payer = anchor.web3.Keypair.fromSecretKey(
        Buffer.from(
            JSON.parse(
                require("fs").readFileSync(process.env.ANCHOR_WALLET, {
                    encoding: "utf-8",
                })
            )
        )
    );

    it('Initializes program accounts', async () => {
        await provider.connection.requestAirdrop(
            payer.publicKey,
            anchor.web3.LAMPORTS_PER_SOL * 10
        );

        ticket = await token.createMint(
            provider.connection,
            payer, // fee payer
            payer.publicKey, // mint authority
            payer.publicKey, // owner
            0 // decimals
        );

        receiver_token = await token.createAssociatedTokenAccount(
            provider.connection,
            payer, // fee payer
            ticket, // mint
            payer.publicKey // owner,
        );
        source_token =
            await token.getOrCreateAssociatedTokenAccount(
                provider.connection,
                payer, // fee payer
                token.NATIVE_MINT, // mint
                payer.publicKey // owner,
        );
        destinationCollateralAccount_token =
            await token.getOrCreateAssociatedTokenAccount(
                provider.connection,
                payer, // fee payer
                new anchor.web3.PublicKey("FzwZWRMc3GCqjSrcpVX3ueJc6UpcV6iWWb7ZMsTXE3Gf"), // mint
                payer.publicKey // owner,
        );
        console.log("ACC ", source_token)
        console.log("ACC ", receiver_token)
        console.log("ACC ", destinationCollateralAccount_token)
    });

    it('Initializes', async () => {
        const [userAccount, userAccountBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [anchor.utils.bytes.utf8.encode("nolosslottery"),
                    payer.publicKey.toBuffer(),],
                nolosslottery.programId
            );

        try {
            await nolosslottery.rpc.initUserDeposit(
                userAccountBump,
                {
                    accounts: {
                        signer: payer.publicKey,
                        userDepositAccount: userAccount,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    },
                });

            const userState = await nolosslottery.account.userDeposit.fetch(userAccount);
            assert.ok(userState.total.toString() == "0");
        } catch (e) { } // already initialized
    });

    it('Deposits and gets tickets', async () => {
        const [userAccount, userAccountBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [anchor.utils.bytes.utf8.encode("nolosslottery"),
                    payer.publicKey.toBuffer(),],
                nolosslottery.programId
            );

        let amount = new anchor.BN(1);

        await nolosslottery.rpc.deposit(amount, {
            accounts: {
                sourceLiquidity: source_token.address,
                destinationCollateralAccount: destinationCollateralAccount_token.address,
                transferAuthority: payer.publicKey,

                userDepositAccount: userAccount,

                sender: payer.publicKey, // mint authority
                receiverTicket: receiver_token,
                ticket: ticket, // mint
                tokenProgram: token.TOKEN_PROGRAM_ID,
            },
        })
        console.log("Collateral balance: ", await nolosslottery
            .provider.connection.getTokenAccountBalance(destinationCollateralAccount_token.address));
        console.log("User token balance: ", await nolosslottery
            .provider.connection.getTokenAccountBalance(receiver_token));
        console.log("User deposit state: ", await nolosslottery
            .account.userDeposit.fetch(userAccount));
    })

    it('Withdraws and burns tickets', async () => {
        const [userAccount, userAccountBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [anchor.utils.bytes.utf8.encode("nolosslottery"),
                    payer.publicKey.toBuffer(),],
                nolosslottery.programId
            );

        let amount = new anchor.BN(1);

        await nolosslottery.rpc.withdraw(amount, {
            accounts: {
                sourceCollateralAccount: destinationCollateralAccount_token.address,
                destinationLiquidity: source_token.address,
                transferAuthority: payer.publicKey,

                userDepositAccount: userAccount,

                sender: payer.publicKey, // mint authority
                senderTicket: receiver_token,
                ticket: ticket, // mint
                tokenProgram: token.TOKEN_PROGRAM_ID,
            },
        })
        console.log("Collateral balance: ", await nolosslottery
            .provider.connection.getTokenAccountBalance(destinationCollateralAccount_token.address));
        console.log("User token balance: ", await nolosslottery
            .provider.connection.getTokenAccountBalance(receiver_token));
        console.log("User deposit state: ", await nolosslottery
            .account.userDeposit.fetch(userAccount));
    })
});