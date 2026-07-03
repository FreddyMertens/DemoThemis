# UMA and Polymarket Resolution Failures: Reference Review

Research date: 2026-07-03

Target passage: `juror-court.html`, line 124:

> This is not a thought experiment. Large UMA holders have pushed disputed Polymarket resolutions through against what many traders read as plain reality, and the system behaved exactly as designed while they did it. Weight followed the wallet. The court was for sale and somebody shopped.

## Bottom line

The passage is directionally supported, but it should reference the cleanest examples rather than implying every controversial UMA resolution was the same kind of failure.

Best examples to cite in the chapter:

1. Strategy / MicroStrategy Bitcoin sale, May 2026. Cleanest "plain reality" case. Strategy's 8-K said 32 BTC were sold during May 26-31, but the May 31 Polymarket market resolved No after disputes and final review. This is the strongest example that a correct event prediction can lose on resolution mechanics.
2. Ukraine mineral deal, March 2025. Cleanest "weight followed the wallet" case. Reporting tied the premature Yes resolution to one UMA whale using three accounts and about 5 million UMA, roughly 25% of the vote.
3. Zelenskyy suit, June/July 2025. Biggest public scandal. Photos and major outlets described the outfit as a suit, but the market resolved No. It is less clean than Strategy because "suit" is inherently subjective, but the size and public backlash make it powerful.

Useful secondary reference:

4. Barron Trump / DJT, June 2024. UMA resolved No, but Polymarket publicly said UMA got it wrong and refunded Yes holders. This is useful because it shows even Polymarket has treated UMA as capable of wrong outcomes. It is not as good for the exact sentence because Polymarket intervened.

Do not lead with the Ethereum ETF, Trump-Xi call, Israel-Hezbollah, US-Iran, Clavicular, or "US forces enter Iran" examples unless the text is widened from "plain reality" to "ambiguous, high-stakes resolution fights." Those cases are useful pattern evidence, but each has a stronger rule-interpretation defense.

## How Polymarket resolution works

Polymarket's own docs say markets use UMA's Optimistic Oracle for permissionless resolution: anyone can propose an outcome, and anyone can dispute it if they think it is wrong.

Source: https://docs.polymarket.com/concepts/resolution

Galaxy Research describes the escalation path this way: repeated disputes go to UMA's Data Verification Mechanism, a token-weighted vote that clears over roughly 48 to 96 hours.

Source: https://www.galaxy.com/insights/research/strategy-bitcoin-sale-polymarket-resolution-dispute-may-2026

WSJ and Barron's both reported structural concentration and conflicts:

- WSJ: in most disputes, more than 50% of votes are concentrated in the 10 largest wallets; at least 60% of active UMA voters could be linked to Polymarket accounts; more than 300 disputes, nearly one in five, had at least one UMA voter with a financial stake in the outcome.
- Barron's: in a random sample of 50 UMA-resolved Polymarket predictions over four months, 36 included UMA voters with active bets on the markets they were voting to resolve, and those votes aligned with their market positions.
- Bloomberg, as summarized by NY Post and Yahoo Finance: nine wallets accounted for roughly half of all UMA tokens used to vote on Polymarket resolutions over three years.

Sources:

- WSJ: https://www.wsj.com/finance/polymarket-bet-disputes-fb1b8c6a
- Barron's: https://www.barrons.com/articles/polymarket-prediction-market-disputes-uma-crypto-e3eae345
- NY Post summary of Bloomberg: https://nypost.com/2026/05/26/business/nine-anonymous-crypto-owners-hold-massive-sway-over-polymarket-outcomes-drawing-traders-ire-report/
- Yahoo Finance summary of Bloomberg: https://finance.yahoo.com/markets/crypto/articles/nine-anonymous-crypto-owners-hold-201841979.html

## Confirmed / best-fit examples

### 1. Strategy / MicroStrategy sells Bitcoin by May 31, 2026

Why it matters: This is the cleanest "plain reality" example.

What happened:

- The market asked whether MicroStrategy / Strategy sold any Bitcoin by May 31, 2026.
- Strategy filed an 8-K on June 1 disclosing a sale of 32 BTC during May 26-31.
- Galaxy Research says the original market wording was event-based and did not require public confirmation by the deadline.
- Polymarket later added context saying confirmation after the market time frame did not qualify.
- The market had two No proposals, both disputed, then final review, and resolved No.
- Galaxy's assessment: the sale happened in the market window, and Yes holders predicted the event correctly but lost.

Evidence:

- Galaxy Research: https://www.galaxy.com/insights/research/strategy-bitcoin-sale-polymarket-resolution-dispute-may-2026
- Polymarket market page: https://polymarket.com/event/microstrategy-sell-any-bitcoin-in-2025
- Coindesk: https://www.coindesk.com/markets/2026/06/04/polymarket-says-no-for-may-yes-for-june-after-strategy-s-recent-bitcoin-sale
- The Defiant: https://thedefiant.io/news/markets/usd85m-polymarket-dispute-over-strategy-s-may-bitcoin-sale-puts-uma-s-token-voting-oracle-on

