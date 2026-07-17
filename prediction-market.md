# OmenMarketMaker: a self-custody prediction market on ERC-20 outcome tokens

I like Polymarket. It proved that on-chain prediction markets can be liquid, and that people will actually use them. Two things about it pull me toward a different design.

The first is custody. Polymarket positions are conditional tokens that trade through an order book the company runs off-chain. Your position lives on-chain, but the matching engine and the listing decisions sit with one operator. I want a market where a share is a plain ERC-20 token in your own wallet, tradable on any DEX, usable as collateral in any lending pool, with no operator able to freeze or delist it.

The second is resolution. The hardest part of a prediction market is not the trading. It is deciding who won. Polymarket settles through UMA, and a handful of markets have ended in public fights where large token holders pushed a result that users disputed. That is the same failure I wrote about in the juror-court design, so OmenMarketMaker uses DemoThemis as its oracle.

Here is the shape of it.

For a binary question, the contract issues two ERC-20 tokens, YES and NO. Deposit one DAI and you mint one YES and one NO. Hand back one of each and you redeem one DAI. A YES and a NO together are always worth one DAI, so a YES on its own trades somewhere between zero and one, and that price is the crowd's estimate of the probability.

Trading needs no order book. Put YES and DAI into a standard automated market maker and let people swap. Because the outcome tokens are ordinary ERC-20s, every tool that already exists for ERC-20s works on the first day. A lending market can take YES as collateral. A vault can build a strategy around it. Someone in any country with a wallet can hold it without an account on our site, because there is no account to open.

When the question resolves, the oracle reports the result. If it is YES, every YES token redeems for one DAI and every NO token goes to zero. Winners withdraw collateral straight from the contract. Nobody has to trust us to pay, because we never held the money. It sat in the contract the entire time.

The oracle choice matters most right here, because resolution is where manipulation pays best. If you hold a million dollars of NO, you have a million reasons to make the oracle say NO. A token-stake oracle lets you convert money into resolution power directly, which is why those Polymarket fights happened in the first place. A personhood court cuts that wire. You cannot buy the jury, because the jury is people, chosen at random, voting in private. The cost of bending a result stops tracking the size of your bet.

What I am still working out.

Liquidity splits across tokens. Every market mints its own YES and NO, so a thousand markets is two thousand shallow pools. Shared collateral and a router that mints sets on demand help, but getting early liquidity going is hard.

Resolution is slower than a centralized call. An optimistic window plus a possible jury runs in hours or days, not seconds. For questions that settle slowly that is fine. For very short-dated markets it is not, and I would rather say so than hide it.

Then the obvious one. A market anyone can enter with no account is exactly what regulators ask about. I would rather design openly for that conversation than ship something that quietly leans on a gatekeeper while claiming it has none.

The bet underneath is small and stubborn. Put the shares in the user's wallet as ordinary tokens, and put the resolution in the hands of people who cannot be bought. The rest is plumbing.
