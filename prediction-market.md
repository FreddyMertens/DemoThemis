# OmenMarketMaker: a self-custody prediction market on ERC-20 outcome tokens

I like Polymarket. It proved that on-chain prediction markets can be liquid, and that people will actually use them. Two things about it pull me toward a different design.

The first is custody. Polymarket positions are conditional tokens that trade through an order book the company runs off-chain. Your position lives on-chain, but the matching engine and the listing decisions sit with one operator. I want a market where a share is a plain ERC-20 token in your own wallet, tradable on any DEX, usable as collateral in any lending pool, with no operator able to freeze or delist it.

The second is resolution. The hardest part of a prediction market is not the trading. It is deciding who won. Polymarket settles through UMA, and a handful of markets have ended in public fights where large token holders pushed a result that users disputed. That is the same failure I wrote about in the juror-court design, so OmenMarketMaker uses DemoThemis as its oracle.

Here is the shape of it.

For a binary question, every deposit becomes YES or NO collateral in one parimutuel pool. Before trading, the market locks the question, evidence rules, earliest request time, objective close condition, final backstop, and fee-policy version. It does not estimate or collect a jury reserve.

Once the pool passes its liquidity checks, positions can graduate into ordinary ERC-20 YES and NO tokens. Court funding is not a graduation gate. The tokens are variable-redemption claims: after a final YES or NO ruling they share the collateral remaining after pro-rata reimbursement of the caller's court-fee bond and the separately disclosed market fee; after final insufficient information, each side retains its full backing.

Trading needs no order book. Put YES and DAI into a standard automated market maker and let people swap. Because the outcome tokens are ordinary ERC-20s, every tool that already exists for ERC-20s works on the first day. A lending market can take YES as collateral. A vault can build a strategy around it. Someone in any country with a wallet can hold it without an account on our site, because there is no account to open.

When resolution becomes eligible, anyone may request it by posting the exact deterministic court fee as a resolution bond. In one transaction the market freezes, pays DemoThemis from that bond, locks the evidence, and opens the case before any juror is drawn.

A final YES or NO ruling reimburses the caller from YES and NO collateral pro-rata, then winners divide the remaining pool after the separate OmenMarketMaker fee. A final insufficient-information ruling does not reimburse the bond or charge the pool; before the backstop the market can reopen, and at the backstop it voids with each side's full backing intact. If the deterministic fee is at least the pool, no case opens and the market follows its precommitted cancellation rule.

The oracle choice matters most right here, because resolution is where manipulation pays best. If you hold a million dollars of NO, you have a million reasons to make the oracle say NO. A token-stake oracle lets you convert money into resolution power directly, which is why those Polymarket fights happened in the first place. A personhood court cuts that wire. You cannot buy the jury, because the jury is people, chosen at random, voting in private. The cost of bending a result stops tracking the size of your bet.

What I am still working out.

Liquidity splits across tokens. Every market mints its own YES and NO, so a thousand markets is two thousand shallow pools. Shared collateral and a router that mints sets on demand help, but getting early liquidity going is hard.

Resolution is slower than a centralized call. Every accepted resolution request has already paid a verified-human panel from the caller's bond, then waits for private ballots and any separately funded appeal, so finality runs in hours or days rather than seconds. A tiny market may open immediately, but if its pool cannot reimburse the deterministic fee after a directional ruling, the backstop cancellation rule applies instead of promising subsidized human resolution.

Then the obvious one. A market anyone can enter with no account is exactly what regulators ask about. I would rather design openly for that conversation than ship something that quietly leans on a gatekeeper while claiming it has none.

The bet underneath is small and stubborn. Put the shares in the user's wallet as ordinary tokens, and put the resolution in the hands of people who cannot be bought. The rest is plumbing.