How strong is it for the chapter: Very strong. It supports "plain reality" better than any other case because the company's filing states the sale date. The caveat is that the controversy also involves Polymarket's added context, not only UMA whale voting.

Recommended wording:

> In 2026, Strategy disclosed that it had sold Bitcoin during the market window, yet the corresponding Polymarket contract resolved No after the dispute process.

### 2. Ukraine agrees to Trump mineral deal before April, March 2025

Why it matters: This is the cleanest "wallet weight moved the answer" example.

What happened:

- The market asked whether the United States and Ukraine agreed to a rare-earth/mineral deal by March 31, 2025.
- Polymarket's page shows two Yes proposals, two disputes, and a final Yes outcome.
- The Defiant reported that the market was supposed to resolve when a deal was reached or by March 31, but was pushed to a premature Yes.
- The same report says a single UMA whale using three accounts and 5 million UMA cast about 25% of votes in favor of Yes.
- Polymarket reportedly called the situation unprecedented and said it was not part of the future it wanted to build, but did not refund bettors.

Evidence:

- Polymarket market page: https://polymarket.com/event/ukraine-agrees-to-give-trump-rare-earth-metals-before-april
- The Defiant: https://thedefiant.io/news/defi/polymarket-s-usd7m-ukraine-mineral-deal-debacle-traced-to-oracle-whale
- Cointelegraph/TradingView: https://www.tradingview.com/news/cointelegraph:6fe4b4ae3094b:0-polymarket-faces-scrutiny-over-7m-ukraine-mineral-deal-bet/
- Orochi Network explainer: https://orochi.network/blog/oracle-manipulation-in-polymarket-2025

How strong is it for the chapter: Very strong for "weight followed the wallet." It is the most direct reported governance-attack example. It is less clean than Strategy on "plain reality" because timing and official confirmation details matter, but it is the best "UMA whale pushed a disputed result" reference.

Recommended wording:

> In the 2025 Ukraine mineral-deal market, reporting traced a premature Yes resolution to one UMA whale voting through three accounts with roughly 25% of the vote.

### 3. Zelenskyy wears a suit before July, June/July 2025

Why it matters: Biggest public example and easiest for readers to understand.

What happened:

- The Polymarket market asked whether Volodymyr Zelenskyy was photographed or videotaped wearing a suit between May 22 and June 30, 2025.
- The Polymarket market page shows the outcome path: Yes proposed, disputed; No proposed, disputed; final outcome No.
- WIRED reported that Zelenskyy appeared at a pre-NATO dinner in a black jacket, shirt, and trouser combination, and that multiple outlets described it as a suit.
- WIRED also reported that UMA voters were saying No by a seemingly insurmountable margin, and noted criticism that token whales and delegation concentrate voting power.
- Coindesk and The Defiant covered the backlash and allegations around UMA validators.

Evidence:

- Polymarket market page: https://polymarket.com/event/will-zelenskyy-wear-a-suit-before-july
- WIRED: https://www.wired.com/story/volodymyr-zelensky-suit-polymarket-rebellion/
- Coindesk: https://www.coindesk.com/markets/2025/07/07/polymarket-embroiled-in-usd160m-controversy-over-whether-zelensky-wore-a-suit-at-nato
- The Defiant: https://thedefiant.io/news/nfts-and-web3/polymarket-controversy-heats-up-after-the-zelenskyy-suit-market-resolves
- Cryptopolitan: https://www.cryptopolitan.com/polymarket-community-protests-oracle-vote-by-uma-whales-claims-market-manipulation/

How strong is it for the chapter: Strong as a public scandal and high-volume dispute. Caveat: "suit" is subjective, so this is weaker than Strategy as proof of a factually wrong answer. It is still excellent for showing that token voting is a bad court for messy social facts.

Recommended wording:

> In the Zelenskyy suit market, photos and major-media descriptions were not enough to stop a No resolution after the UMA dispute path.

### 4. Barron Trump involved in DJT, June 2024

Why it matters: Useful because Polymarket itself contradicted UMA.

What happened:

- The market asked whether a preponderance of evidence suggested Barron Trump was involved in creating the Solana token DJT.
- Polymarket's market page shows No proposed twice, both disputed, and final outcome No.
- DL News reported that UMA voters overwhelmingly agreed the available evidence did not show Barron's involvement.
- Polymarket then publicly said UMA got the resolution wrong and refunded Yes holders, saying it was conclusive that Barron was involved in some way.

Evidence:

