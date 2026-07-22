# OmenMarketMaker: a self-custody prediction market on ERC-20 outcome tokens

I like Polymarket. It proved that on-chain prediction markets can be liquid, and that people will actually use them. Two things about it pull me toward a different design.

The first is custody. Polymarket positions are conditional tokens that trade through an order book the company runs off-chain. Your position lives on-chain, but the matching engine and the listing decisions sit with one operator. I want a market where a share is a plain ERC-20 token in your own wallet, tradable on any DEX, usable as collateral in any lending pool, with no operator able to freeze or delist it.

The second is resolution. The hardest part of a prediction market is not the trading. It is deciding who won. Polymarket settles through UMA, and a handful of markets have ended in public fights where large token holders pushed a result that users disputed. That is the same failure I wrote about in the juror-court design, so OmenMarketMaker uses DemoThemis as its oracle.

Here is the shape of it.

For a binary question, deposits begin as YES or NO positions in one parimutuel pool. Before the first bet, the market publishes a work-based jury target and a reserve contribution percentage bounded by the disclosed maximum. Every deposit contributes at that same proportional rate, including deposits made after the target is reached. The remainder is outcome collateral, so the reserve is never a hidden haircut. The target is a funding gate rather than a collection cap: after the actual jury payment, any surplus reserve returns to every YES and NO position pro-rata, regardless of the winning outcome.

Once the pool passes its liquidity checks **and the jury reserve is fully funded**, positions can graduate into ordinary ERC-20 YES and NO tokens. A complete YES/NO set is backed by the net outcome collateral recorded at graduation. The interface keeps the reserve contribution, market fee, and redeemable backing separate so a displayed one-dollar claim never quietly loses part of its backing later.

Trading needs no order book. Put YES and DAI into a standard automated market maker and let people swap. Because the outcome tokens are ordinary ERC-20s, every tool that already exists for ERC-20s works on the first day. A lending market can take YES as collateral. A vault can build a strategy around it. Someone in any country with a wallet can hold it without an account on our site, because there is no account to open.

When the question closes, the contract checks funding before it asks the oracle anything. If the reserve covers the locked jury price, DemoThemis is paid automatically, a jury is drawn, and the winning tokens redeem from the remaining outcome collateral after the separately disclosed market fee. Any reserve not used by the court returns to holders proportionally.

If the reserve is short, the creator receives one fixed top-up window. Without a complete top-up, no jury is drawn and no market fee is charged. The pooled market expires and returns the backing of every YES and NO position at its recorded purchase price. Underfunded pools cannot tokenize, which keeps this unwind simple even when a market began with only ten cents.

The oracle choice matters most right here, because resolution is where manipulation pays best. If you hold a million dollars of NO, you have a million reasons to make the oracle say NO. A token-stake oracle lets you convert money into resolution power directly, which is why those Polymarket fights happened in the first place. A personhood court cuts that wire. You cannot buy the jury, because the jury is people, chosen at random, voting in private. The cost of bending a result stops tracking the size of your bet.

What I am still working out.

Liquidity splits across tokens. Every market mints its own YES and NO, so a thousand markets is two thousand shallow pools. Shared collateral and a router that mints sets on demand help, but getting early liquidity going is hard.

Resolution is slower than a centralized call. Every market that actually enters DemoThemis has already funded a verified-human panel, then waits for private ballots and any funded appeal, so finality runs in hours or days rather than seconds. A tiny market may open immediately, but it is never promised human resolution unless deposits or a creator top-up cover the jury's natural price.

Then the obvious one. A market anyone can enter with no account is exactly what regulators ask about. I would rather design openly for that conversation than ship something that quietly leans on a gatekeeper while claiming it has none.

The bet underneath is small and stubborn. Put the shares in the user's wallet as ordinary tokens, and put the resolution in the hands of people who cannot be bought. The rest is plumbing.