- Polymarket market page: https://polymarket.com/event/was-barron-involved-in-djt
- DL News: https://www.dlnews.com/articles/defi/polymarket-slams-vote-on-barron-trump-and-djt-token/
- Crypto.news: https://crypto.news/polymarket-reverses-oracle-decision-on-barron-trumps-involvement-in-djt-meme-coin/
- The Defiant: https://thedefiant.io/news/tradfi-and-fintech/polymarket-reportedly-eying-usd50m-fundraise-and-token-launch
- Polymarket X post: https://x.com/Polymarket/status/1806479362377814378

How strong is it for the chapter: Moderate. It is strong evidence that Polymarket has believed UMA can get an outcome wrong. It is weaker for the exact "court was for sale" line because Polymarket intervened and the underlying question depended on messy evidence.

Recommended wording:

> In 2024, Polymarket itself said UMA got the Barron/DJT market wrong and refunded Yes holders.

## Adjacent examples and why not to lead with them

### Ethereum ETF approved by May 31, 2024

What happened:

- The market asked whether any spot Ethereum ETF received SEC approval by May 31, 2024.
- Polymarket's market page shows Yes proposed twice, both disputed, and final outcome Yes.
- The dispute turned on whether 19b-4 approvals counted before S-1 approvals and trading launch.

Evidence:

- Polymarket market page: https://polymarket.com/event/ethereum-etf-approved-by-may-31
- DL News preview: https://www.dlnews.com/articles/web3/ethereum-etf-ok-may-prompt-11-million-row-on-polymarket/
- Cointelegraph/TradingView: https://www.tradingview.com/news/cointelegraph:bd5ed99b9094b:0-polymarket-gets-backlash-over-approved-outcome-on-13m-ethereum-etf-bet/

Why not lead with it: It is a real dispute, but not a clean "plain reality" failure. "Approved" was underspecified. UMA's Yes has a plausible defense because the SEC did approve the 19b-4 filings.

### Trump speaks with Xi in March 2026

What happened:

- Barron's reported a $12 million market on whether Trump spoke to Xi in March.
- Trump publicly said he had spoken with Xi, but Polymarket said there was not a consensus of credible reporting and the market resolved No.
- Barron's found two UMA voters in that market also held No positions.

Evidence:

- Barron's: https://www.barrons.com/articles/polymarket-prediction-market-disputes-uma-crypto-e3eae345
- UMA dispute page surfaced in search: https://oracle.uma.xyz/?eventIndex=574&project=Polymarket&transactionHash=0x0d2212f0fe28480856cc83ed833bb31c9356dd6caaaba6d6e5f2c9286f2b7ecf
- Prediction News: https://predictionnews.com/news/polymarket-overrules-uma-voters-in-trump-xi-call-market

Why not lead with it: Useful for conflicts of interest, but not as clean for "plain reality" because the contract apparently required credible reporting, not only Trump's statement.

### Israel-Hezbollah ceasefire / Lebanon truce, 2026

What happened:

- WSJ reported a trader, Garrick Wilhelm, lost a bet on whether Israel and Hezbollah would reach a ceasefire.
- The dispute was whether Israel's truce with the Lebanese government counted as a ceasefire with Hezbollah.
- WSJ reported that 87% of UMA tokens voted that it did.

Evidence:

- WSJ: https://www.wsj.com/finance/polymarket-bet-disputes-fb1b8c6a
- CryptoNews summary: https://cryptonews.com/news/polymarket-oracle-risk-cftc-regulatory-scrutiny/
- Yellow.com summary: https://yellow.com/news/polymarket-7m-ukraine-israel-bet

Why not lead with it: Good structural evidence, but contract interpretation is genuinely hard because Hezbollah's political/military/legal role in Lebanon is contested.

### Clavicular pregnancy in 2026

What happened:

- WSJ reported a dispute over whether livestreamer Clavicular's pregnancy announcement was credible under the rules.
- UMA ruled that it was credible.
- Other reports noted around $16 million in volume and two proposal/dispute cycles.

Evidence:

- WSJ: https://www.wsj.com/finance/polymarket-bet-disputes-fb1b8c6a
- Polymarket market page: https://polymarket.com/event/clavicular-pregnancy-in-2026
- Forbes: https://www.forbes.com/sites/digital-assets/2026/04/30/inmates-taking-the-asylum-polymarkets-16m-clavicular-bet/
- Binance summary: https://www.binance.com/en/square/post/05-01-2026-polymarket-s-pregnancy-market-faces-dispute-over-resolution-318271416759330

Why not lead with it: It is colorful, but it is not relevant to the court chapter unless the point is "subjective evidence disputes become vote fights."

### US forces enter Iran by April 30, 2026

What happened:

- WSJ reported a $269 million dispute over whether US forces "entered" Iran.
- A brief special-forces rescue mission was reportedly ruled as satisfying the contract.
- Critics argued the market was meant to measure serious military intervention.

Evidence:

- WSJ: https://www.wsj.com/world/middle-east/polymarket-iran-war-bets-975909a3
- The Week summary: https://www.theweek.in/news/middle-east/2026/04/11/amid-us-iran-stalemate-dollar269-million-question-divides-polymarket-did-american-forces-enter-tehran.html

Why not lead with it: Large and important, but the word "enter" makes it a rules-definition fight more than an obvious factual miss.

### US / Israel strikes Iranian facilities by March 31, 2026

What happened:

- Bloomberg reporting, summarized by NY Post, said UMA owners voted on a contract tied to whether the US and Israel struck Iranian facilities, with odds moving as traders tried to predict UMA voters.
- The reported issue is concentration and market reaction to expected oracle voting, not necessarily a final outcome plainly contrary to reality.

Evidence:

- NY Post summary of Bloomberg: https://nypost.com/2026/05/26/business/nine-anonymous-crypto-owners-hold-massive-sway-over-polymarket-outcomes-drawing-traders-ire-report/
- Polymarket market family: https://polymarket.com/event/what-will-the-usisrael-target-in-iran-by-march-31

Why not lead with it: It supports the "watch the whales" dynamic, not a clean wrong-resolution claim.

## Most damning whale-capture evidence

If the claim is specifically "UMA whales corrupted or captured the resolution process," these are the examples to lead with. The important distinction: some cases prove a bad outcome, while others prove whale influence. The strongest corruption argument needs both conduct and consequence.

### 1. Ukraine mineral deal

This is the most obvious one. Reporting ties the disputed Yes resolution to a single UMA whale voting through three accounts with about 5 million UMA, roughly a quarter of the vote. The alleged mechanism is visible: concentrated token weight, split across accounts, pushing a disputed outcome that Polymarket reportedly treated as unprecedented.

Why it is damning: it is not just a confusing market. It has a named pattern of capture: one large UMA holder, multiple accounts, large vote share, disputed final result.

### 2. Structural WSJ / Barron's conflict reporting

This is not one market, but it may be the most damaging support for the broader critique. WSJ and Barron's reported recurring conflicts between UMA voters and Polymarket positions, with large-wallet concentration and UMA voters sometimes betting on the very outcomes they helped resolve.

Why it is damning: it makes the problem look structural rather than anecdotal. A single scandal can be dismissed as messy edge-case adjudication. Repeated overlap between voter power and financial exposure is much harder to wave away.

### 3. Zelenskyy suit

This is the most legible example for normal readers: photos existed, major outlets described the outfit as a suit, and the market still resolved No after the UMA dispute path. It became a public referendum on whether a token vote can handle ordinary factual judgment.

Why it is damning: it shows how the system performs when common-sense evidence collides with concentrated token voting. The caveat is that "suit" is subjective, so it is less clean than Ukraine for corruption and less clean than Strategy for factual wrongness.

### 4. Strategy Bitcoin sale

This is the strongest "plain reality lost" example, because Strategy disclosed that it sold Bitcoin during the market window and the market still resolved No. But it is not the strongest corruption-by-whales example, because the current evidence points more to bad resolution mechanics and late clarification than to a specific whale capture campaign.

Why it still belongs: pair it with Ukraine. Ukraine shows token-weighted capture; Strategy shows why that capture matters: correct traders can still lose when the resolution layer defines reality away.

Conclusion: lead with Ukraine if the sentence says "whales corrupted the court." Lead with Strategy if the sentence says "the court reached an answer contrary to reality." Use Zelenskyy as the reader-friendly public scandal, and use WSJ/Barron's as the evidence that this is not one weird market but a recurring conflict-of-interest problem.

## Suggested replacement passage

Current text is vivid, but slightly overgeneralized. A safer version:

> This is not a thought experiment. In the 2025 Ukraine mineral-deal market, reporting traced a premature Polymarket resolution to a single UMA whale voting through three accounts with roughly a quarter of the vote. In 2026, Strategy disclosed that it had sold Bitcoin during the market window, yet the corresponding Polymarket contract resolved No after the dispute process. The mechanism behaved as designed: token weight became adjudication weight. The problem is not a bug in UMA. It is the premise.

Shorter version:

> This is not a thought experiment. Polymarket has already seen disputed UMA resolutions where the answer traders thought reality required lost to token-weighted voting: the 2025 Ukraine mineral-deal market, the 2025 Zelenskyy suit market, and the 2026 Strategy Bitcoin-sale market. Weight followed the wallet. That is exactly the failure this court is designed to remove.

Best footnote/source bundle for the chapter:

- Strategy: Galaxy Research plus Polymarket market page.
- Ukraine minerals: The Defiant plus Polymarket market page.
- Zelenskyy suit: WIRED or Coindesk plus Polymarket market page.
- Structural concentration: WSJ or Barron's.
