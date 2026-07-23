(function () {
  "use strict";

  var STAGES = [
    {
      title: "Open the market",
      sub: "A written rule and opening liquidity create escrow.",
      mission: "Set rules and liquidity",
      text: "A market starts when its creator writes the exact resolve condition and locks any amount beside YES, NO, or both. There is no listing committee or hidden minimum viable liquidity.",
      nodes: ["open"],
      features: ["instant"],
      components: ["escrow"],
      tokens: ["Opening liquidity in escrow"],
      pot: .1,
      yes: 1,
      claims: "Opening YES/NO liquidity",
      trade: "held in the market until it is liquid",
      court: "No dispute yet",
      panel: "no dispute yet",
      keys: 0,
      fees: 0,
      loop: ["cases"],
      log: "The market opens with a public resolution rule and creator-funded liquidity.",
      actions: ["Publish market"]
    },
    {
      title: "The crowd prices it",
      sub: "Every purchase moves the odds.",
      mission: "Buy one outcome",
      text: "Choose YES or NO, enter an amount, and see the market odds respond. Entering early gives a winning position a larger share when the winnings are divided.",
      nodes: ["open", "pool"],
      features: ["instant"],
      components: ["escrow"],
      tokens: ["YES position", "NO position"],
      pot: 1840,
      yes: .62,
      claims: "YES/NO app balances",
      trade: "odds move with every purchase",
      court: "No dispute yet",
      panel: "no dispute yet",
      keys: 0,
      fees: 37,
      loop: ["cases", "fees"],
      log: "One clear purchase shows the price move and the early-entry reward.",
      actions: ["Buy YES for $50"]
    },
    {
      title: "The market graduates",
      sub: "Pool claims become wallet tokens.",
      mission: "Deposit YES to earn yield",
      text: "Once the pool proves durable two-sided participation, sufficient depth, and enough time active, its claims convert into plain ERC-20 YES and NO tokens. This step deposits wallet-held YES into protected lending.",
      nodes: ["open", "pool", "robust", "tokens"],
      features: ["instant", "tokens"],
      components: ["escrow"],
      tokens: ["YES ERC-20", "NO ERC-20", "lending position"],
      pot: 42000,
      yes: .57,
      claims: "Wallet YES/NO tokens",
      trade: "lend YES or NO for variable borrowing interest",
      court: "No dispute yet",
      panel: "no dispute yet",
      keys: 0,
      fees: 840,
      loop: ["cases", "fees"],
      log: "Pool claims become wallet assets before order-book trading begins.",
      actions: ["Deposit 250 YES"]
    },
    {
      title: "ERC-20 orders trade",
      sub: "The mature market uses one order book.",
      mission: "Buy at the best available prices",
      text: "After graduation, sellers place wallet-held ERC-20 YES tokens into limit orders. Your 740-YES purchase fills 500 at 58 cents and the remaining 240 from the next order at 60 cents. A higher 64-cent order is not used.",
      nodes: ["open", "pool", "fixed", "robust", "tokens"],
      features: ["instant", "fixed", "tokens"],
      components: ["escrow"],
      tokens: ["500 YES at 58c", "240 YES at 60c"],
      pot: 42000,
      yes: .61,
      claims: "ERC-20 limit orders",
      trade: "cheapest limit orders fill first",
      court: "No dispute yet",
      panel: "no dispute yet",
      keys: 0,
      fees: 840,
      loop: ["cases", "fees"],
      log: "The order book trades only graduated ERC-20 claims at exact prices.",
      actions: ["Buy 740 YES at best prices"]
    },
    {
      title: "Optional private room",
      sub: "A separate market path.",
      mission: "Create a private wager",
      text: "The run briefly previews a separate invite-only market. Two friends set fixed odds and lock matched collateral; when review is eligible, either participant or another eligible caller can post the exact court fee as a resolution bond.",
      nodes: ["open", "pool", "fixed", "private", "tokens"],
      features: ["instant", "fixed", "tokens", "private"],
      components: ["escrow"],
      tokens: ["Invite link", "Private YES", "Private NO"],
      pot: 52000,
      yes: .6,
      claims: "Private YES/NO bet",
      trade: "only invited people see it",
      court: "No dispute yet",
      panel: "DemoThemis at close",
      keys: 0,
      fees: 1040,
      loop: ["cases", "fees"],
      log: "The same neutral machinery works for a public market or a private bet.",
      actions: ["Invite Bob", "Accept & fund room"]
    },
    {
      title: "Optional parlay",
      sub: "A separate multi-market path.",
      mission: "Choose a solver quote",
      text: "The run briefly previews a parlay across two tokenized markets. Solvers compete on a fixed quote and lock the full maximum payout before one tradeable receipt is minted. Protected token lenders earn borrowing interest; separate junior vault capital earns the parlay spread while accepting correlation risk.",
      nodes: ["open", "pool", "fixed", "robust", "tokens", "parlay"],
      features: ["instant", "fixed", "tokens", "private", "parlay"],
      components: ["escrow"],
      tokens: ["One parlay receipt", "Full payout escrow"],
      pot: 81000,
      yes: .54,
      claims: "One parlay claim",
      trade: "solver quote fills or fails as one",
      court: "No dispute yet",
      panel: "no dispute yet",
      keys: 0,
      fees: 1620,
      loop: ["cases", "fees"],
      log: "Solvers provide familiar parlay UX without turning the protocol into the house.",
      actions: ["Place $100 parlay", "Accept $128 cashout"]
    },
    {
      title: "The market needs a ruling",
      sub: "Court-backed resolution begins.",
      mission: "Post the resolution bond",
      text: "The game ends on the field. OmenMarketMaker closes betting under its written rule. An eligible caller posts the exact deterministic court fee as a bond, paying DemoThemis while the $118,000 outcome pool and token accounting remain at OmenMarketMaker.",
      nodes: ["tokens", "parlay", "trade", "request"],
      features: ["instant", "fixed", "tokens", "private", "trade", "parlay"],
      components: ["escrow", "handoff"],
      tokens: ["Caller-funded resolution bond", "Tradeable YES", "Tradeable NO"],
      pot: 118000,
      yes: .91,
      claims: "Wallet tokens still trade",
      trade: "secondary token trading stays live",
      court: "Resolution requested",
      panel: "court fee awaiting lock",
      keys: 0,
      fees: 2360,
      loop: ["cases", "fees", "jurors"],
      log: "Resolution starts only after an eligible caller posts the exact court fee as a bond.",
      actions: ["Post resolution bond"]
    },
    {
      title: "The case crosses the boundary",
      sub: "Only the bond payment crosses.",
      mission: "Lock the case and court fee",
      text: "OmenMarketMaker sends the locked case and the caller-funded resolution bond to DemoThemis. Outcome collateral stays at OmenMarketMaker, and DemoThemis accepts the paid case before any panel is known.",
      nodes: ["trade", "request", "handoff"],
      features: ["instant", "fixed", "tokens", "private", "trade", "parlay"],
      components: ["escrow", "handoff"],
      tokens: ["Locked case", "Bond-paid court fee"],
      pot: 118000,
      yes: .91,
      claims: "Tokens price the court process",
      trade: "claims keep moving",
      court: "Case accepted by DemoThemis",
      panel: "waiting for random jury",
      keys: 0,
      fees: 2360,
      loop: ["cases", "fees", "jurors"],
      log: "The product boundary is explicit: the locked case and caller's bond payment cross it; outcome collateral does not.",
      actions: ["Lock case and court fee"]
    },
    {
      title: "Jury is drawn",
      sub: "Random humans, not tokens.",
      mission: "Roll the sealed die",
      text: "A public randomness beacon draws a panel from verified humans. The app cannot cancel and re-roll when it dislikes the panel, because the draw is bound to the locked case.",
      nodes: ["handoff", "draw"],
      features: ["instant", "fixed", "tokens", "private", "trade", "parlay"],
      components: ["escrow", "handoff", "draw", "personhood"],
      tokens: ["7 drawn seats", "Face proofs"],
      pot: 118000,
      yes: .46,
      claims: "Tokens still live",
      trade: "secondary trading live",
      court: "Random human jury",
      panel: "7 verified people",
      keys: 0,
      fees: 2360,
      loop: ["cases", "fees", "jurors"],
      log: "The case meets the court: one roll, one panel, no whale vote.",
      actions: ["Play bound draw"]
    },
    {
      title: "Ballots are locked",
      sub: "No receipt, no bribe rail.",
      mission: "Cast private votes",
      text: "Each juror clears the live face check, then casts an encrypted ballot. Silent re-keying means a screenshot or encrypted receipt proves nothing to a briber.",
      nodes: ["draw", "ballot"],
      features: ["instant", "fixed", "tokens", "private", "trade", "parlay"],
      components: ["escrow", "handoff", "draw", "personhood", "ballot", "reserve"],
      tokens: ["Encrypted ballots", "Live reserves"],
      pot: 118000,
      yes: .51,
      claims: "Tokens still live",
      trade: "secondary trading live",
      court: "Private voting",
      panel: "7 encrypted ballots",
      keys: 0,
      fees: 2360,
      loop: ["cases", "fees", "jurors"],
      log: "A bought juror can take money and vote honestly, which breaks the bribe contract.",
      actions: ["Seal ballot"]
    },
    {
      title: "First verdict lands",
      sub: "Consequences stay pending.",
      mission: "Publish the tally proof",
      text: "The tally opens only as an aggregate proof. Private reserve updates are computed and proved, but nothing is debited until the last appeal outcome.",
      nodes: ["ballot", "verdict"],
      features: ["instant", "fixed", "tokens", "private", "trade", "parlay"],
      components: ["escrow", "handoff", "draw", "personhood", "ballot", "reserve"],
      tokens: ["Verdict proof", "Pending private updates"],
      pot: 118000,
      yes: .28,
      claims: "Tokens repriced",
      trade: "verdict becomes public proof",
      court: "First verdict",
      panel: "7-person result",
      keys: 0,
      fees: 2360,
      loop: ["cases", "fees", "jurors"],
      log: "The verdict changes prices, but the losing side can still climb.",
      actions: ["Publish aggregate proof"]
    },
    {
      title: "Appeal climbs",
      sub: "The market reconnects to the court.",
      mission: "Crowdfund the 15-seat appeal",
      text: "OmenMarketMaker opens a public funding goal for the next DemoThemis jury. Every contribution is tagged between the service fee and separately escrowed security; reaching the goal before the deadline automatically starts a fresh 15-seat panel.",
      nodes: ["verdict", "appeal", "trade"],
      features: ["instant", "fixed", "tokens", "private", "trade", "parlay"],
      components: ["escrow", "handoff", "draw", "personhood", "ballot", "reserve", "appeal"],
      tokens: ["Crowdfunded bond", "Pro-rata contributor shares", "15-seat appeal"],
      pot: 118000,
      yes: .37,
      claims: "Tokens price appeal risk",
      trade: "appeal stays visible",
      court: "Appeal jury",
      panel: "15 verified people",
      keys: 0,
      fees: 2360,
      loop: ["cases", "fees", "jurors"],
      log: "OmenMarketMaker gathers many direct contributions; DemoThemis independently prices the goal and starts the wider jury only when it is fully funded.",
      actions: ["Review appeal", "Contribute $4,000", "Complete the $31,000 goal"]
    },
    {
      title: "Finality and memory",
      sub: "The case finalizes and teaches.",
      mission: "Publish finality, feed the loop",
      text: "DemoThemis publishes the final appeal proof to OmenMarketMaker. Settlement releases once, juror updates settle privately, and the completed case adds quality evidence.",
      nodes: ["appeal", "final", "keys"],
      features: ["instant", "fixed", "tokens", "private", "trade", "parlay"],
      components: ["escrow", "handoff", "draw", "personhood", "ballot", "reserve", "appeal", "finality", "keys"],
      tokens: ["Finality proof", "Quality evidence", "Private juror updates"],
      pot: 118000,
      yes: .02,
      claims: "Payout received",
      trade: "market closed forever",
      court: "Final",
      panel: "appeal complete",
      keys: 1,
      fees: 2360,
      loop: ["cases", "fees", "jurors", "keys", "rep", "trust"],
      log: "The juror is paid, their private rating learns from the final appealed result, and the market settles without seeing either private update.",
      actions: ["Settle juror account", "Continue to market settlement"]
    }
  ];

  var FOCUS_STEPS = [
    {
      lane: "Market",
      title: "Question opens",
      body: "A written resolve condition, earliest request time, final backstop, fee-policy version, and at least one initial liquidity deposit create the market. The protocol does not need a listing committee or minimum launch size.",
      change: "Market exists",
      why: "Even ten cents can make the question live. Human review starts only when an eligible caller later posts the exact resolution bond.",
      next: "Crowd prices it",
      tone: "market",
      results: ["The dime lands entirely in outcome escrow.", "Resolution funding remains separate until an eligible caller posts the exact bond."]
    },
    {
      lane: "Market",
      title: "Purchases move the odds",
      body: "People buy YES or NO positions. The balance between both sides becomes the visible odds, while earlier entries receive a larger share if they are correct.",
      change: "A $50 position moves YES from 62% to 67%",
      why: "The interface explains the action and benefit before introducing the underlying pricing mechanism.",
      next: "Market graduation",
      tone: "market",
      results: ["YES and NO are presented as a single outcome choice.", "The early-entry reward is translated into a concrete payout-share example.", "The current odds remain the simplest public summary of disagreement."]
    },
    {
      lane: "Claims",
      title: "Pool graduates into ERC-20 claims",
      body: "The pool passes its robustness checks, converts every position into wallet-held YES and NO tokens, and ends pooled trading before the order book opens.",
      change: "Pool claims become wallet assets",
      why: "The product changes trading models at one explicit boundary instead of mixing pool fills with token orders.",
      next: "ERC-20 order book",
      tone: "claim",
      results: ["Court funding is not a graduation check.", "The market graduates into wallet-held YES/NO tokens.", "250 YES is deposited into protected lending; posting a sell order remains a separate, non-yielding action."]
    },
    {
      lane: "Market",
      title: "ERC-20 best-price routing",
      body: "A 740-YES purchase fills 500 wallet-held YES at 58c, then the next 240 YES limit order at 60c. A higher 64c order is skipped.",
      change: "740 ERC-20 YES across two limit orders",
      why: "After graduation, every source is the same transferable token and the book simply fills the cheapest orders first.",
      next: "Private room",
      tone: "market",
      results: ["500 ERC-20 YES fill from the 58c sell order.", "The remaining 240 ERC-20 YES fill from the 60c order.", "The 64c order remains untouched because it is more expensive."]
    },
    {
      lane: "Market",
      title: "Optional private room",
      body: "As a short side path, two counterparties open an invite-only wager. It is separate from the public market, but settlement still uses neutral protocol escrow.",
      change: "Invite-only escrow",
      why: "Private bets get the same arbitration path as public markets.",
      next: "Parlay route",
      tone: "market",
      results: ["The invite opens a private room without exposing the wager to the public book.", "Both sides lock fixed odds into neutral escrow."]
    },
    {
      lane: "Claims",
      title: "Optional parlay",
      body: "As a second side path, protected token lenders earn borrowing interest, junior vaults earn the parlay spread while accepting correlation risk, and permissionless solvers compete to quote the bundle.",
      change: "Fully backed receipt",
      why: "Solver competition creates familiar betting UX without protocol balance-sheet risk.",
      next: "Funded court request",
      tone: "claim",
      results: ["Protected token lending remains separate from junior parlay risk capital.", "The best solver locks the full payout and mints one tradeable receipt.", "Cash-out runs a new auction for that receipt."]
    },
    {
      lane: "Arbitration",
      title: "Bonded resolution request",
      body: "The real-world event has happened. The fee policy calculates the exact court fee and an eligible caller posts it as a resolution bond. OmenMarketMaker atomically pays DemoThemis, freezes the pool snapshot, and opens one case.",
      change: "Bonded case advances",
      why: "Only a caller who posts the deterministic court fee can open the human court path.",
      next: "Product handoff",
      tone: "court",
      results: ["The question, request timing, backstop, and fee-policy version were fixed before betting.", "Every deposit remained collateral; the caller alone supplies the initial court payment."]
    },
    {
      lane: "Arbitration",
      title: "Product handoff",
      body: "OmenMarketMaker sends the locked case and bond-paid court fee to DemoThemis while retaining outcome collateral. DemoThemis accepts the case before the draw.",
      change: "Case accepted",
      why: "The visible handoff keeps custody, pricing, and responsibility clear between the two products.",
      next: "Jury draw",
      tone: "court",
      results: ["Only the case and caller's bond payment cross the boundary.", "Outcome collateral stays at OmenMarketMaker until the signed ruling returns."]
    },
    {
      lane: "Arbitration",
      title: "Sealed jury draw",
      body: "A public randomness beacon draws verified humans for this case. The app cannot keep re-rolling until it likes the panel.",
      change: "7 verified jurors",
      why: "One bound draw prevents panel shopping.",
      next: "Private ballots",
      tone: "court",
      results: ["The beacon locks one draw, so the app cannot shop for a friendlier panel.", "Face checks confirm the drawn seats are present verified humans."]
    },
    {
      lane: "Arbitration",
      title: "Locked ballots",
      body: "Drawn jurors pass a live face check and cast encrypted ballots. Silent re-keying means a screenshot or receipt is not useful to a briber.",
      change: "No useful vote receipt",
      why: "A bribed juror can take money and still vote honestly.",
      next: "Verdict proof",
      tone: "court",
      results: ["Encrypted ballots enter the box and may be silently replaced until the deadline.", "Careless wrong-side votes can reduce pending juror pay after finality."]
    },
    {
      lane: "Finality loop",
      title: "Verdict; updates pending",
      body: "The tally opens as an aggregate proof. Private juror updates and their aggregate totals are proved now, then applied only after the final appeal outcome.",
      change: "First verdict lands",
      why: "Waiting protects an honest dissenter if a larger panel reverses the result.",
      next: "Appeal ladder",
      tone: "final",
      results: ["The aggregate proof lands and reprices the live claims.", "Private updates remain sealed until the appeal ladder ends."]
    },
    {
      lane: "Finality loop",
      title: "Appeal ladder",
      body: "OmenMarketMaker returns the provisional result and opens a public goal for the next bond. Wallets contribute directly to the DemoThemis appeal contract and receive a pro-rata share of whatever that bond later returns.",
      change: "Crowd goal → 15-seat court",
      why: "No single losing wallet must carry the entire appeal quote, while the appeal still starts only after the service fee and security bond are both fully funded.",
      next: "Final proof",
      tone: "final",
      results: ["The user contributes one share from the market result page.", "The crowd completes the goal before the deadline, so the wider jury starts automatically.", "The service fee pays panel work and delay once; security returns on success or is forfeited on failure pro-rata."]
    },
    {
      lane: "Finality loop",
      title: "Quality evidence saved",
      body: "DemoThemis publishes the final proof, settles shielded juror updates, and saves the case. OmenMarketMaker can then settle its market while juror histories remain private.",
      change: "Finality published",
      why: "The market is over, but the court is stronger for the next one.",
      next: "More demand",
      tone: "final",
      results: ["The final proof returns to OmenMarketMaker for settlement.", "Final juror debits, refunds, and rewards settle through private updates with proved public totals.", "The completed case updates the shared juror-quality record without publishing juror histories."]
    }
  ];

  var STEP_GUIDES = [
    {
      label: "Market start",
      headline: "Write the rule and seed the market.",
      look: "The form pairs an exact resolve condition with initial liquidity on YES, NO, or both.",
      use: "Publish once; the live market page opens immediately.",
      notice: "Publishing locks the written rule and initial liquidity into protocol escrow."
    },
    {
      label: "Live pricing",
      headline: "Buy one outcome and watch the odds move.",
      look: "One focused purchase card combines the outcome choice, amount, current odds, early-entry reward, and final action.",
      use: "Choose YES or NO, then buy a $50 position. The same page confirms the result.",
      notice: "An 8% early-entry reward means a winning $50 position is treated like $54 when winnings are divided; it is not guaranteed profit."
    },
    {
      label: "Market graduation",
      headline: "See pool claims become wallet-held tokens.",
      look: "The robustness checks have passed, pooled trading has ended, and the lending page proves YES now exists as a transferable ERC-20 wallet asset.",
      use: "Review the estimate, then deposit 250 YES in one action.",
      notice: "The order book did not create this yield position: the pool converted first, then the wallet-held token became available for lending or trading."
    },
    {
      label: "ERC-20 order book",
      headline: "Buy from the cheapest token orders first.",
      look: "Your 740-YES purchase fills 500 ERC-20 YES at 58c, then 240 at 60c. The higher 64c order is skipped.",
      use: "Buy 740 YES from the best available limit orders.",
      notice: "Every fill is a wallet-held ERC-20 YES token. The original pooled market is no longer a trading source."
    },
    {
      label: "Private wager",
      headline: "Preview an optional invite-only market.",
      look: "The room shows counterparties, editable terms, and the written resolve condition before escrow locks.",
      use: "Invite Bob, then accept and fund the room.",
      notice: "Privacy changes who can see the wager, not the need to fix its outcome rule before funding."
    },
    {
      label: "Parlay route",
      headline: "Preview a fully backed solver parlay.",
      look: "The app shows a two-leg slip; automatic execution shows solver selection, full payout escrow, and one receipt.",
      use: "Place the $100 parlay, watch routing complete automatically, then accept the $128 cashout.",
      notice: "The user chooses the quote; a solver locks the full payout rather than the protocol acting as bookie."
    },
    {
      label: "Court request",
      headline: "Post the exact resolution bond.",
      look: "The production screen shows the locked fee-policy version, exact request-time fee, bond payer, outcome backing, and live secondary trading together.",
      use: "Post the exact bond, pay DemoThemis atomically, and follow the request.",
      notice: "If the fee is at least the pool, no case opens and the precommitted backstop cancellation rule applies."
    },
    {
      label: "Court handoff",
      headline: "Lock the case before the draw.",
      look: "The handoff screen shows what crosses into DemoThemis and what remains inside OmenMarketMaker.",
      use: "Lock the paid case once.",
      notice: "DemoThemis accepts fixed rules and the caller's bond payment without taking custody of outcome collateral."
    },
    {
      label: "Human draw",
      headline: "Draw one bound panel of verified humans.",
      look: "The sequence shows the public beacon, bound draw, and independent presence checks.",
      use: "Play the draw; all 7 presence checks complete automatically.",
      notice: "One panel is bound to this case; the protocol cannot reroll for a friendlier jury."
    },
    {
      label: "Private vote",
      headline: "Cast an encrypted ballot privately.",
      look: "The juror workspace shows the case rule, research instruction, and private ballot.",
      use: "Pick one answer and seal it.",
      notice: "The encrypted ballot may be silently replaced until the deadline, so its submission record never proves the final vote."
    },
    {
      label: "Verdict proof",
      headline: "Publish the aggregate result.",
      look: "The sequence canvas shows all 7 sealed ballots reaching threshold before the aggregate proof.",
      use: "Play publication once; verification follows automatically.",
      notice: "Individual votes stay private while the aggregate verdict becomes public."
    },
    {
      label: "Market appeal",
      headline: "Join a crowdfunded appeal in OmenMarketMaker.",
      look: "The result page shows the next jury's fixed goal, live progress, deadline, contributors, and every wallet's tagged service and security shares.",
      use: "Add one contribution. Other wallets close the remaining gap, the fully funded bond locks directly in DemoThemis, and the wider jury starts automatically.",
      notice: "If the goal misses its deadline, every contribution returns and the current verdict becomes final. OmenMarketMaker never holds the bond or controls the jury."
    },
    {
      label: "Final proof",
      headline: "Relay finality back to OmenMarketMaker.",
      look: "The sequence canvas shows the one-time proof relay; the final screen is OmenMarketMaker's settlement result.",
      use: "Play the relay, then see the payout and proof together.",
      notice: "DemoThemis proves the result; OmenMarketMaker pays the winning claims."
    }
  ];

  var EVENT_CONTINUATIONS = [
    {
      action: "Open live market",
      from: "Market creator",
      to: "Bettor / trader",
      targetTitle: "Market details",
      note: "The creator shares the market URL; traders now price the public market."
    },
    {
      action: "Graduate the market",
      from: "Bettor / trader",
      to: "Token holder",
      targetTitle: "Your market position",
      note: "The pool passes its robustness gate and converts every position into wallet-held ERC-20 claims."
    },
    {
      action: "Open the ERC-20 order book",
      from: "Token holder",
      to: "ERC-20 trader",
      targetTitle: "Deposit YES to earn",
      note: "The graduated tokens can now trade at exact limit prices or remain in protected lending."
    },
    {
      action: "Create private room",
      from: "ERC-20 trader",
      to: "Room creator",
      targetTitle: "Trade record",
      note: "The run branches briefly to a separate invite-only market.",
      dock: "page"
    },
    {
      action: "Build a parlay",
      from: "Optional format preview",
      to: "Parlay bettor",
      targetTitle: "Escrow record",
      note: "The run previews a separate multi-market solver product.",
      dock: "page"
    },
    {
      action: "Open court resolution",
      from: "Original public market",
      to: "OmenMarketMaker resolution",
      targetTitle: "Closed position",
      note: "The run returns to the original market after the event and opens its mandatory court-backed resolution.",
      dock: "page"
    },
    {
      action: "Review product handoff",
      from: "OmenMarketMaker resolution",
      to: "Court intake",
      targetTitle: "Bonded resolution",
      note: "The bonded request shows what crosses the product boundary."
    },
    {
      action: "View protocol draw",
      from: "Court intake",
      to: "DemoThemis network",
      targetTitle: "Court intake",
      note: "The paid case and exact court fee are locked before the bound draw begins."
    },
    {
      action: "Open juror workspace",
      from: "DemoThemis network",
      to: "Drawn juror",
      targetTitle: "Presence checks",
      note: "The case moves from public tracking to a verified juror's workspace."
    },
    {
      action: "View aggregate tally",
      from: "Drawn juror",
      to: "DemoThemis network",
      targetTitle: "Submission details",
      note: "Private votes are tallied; the public sees the aggregate proof."
    },
    {
      action: "Review appeal in OmenMarketMaker",
      from: "DemoThemis network",
      to: "OmenMarketMaker resolution",
      targetTitle: "Verified verdict",
      note: "The verified provisional result returns to the market so the losing side can review and fund the next jury."
    },
    {
      action: "View final proof relay",
      from: "DemoThemis network",
      to: "Finality relay",
      targetTitle: "Appeal proof",
      note: "With appeals closed, DemoThemis can send the final proof once."
    },
    {
      action: "Start a new walkthrough",
      from: "Token holder",
      to: "Market creator",
      targetTitle: "Market payout",
      note: "The market is settled; restart at a fresh question.",
      restart: true
    }
  ];

  var STAGE_GROUPS = [
    { label: "Market setup", start: 0, end: 3, mode: "omen" },
    { label: "Optional formats", start: 4, end: 5, mode: "omen" },
    { label: "Resolution handoff", start: 6, end: 7, mode: "themis" },
    { label: "Jury process", start: 8, end: 10, mode: "themis" },
    { label: "Appeal + loop", start: 11, end: 12, mode: "themis" }
  ];

  var PRODUCT_MODES = {
    omen: {
      start: 0,
      label: "Full market run",
      tabId: "productTabOmen"
    },
    themis: {
      start: 6,
      label: "Court-backed run",
      tabId: "productTabThemis"
    }
  };

  var APP_BOUNDARIES = {
    omen: {
      appTheme: "omen",
      appBrand: "OmenMarketMaker",
      appOrigin: "app.omenmarketmaker.com",
      frameTitle: ""
    },
    handoff: {
      appTheme: "omen",
      appBrand: "OmenMarketMaker",
      appOrigin: "app.omenmarketmaker.com",
      frameTitle: "Seeding DemoThemis with demand from the Application Layer"
    },
    themis: {
      appTheme: "themis",
      appBrand: "DemoThemis",
      appOrigin: "court.demothemis.com",
      frameTitle: ""
    }
  };

  var EVENT_SURFACES = [
    { surface: "omen", actor: "Market creator", actionOwner: "user" },
    { surface: "omen", actor: "Trader", actionOwner: "user" },
    { surface: "omen", actor: "Token holder", actionOwner: "user" },
    { surface: "omen", actor: "Trader", actionOwner: "user" },
    { surface: "omen", actor: "Alice", actionOwner: "user" },
    { surface: "omen", actor: "Parlay bettor", actionOwner: "user" },
    { surface: "omen", actor: "OmenMarketMaker", actionOwner: "user" },
    { surface: "omen", actor: "Court intake", actionOwner: "user" },
    { surface: "protocol", actor: "Network", actionOwner: "protocol" },
    { surface: "themis", actor: "Juror", actionOwner: "user" },
    { surface: "protocol", actor: "Network", actionOwner: "protocol" },
    { surface: "omen", actor: "Losing YES holder", actionOwner: "user" },
    { surface: "protocol", actor: "Network", actionOwner: "protocol" }
  ];

  function appBoundaryForStage(stageIndex) {
    var eventSurface = EVENT_SURFACES[stageIndex] || EVENT_SURFACES[0];
    return APP_BOUNDARIES[eventSurface.surface] || null;
  }

  function appBoundaryForPage(page) {
    return APP_BOUNDARIES[(page && page.surface) || "omen"] || null;
  }

  var stage = 0;
  var selectedRunMode = null;
  var rail = document.getElementById("stageRail");
  var next = document.getElementById("runNext");
  var back = document.getElementById("runBack");
  var runControls = document.querySelector(".run-controls");
  var eventNavigatorToggle = document.getElementById("eventNavigatorToggle");
  var runControlEvent = document.getElementById("runControlEvent");
  var runControlStage = document.getElementById("runControlStage");
  var runControlTitle = document.getElementById("runControlTitle");
  var runAnnouncement = document.getElementById("runAnnouncement");
  var productTabs = Array.prototype.slice.call(document.querySelectorAll(".product-tab[data-product-mode]"));
  var productModeNav = document.querySelector(".product-mode-nav");
  var productModePanel = document.getElementById("productModePanel");
  var activeAction = -1;
  var activeEventStep = 0;
  var selectedBallotChoice = "";
  var runStartStage = 0;
  var completedStages = {};
  var liveTradeSide = "YES";
  var APPEAL_FUNDING_GOAL = 31000;
  var APPEAL_PANEL_FEE = 6000;
  var APPEAL_DELAY_FEE = 8200;
  var APPEAL_SERVICE_FEE = APPEAL_PANEL_FEE + APPEAL_DELAY_FEE;
  var APPEAL_SECURITY_BOND = APPEAL_FUNDING_GOAL - APPEAL_SERVICE_FEE;
  var APPEAL_EXISTING_FUNDING = 18400;
  var appealContributionDraft = 4000;
  var maxReachedByMode = { omen: 0, themis: 6 };
  var productProgress = {
    omen: { stage: 0, step: 0, action: -1 },
    themis: { stage: 6, step: 0, action: -1 }
  };
  var marketLiquidityDraft = { yes: .1, no: 0 };
  var liveFieldDrafts = {};
  var openStageGroup = -1;
  var eventNavigatorOpen = false;
  var artResizeFrame = 0;
  var coachmarkFrame = 0;
  var coachmarkFallbackTimeout = null;
  var coachmarkEl = null;
  var coachmarkConnectorEl = null;
  var coachmarkTargetKey = "";
  var coachmarkDescribedTarget = null;
  var coachmarkObservedTarget = null;
  var coachmarkTargetObserver = null;
  var coachmarkMutationObserver = null;
  var coachmarkGeometryVersion = 0;
  var coachmarkObstacleCache = null;
  var coachmarkMeasureCache = {};
  var coachmarkLastPlacement = null;
  var coachmarkSuppressObservationUntil = 0;
  var coachmarkInvalidationReason = "initial";
  var coachmarkAuditEnabled = /[?&]coachmarkAudit=1(?:[&#]|$)/.test(window.location.search + window.location.hash);
  var coachmarkAuditHistory = [];
  var lastArtLayout = "";
  var allowAutoRevealTarget = false;
  var restoreSimulatorFocusOnRender = false;
  var announceRunStatusOnRender = false;
  var simulatorFocusToken = 0;
  var runAnnouncementTimeout = null;
  var pendingConfirmation = null;
  var confirmationTimers = [];
  var automaticStepTimer = null;
  var automaticStepToken = 0;
  var suppressSimulatorFocusRestoreOnce = false;

  function money(n) {
    if (n >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return "$" + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
    if (n >= 10) return "$" + Math.round(n);
    return "$" + n.toFixed(2);
  }

  function appealMoney(value) {
    return "$" + Math.max(0, Number(value) || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  function safeAppealContribution(value) {
    var amount = Number(value);
    if (!Number.isFinite(amount)) return 0;
    return Math.max(0, Math.min(APPEAL_FUNDING_GOAL - APPEAL_EXISTING_FUNDING, Math.round(amount)));
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function productModeForStage(stageIndex) {
    var eventSurface = EVENT_SURFACES[stageIndex] || EVENT_SURFACES[0];
    return eventSurface.surface === "omen" ? "omen" : "themis";
  }

  function syncProductMode() {
    if (!selectedRunMode) {
      if (productModeNav) productModeNav.classList.add("is-awaiting-selection");
      productTabs.forEach(function (tab) {
        tab.setAttribute("aria-pressed", "false");
      });
      if (productModePanel) {
        productModePanel.hidden = true;
        productModePanel.removeAttribute("aria-labelledby");
        productModePanel.removeAttribute("data-product-mode");
      }
      return;
    }
    if (productModeNav) productModeNav.classList.remove("is-awaiting-selection");
    var stageMode = productModeForStage(stage);
    var stageConfig = PRODUCT_MODES[stageMode];
    var selectedConfig = PRODUCT_MODES[selectedRunMode];
    var stageGroup = STAGE_GROUPS.find(function (group) { return stage >= group.start && stage <= group.end; });
    var stageLabel = stageGroup ? stageGroup.label : stageConfig.label;
    productTabs.forEach(function (tab) {
      var selected = tab.getAttribute("data-product-mode") === selectedRunMode;
      tab.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    if (productModePanel) {
      productModePanel.hidden = false;
      productModePanel.setAttribute("aria-labelledby", selectedConfig.tabId);
      productModePanel.setAttribute("data-product-mode", selectedRunMode);
      productModePanel.setAttribute("data-current-section", stageMode);
    }
    if (rail) rail.setAttribute("aria-label", "All event groups; chosen run: " + selectedConfig.label + "; current section: " + stageLabel);
    var focusScene = document.getElementById("focusScene");
    if (focusScene) focusScene.setAttribute("aria-label", selectedConfig.label + " workspace; current section: " + stageLabel);
  }

  function saveProductProgress() {
    if (!selectedRunMode) return;
    productProgress[selectedRunMode] = { stage: stage, step: activeEventStep, action: activeAction };
  }

  function selectProductMode(mode) {
    var config = PRODUCT_MODES[mode];
    if (!config || selectedRunMode === mode) return false;
    cancelAutomaticStep();
    clearStepConfirmation();
    saveProductProgress();
    selectedRunMode = mode;
    var progress = productProgress[mode] || { stage: config.start, step: 0, action: -1 };
    runStartStage = config.start;
    stage = progress.stage;
    activeEventStep = progress.step;
    activeAction = progress.action;
    openStageGroup = -1;
    setEventNavigatorOpen(false);
    allowAutoRevealTarget = false;
    prepareSimulatorTransition(true);
    render();
    return true;
  }

  function makeEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function activeBrandForPage(page) {
    if (isSequencePage(page) && page.sequenceProfile === "omen") return "omen";
    return page && page.surface === "omen" ? "omen" : "demothemis";
  }

  function shellBrandForStage(stageIndex) {
    return stageIndex >= 6 ? "demothemis" : "omen";
  }

  function makeProductWordmark(brand, className, accessibleName, animateOmen) {
    var mark = makeEl("span", className || "product-wordmark");
    var image = document.createElement("img");
    image.width = brand === "omen" ? 1582 : 1766;
    image.height = brand === "omen" ? 408 : 216;
    image.src = brand === "omen"
      ? "assets/brand/omenmarketmaker/wordmark-poster.png"
      : "assets/brand/demothemis/wordmark.png";
    image.alt = brand === "omen" && animateOmen ? "" : (accessibleName || "");
    if (!accessibleName || (brand === "omen" && animateOmen)) image.setAttribute("aria-hidden", "true");
    mark.setAttribute("data-brand-mark", brand);
    mark.appendChild(image);
    if (brand === "omen" && animateOmen) {
      mark.classList.add("omen-rive-shell", "run-rive-wordmark");
      mark.setAttribute("data-omen-rive", "");
      if (accessibleName) {
        mark.setAttribute("role", "img");
        mark.setAttribute("aria-label", accessibleName);
      } else {
        mark.setAttribute("aria-hidden", "true");
      }
      var canvas = document.createElement("canvas");
      canvas.width = 1000;
      canvas.height = 300;
      canvas.setAttribute("aria-hidden", "true");
      mark.appendChild(canvas);
    }
    return mark;
  }

  function makeProductFavicon(brand, className) {
    var mark = makeEl("span", className || "product-favicon");
    var image = document.createElement("img");
    image.width = 32;
    image.height = 32;
    image.src = brand === "omen"
      ? "assets/brand/omenmarketmaker/mark-32.png"
      : "assets/brand/demothemis/mark-32.png";
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    mark.setAttribute("data-brand-mark", brand);
    mark.setAttribute("aria-hidden", "true");
    mark.appendChild(image);
    return mark;
  }

  var SYSTEM_PHASES = [
    { id: "build", number: "01", title: "Build the market", note: "Choose the market format. A robust public pool can graduate into wallet-held claims.", transition: "Market closes → bonded resolution" },
    { id: "check", number: "02", title: "Bond resolution", note: "An eligible caller posts the deterministic court fee; the pool is charged only after a directional ruling.", transition: "Bonded case → verified court" },
    { id: "judge", number: "03", title: "Decide the case", note: "Draw verified humans, keep ballots private, and widen the jury only when an appeal is funded.", transition: "Signed ruling → OmenMarketMaker" },
    { id: "finish", number: "04", title: "Pay and learn", note: "Apply the signed ruling once, close permanently, then improve juror quality without reopening settlement.", transition: "Payout ends · learning continues" }
  ];

  var SYSTEM_STATES = [
    {
      id: "rules-fixed", phase: "build", order: 1, title: "Question and rules fixed",
      short: "The answer choices, close time, and evidence source are written before money arrives.", routes: ["dispute"], sim: [],
      detail: "The market states what counts as YES, NO, or another permitted result before anyone can trade. Those fixed terms become the court case if a ruling is later required.",
      actor: "Market creator; protocol validates the format", money: "No outcome money has moved yet", condition: "Before initial funding", next: "Open a public pool or fund a private room"
    },
    {
      id: "public-pool", phase: "build", order: 2, group: "market-entry", branch: "Public · continue", afterNote: "Public continues ↓ · Private rejoins at close →", title: "Initial liquidity opens a public pool",
      short: "Any amount can create the market and enter protocol escrow.", routes: ["dispute"], sim: [0],
      detail: "There is no listing committee or minimum launch size. The initial deposit creates the market and remains entirely as outcome backing. Request timing, the final backstop, and the fee-policy version were fixed before betting.",
      actor: "Market creator", money: "Outcome backing locks", condition: "A valid question and fixed resolution rules exist", next: "More pooled purchases"
    },
    {
      id: "private-room", phase: "build", order: 2, group: "market-entry", branch: "Private · alternate", title: "Private room is funded",
      short: "Invited people accept named odds with neutral escrow and the same bonded-resolution path.", routes: [], sim: [4],
      detail: "A private room is an alternate market format. Matched stakes remain outcome backing; when review is eligible, either participant or another eligible caller can post the exact court fee as a resolution bond.",
      actor: "Invited counterparties", money: "Matched stakes lock; unmatched offers wait", condition: "An invited party accepts the terms", next: "Trade until the written close"
    },
    {
      id: "price-formation", phase: "build", order: 3, title: "Public purchases find the opening price",
      short: "YES and NO purchases move one shared ratio while the market is young.", routes: ["dispute"], sim: [1],
      detail: "Before graduation, every public purchase enters the shared market pool. The balance between YES and NO becomes the visible odds without an order book.",
      actor: "Traders", money: "Purchases remain in pool escrow", condition: "The market is open and not yet graduated", next: "Test whether the pool is robust enough to graduate"
    },
    {
      id: "robustness-gate", phase: "build", order: 4, kind: "decision", title: "Is the public pool robust?",
      short: "Two-sided participation, depth, and time must clear the graduation gate; future court funding is separate.", routes: ["dispute"], sim: [2],
      detail: "Graduation checks that both sides are meaningfully funded, the pool has enough depth, and the market has remained active long enough. It never depends on a future court fee.",
      actor: "Protocol checks objective thresholds", money: "Still fully backed in escrow", condition: "While the market is live", next: "Stay pooled or mint transferable YES and NO claims"
    },
    {
      id: "pooled-claims", phase: "build", order: 5, group: "claim-form", branch: "Pool · alternate", afterNote: "Both claim forms rejoin at market close →", title: "Claims stay inside the pool",
      short: "A smaller market can keep running without wallet tokens.", routes: [], sim: [],
      detail: "Smaller markets keep positions as simple internal claims while remaining fully backed by the same escrow.",
      actor: "OmenMarketMaker pool", money: "Outcome backing remains in escrow", condition: "A graduation check has not passed", next: "Event or close time"
    },
    {
      id: "tokenized-claims", phase: "build", order: 5, group: "claim-form", branch: "Token · main", title: "Wallet claims and order book go live",
      short: "Pool positions convert into ERC-20 YES and NO before token trading begins.", routes: ["dispute"], sim: [2, 3],
      detail: "Graduation ends pooled trading and converts every position into a fully backed, transferable ERC-20 claim. The mature order book then trades those tokens at exact limit prices; tokens can also be lent for interest or used as collateral.",
      actor: "Protocol mints; users self-custody and trade", money: "Collateral stays locked behind the claims", condition: "Every robustness check passes", next: "ERC-20 order-book trading, optional lending, optional parlays, then close"
    },
    {
      id: "parlay-route", phase: "build", order: 6, kind: "optional", branch: "Optional side route", title: "Solver quotes a parlay",
      short: "Competing solvers quote the bundle; the winner must back its maximum payout.", routes: [], sim: [5],
      detail: "A parlay branches from robust tokenized markets. Protected lenders earn borrowing interest, separate junior vaults earn spread for accepting correlation risk, and solvers compete to price the bundle.",
      actor: "Trader, protected lenders, junior vaults, and solver network", money: "Lending protection and junior risk stay separate; no parlay executes before full backing", condition: "A fully funded quote wins", next: "Mint one tradeable parlay receipt"
    },
    {
      id: "parlay-position", phase: "build", order: 7, kind: "optional", title: "Tradeable parlay receipt",
      short: "The winning solver locks the maximum payout and the trader receives one receipt.", routes: [], sim: [5],
      detail: "The receipt represents the funded bundle without changing the resolution route of its underlying markets.",
      actor: "Protocol and winning solver", money: "Maximum payout remains locked", condition: "The solver-backed order executes", next: "Hold to resolution or request cashout"
    },
    {
      id: "parlay-cashout", phase: "build", order: 8, kind: "terminal", title: "Optional receipt cashout",
      short: "A fresh solver auction can buy the entire receipt before the legs settle.", routes: [], sim: [5],
      detail: "Cashout transfers the receipt to the winning bidder. It is an exit from the side product, not a shortcut around market resolution.",
      actor: "Receipt holder and solver network", money: "Winning cashout bid returns to the holder", condition: "A funded bid is accepted", next: "Parlay side route ends"
    },

    {
      id: "event-close", phase: "check", order: 1, title: "Event or close time arrives",
      short: "New betting ends under the market's written clock.", routes: ["dispute"], sim: [6], simSteps: [0],
      detail: "The event finishes or the close rule triggers. New deposits stop and the market becomes eligible for a bonded resolution request under its locked timing rules.",
      actor: "OmenMarketMaker clock", money: "Outcome backing remains locked", condition: "The written close rule is reached", next: "Prepare a resolution request"
    },
    {
      id: "resolution-requested", phase: "check", order: 2, title: "Resolution request prepared",
      short: "OmenMarketMaker submits the fixed question, evidence rules, and value at stake.", routes: ["dispute"], sim: [6],
      detail: "The request is a service handoff, not a proposed answer. The market's evidence rules, request timing, final backstop, and fee-policy version were fixed before betting.",
      actor: "OmenMarketMaker", money: "Outcome backing stays at OmenMarketMaker", condition: "The request is eligible", next: "Calculate the exact court fee"
    },
    {
      id: "fee-pool-check", phase: "check", order: 3, kind: "decision", title: "Can the pool reimburse the exact fee?",
      short: "The versioned policy calculates the court fee from locked inputs at request time.", routes: ["dispute"], sim: [6],
      detail: "If the fee is below the pool, the request may proceed. If it is at least the pool, no case opens and the backstop cancellation rule applies.",
      actor: "OmenMarketMaker settlement contract", money: "Outcome pool remains untouched", condition: "Before any DemoThemis case opens", next: "Post the bond or follow cancellation"
    },
    {
      id: "resolution-bond-posted", phase: "check", order: 4, group: "funding-outcome", branch: "Fee below pool", kind: "decision", title: "Eligible caller posts the bond",
      short: "Any eligible caller may post exactly the deterministic court fee.", routes: ["dispute"], sim: [],
      detail: "The caller supplies a maximum only for transaction safety; the policy sets the price. Posting the bond, paying DemoThemis, freezing the pool, and opening the case are atomic.",
      actor: "Resolution caller", money: "Exact court fee posted as a bond", condition: "Fee is below the pool and the request is eligible", next: "Pay the court and lock the case"
    },
    {
      id: "fee-exceeds-pool", phase: "check", order: 5, group: "funding-outcome", branch: "Fee at least pool", kind: "terminal", title: "No case; cancellation rule applies",
      short: "A pool too small to reimburse the fee cannot open a court case.", routes: ["dispute"], sim: [],
      detail: "No bond or court fee moves. At the final backstop, the full pool follows the market's precommitted cancellation settlement and no Omen fee is charged.",
      actor: "OmenMarketMaker cancellation rule", money: "Full outcome pool remains for settlement", condition: "Deterministic court fee is at least the pool", next: "Market closes without a court case"
    },
    {
      id: "court-fee-paid", phase: "check", order: 5, group: "funding-outcome", branch: "Bond posted", title: "Resolution bond pays DemoThemis",
      short: "The caller's exact bond pays the deterministic court fee once.", routes: ["dispute"], sim: [6, 7],
      detail: "Only the locked case and its bond payment cross the product boundary. Outcome collateral remains in OmenMarketMaker until a directional ruling reimburses the caller.",
      actor: "Resolution caller pays; DemoThemis receives", money: "Caller-funded resolution bond", condition: "Bond posting and case opening succeed atomically", next: "Accept and lock the case"
    },

    {
      id: "case-locked", phase: "judge", order: 1, title: "Case and court fee lock",
      short: "Question, evidence rules, value, complexity, and funding freeze before selection.", routes: ["dispute"], sim: [7, 8],
      detail: "Locking first prevents either product or party from changing the case after seeing who will judge it.",
      actor: "DemoThemis intake", money: "Court fee paid from the caller's bond; outcome collateral remains separate", condition: "Before the randomness beacon is used", next: "Build the value-appropriate panel plan"
    },
    {
      id: "panel-plan", phase: "judge", order: 2, kind: "decision", title: "Panel plan fixed by value",
      short: "Use one 7, 15, or 31-person panel—or several non-overlapping 31-person panels for the largest cases.", routes: ["dispute"], sim: [7, 8],
      detail: "The value at stake selects a plan before the draw. Parallel top-tier panels must independently agree; a split produces INSUFFICIENT_INFORMATION with reason PANEL_DISAGREEMENT instead of false certainty.",
      actor: "Published DemoThemis rules", money: "Required panel budget is reserved", condition: "Case value and appeal rung are fixed", next: "One public, replayable draw"
    },
    {
      id: "panel-drawn", phase: "judge", order: 3, title: "Panel drawn once",
      short: "The committed case and a public beacon select the required seats with no app-controlled reroll.", routes: ["dispute"], sim: [8], simSteps: [1],
      detail: "Anyone can replay the draw. Deterministic standbys replace conflicts or missed check-ins without letting the app shop for a friendlier jury.",
      actor: "Public randomness beacon and deterministic rules", money: "Juror budget reserved; market escrow untouched", condition: "Case and panel plan are already locked", next: "Conflict and live-presence checks"
    },
    {
      id: "seat-checked", phase: "judge", order: 4, title: "Conflicts removed; humans check in",
      short: "Conflicted holders are replaced and every seated juror proves live presence.", routes: ["dispute"], sim: [8], simSteps: [2],
      detail: "A juror may decline a case they cannot judge. The next deterministic standby fills the seat; missed presence affects reliability, not the verdict.",
      actor: "Drawn jurors, World App proof, standby list", money: "No vote-dependent payment", condition: "Before ballots unlock", next: "Evidence review and private ballot"
    },
    {
      id: "private-ballot", phase: "judge", order: 5, title: "Evidence and private ballots",
      short: "Jurors review the same record and may silently replace an encrypted ballot until the deadline.", routes: ["dispute"], sim: [9],
      detail: "Only the aggregate tally becomes public. Hidden, replaceable individual ballots make a promised vote a poor receipt for a briber.",
      actor: "Verified seated jurors", money: "Juror reserve remains pending", condition: "Ballot window is open", next: "Aggregate each panel"
    },
    {
      id: "panel-consensus", phase: "judge", order: 6, kind: "decision", title: "Required panels agree?",
      short: "One panel yields its tally; parallel top-tier panels must reach the same answer.", routes: ["dispute"], sim: [10],
      detail: "The court publishes panel-level aggregate proofs without revealing individual votes. Parallel-panel disagreement is handled explicitly.",
      actor: "Threshold tally process", money: "All funds remain pending", condition: "Every required panel has a valid tally", next: "Provisional ruling or insufficient information"
    },
    {
      id: "provisional-verdict", phase: "judge", order: 7, group: "panel-outcome", branch: "Agreement", title: "Provisional ruling",
      short: "The aggregate answer is public while the appeal window remains open.", routes: ["dispute"], sim: [10], simSteps: [1, 2],
      detail: "The ruling is checkable but not payable yet. Juror rewards and quality updates wait for finality so an appeal can correct the first result.",
      actor: "DemoThemis tally process", money: "Market escrow and juror reserves remain pending", condition: "Required panel consensus is reached", next: "Return the provisional proof to the market"
    },
    {
      id: "insufficient-verdict", phase: "judge", order: 7, group: "panel-outcome", branch: "Parallel split", title: "Provisional INSUFFICIENT_INFORMATION ruling",
      short: "If required parallel panels disagree, the system reports disagreement instead of inventing certainty.", routes: ["dispute"], sim: [],
      detail: "PANEL_DISAGREEMENT explains why the provisional ruling is INSUFFICIENT_INFORMATION; the ruling can still be appealed through the same ladder.",
      actor: "DemoThemis tally process", money: "Market escrow remains pending", condition: "Required parallel panels split", next: "Return the provisional proof to the market"
    },
    {
      id: "provisional-handoff", phase: "judge", order: 8, title: "Provisional proof returns to the market",
      short: "DemoThemis sends the checkable result and appeal deadline to OmenMarketMaker without moving market custody.", routes: ["dispute"], sim: [11], simSteps: [4],
      detail: "This is a narrow status handoff, not final settlement. OmenMarketMaker verifies the proof, keeps the market escrow locked, and presents the current result to its users.",
      actor: "DemoThemis → OmenMarketMaker", money: "Market escrow remains locked at OmenMarketMaker", condition: "A valid provisional proof exists", next: "Show the appeal decision in the market app"
    },
    {
      id: "omen-appeal-choice", phase: "judge", order: 9, title: "OmenMarketMaker opens appeal crowdfunding",
      short: "The market app shows the next jury's goal, deadline, live funding, contributors, tagged service fee, and separately escrowed security.", routes: ["dispute"], sim: [11], simSteps: [0, 1, 2, 5],
      detail: "Anyone may contribute through OmenMarketMaker, but each payment locks directly in the DemoThemis appeal contract. Omen does not set the goal, custody funds, select jurors, or influence the verdict.",
      actor: "Appeal supporters using OmenMarketMaker", money: "Each payment funds a tagged service-fee share plus separately escrowed security", condition: "The appeal window is open", next: "Reach the full goal or refund at the deadline"
    },
    {
      id: "appeal-gate", phase: "judge", order: 10, kind: "decision", title: "Was a valid appeal funded?",
      short: "A fully funded public goal starts the next jury; a short goal refunds contributors when the deadline expires.", routes: ["dispute"], sim: [11], simSteps: [1, 2, 5],
      detail: "DemoThemis independently prices the next rung from panel work, attack risk, and delay. The appeal cannot start with partial funding, and OmenMarketMaker never takes custody of contributions.",
      actor: "Crowdfund contributors through OmenMarketMaker", money: "Contributions lock directly in DemoThemis and retain wallet-level pro-rata shares", condition: "The goal must reach 100% before the configured deadline", next: "Refund and final ruling, or fresh wider panel"
    },
    {
      id: "court-final", phase: "judge", order: 11, group: "appeal-outcome", branch: "No appeal / top rung", kind: "terminal", title: "Court ruling becomes final",
      short: "No timely appeal—or completion of the maximum rung—ends adjudication.", routes: ["dispute"], sim: [11], simSteps: [6],
      detail: "Finality is deliberate. Later evidence may affect juror quality or accountability, but it cannot reopen settled money.",
      actor: "DemoThemis appeal ladder", money: "Ready for signed handoff", condition: "No valid appeal remains", next: "Sign the final ruling"
    },
    {
      id: "larger-panel", phase: "judge", order: 11, group: "appeal-outcome", branch: "Goal funded · loop ↺", title: "Fresh wider panel",
      short: "The case advances through 7 → 15 → 31 seats without reusing the earlier panel.", routes: ["dispute"], sim: [11], simSteps: [3],
      detail: "The non-refundable service fee pays the new panel and delay compensation once. Success returns the separately escrowed security bond pro-rata; failure sends only that security bond to the reward pool. The locked case itself does not change.",
      actor: "New randomly drawn jurors", money: "Appeal supporters fund the service fee and security bond as separate tagged amounts", condition: "The full goal is funded and another rung remains", next: "Pay the service fee, lock security, then draw"
    },

    {
      id: "signed-ruling", phase: "finish", order: 1, title: "DemoThemis signs the final ruling",
      short: "The court emits one final answer and proof for the locked case.", routes: ["dispute"], sim: [12], simSteps: [0],
      detail: "The signed ruling is the service result paid from the caller's resolution bond. It contains no custody of outcome collateral.",
      actor: "DemoThemis", money: "Market escrow still at OmenMarketMaker", condition: "The appeal ladder is final", next: "Return the signed ruling"
    },
    {
      id: "ruling-handoff", phase: "finish", order: 2, title: "Ruling crosses back to the market",
      short: "OmenMarketMaker verifies the signed DemoThemis result against the locked case.", routes: ["dispute"], sim: [12],
      detail: "The same narrow boundary is used in reverse: a ruling crosses, not the court treasury or market custody.",
      actor: "DemoThemis → OmenMarketMaker", money: "No market funds cross the product boundary", condition: "Signature and case ID verify", next: "Select the written market release rule"
    },
    {
      id: "omen-release-rule", phase: "finish", order: 3, title: "OmenMarketMaker applies the result",
      short: "The verified answer selects the market's pre-written payout rule.", routes: ["dispute"], sim: [12],
      detail: "OmenMarketMaker remains responsible for redemption, fees, and the final market record.",
      actor: "OmenMarketMaker settlement contract", money: "Net outcome collateral is ready to route", condition: "Signed ruling verified", next: "Redeem claims and route fees"
    },
    {
      id: "settle-funds", phase: "finish", order: 4, title: "Claims redeem and fees route",
      short: "Pool winners split net outcome collateral or tokens redeem; the court payment and market fee remain distinct.", routes: ["dispute"], sim: [12], simSteps: [1],
      detail: "The caller's bond already paid DemoThemis. After YES or NO, both sides reimburse it pro-rata before settlement routes winning claims and the separately disclosed Omen fee; individual juror updates remain shielded behind aggregate proofs.",
      actor: "OmenMarketMaker settlement contracts", money: "Resolution bond reimbursed; winning claims paid; Omen fee routed", condition: "The release rule is selected", next: "Write the permanent market record"
    },
    {
      id: "market-record", phase: "finish", order: 5, title: "Market closes permanently",
      short: "A signed payout record remains; a private market stays private by default.", routes: ["dispute"], sim: [12], simSteps: [1],
      detail: "The payment state is immutable. Learning and accountability may continue without changing the final ruling or payout.",
      actor: "OmenMarketMaker record layer", money: "Already settled and cannot reopen", condition: "Settlement transaction completes", next: "End; post-case rails continue in parallel"
    },
    {
      id: "quality-update", phase: "finish", order: 6, kind: "parallel", title: "Every case updates juror quality",
      short: "Difficulty-adjusted agreement, written-criteria consistency, and appeal survival update one shared history.", routes: ["dispute"], sim: [12],
      detail: "All well-defined cases contribute to sustainable consensus. The scoring system does not exclude judgment-based cases from accuracy learning.",
      actor: "DemoThemis quality engine", money: "Future selection odds change; settled money does not", condition: "After finality", next: "Better future juror selection"
    },
    {
      id: "external-evidence", phase: "finish", order: 7, kind: "optional", title: "Later evidence can add a signal",
      short: "A trustworthy later result can sharpen the completed case's quality record.", routes: [], sim: [],
      detail: "External evidence is optional extra information, never a gate that decides whether the case counts for juror quality.",
      actor: "DemoThemis evidence checks", money: "No settlement money changes", condition: "Reliable later evidence becomes available", next: "Append to the same quality history"
    },
    {
      id: "collusion-clock", phase: "finish", order: 8, kind: "parallel", title: "Accountability clock keeps running",
      short: "Later collusion reports may punish proven offenders without reopening the ruling.", routes: ["dispute"], sim: [],
      detail: "Delayed conspiracy proof affects juror standing or penalties, never the already-final market payout.",
      actor: "Reporters and DemoThemis governance", money: "Only later penalties or reporter rewards", condition: "After a jury ruling", next: "No effect on the closed market"
    },
    {
      id: "bootstrap-loop", phase: "finish", order: 9, kind: "parallel", title: "Demand strengthens the next cycle",
      short: "Market demand funds cases; completed cases improve juror records and court credibility.", routes: ["dispute"], sim: [12],
      detail: "Bonded resolution requests seed DemoThemis with demand while pool-too-small cancellations consume no juror work. Both products retain separate fees, treasuries, governance, and contracts.",
      actor: "Independent OmenMarketMaker and DemoThemis systems", money: "Caller-funded resolution bond; separate market fee", condition: "A bonded court-backed market settles", next: "More useful markets and a stronger juror pool"
    }
  ];

  var SYSTEM_TRANSITIONS = [
    { from: "rules-fixed", to: "public-pool", when: "public market", kind: "branch" },
    { from: "rules-fixed", to: "private-room", when: "private room", kind: "branch" },
    { from: "public-pool", to: "price-formation", when: "purchases arrive", kind: "forward" },
    { from: "private-room", to: "event-close", when: "written close", kind: "skip" },
    { from: "price-formation", to: "robustness-gate", when: "graduation check", kind: "forward" },
    { from: "robustness-gate", to: "pooled-claims", when: "a check fails", kind: "branch" },
    { from: "robustness-gate", to: "tokenized-claims", when: "every check passes", kind: "branch" },
    { from: "pooled-claims", to: "event-close", when: "written close", kind: "skip" },
    { from: "tokenized-claims", to: "event-close", when: "written close", kind: "skip" },
    { from: "tokenized-claims", to: "parlay-route", when: "optional bundle", kind: "branch" },
    { from: "parlay-route", to: "parlay-position", when: "funded quote wins", kind: "forward" },
    { from: "parlay-position", to: "parlay-cashout", when: "optional funded cashout", kind: "branch" },

    { from: "event-close", to: "resolution-requested", when: "market needs its final answer", kind: "forward" },
    { from: "resolution-requested", to: "fee-pool-check", when: "exact fee is calculated", kind: "forward" },
    { from: "fee-pool-check", to: "resolution-bond-posted", when: "fee is below the pool", kind: "branch" },
    { from: "fee-pool-check", to: "fee-exceeds-pool", when: "fee is at least the pool", kind: "branch" },
    { from: "resolution-bond-posted", to: "court-fee-paid", when: "caller posts the exact bond", kind: "forward" },
    { from: "court-fee-paid", to: "case-locked", when: "DemoThemis accepts the fixed case", kind: "forward" },

    { from: "case-locked", to: "panel-plan", when: "value selects the plan", kind: "forward" },
    { from: "panel-plan", to: "panel-drawn", when: "plan is fixed", kind: "forward" },
    { from: "panel-drawn", to: "seat-checked", when: "bound draw completes", kind: "forward" },
    { from: "seat-checked", to: "private-ballot", when: "all required seats are ready", kind: "forward" },
    { from: "private-ballot", to: "panel-consensus", when: "aggregate proofs arrive", kind: "forward" },
    { from: "panel-consensus", to: "provisional-verdict", when: "required panels agree", kind: "branch" },
    { from: "panel-consensus", to: "insufficient-verdict", when: "required parallel panels split", kind: "branch" },
    { from: "provisional-verdict", to: "provisional-handoff", when: "provisional proof is ready", kind: "forward" },
    { from: "insufficient-verdict", to: "provisional-handoff", when: "provisional proof is ready", kind: "forward" },
    { from: "provisional-handoff", to: "omen-appeal-choice", when: "OmenMarketMaker verifies the proof", kind: "forward" },
    { from: "omen-appeal-choice", to: "appeal-gate", when: "appeal window remains open", kind: "forward" },
    { from: "appeal-gate", to: "court-final", when: "no valid appeal or top rung", kind: "branch" },
    { from: "appeal-gate", to: "larger-panel", when: "appeal is funded", kind: "branch" },
    { from: "larger-panel", to: "panel-plan", when: "fresh wider plan", kind: "loop" },

    { from: "court-final", to: "signed-ruling", when: "final answer is signed", kind: "forward" },
    { from: "signed-ruling", to: "ruling-handoff", when: "proof is ready", kind: "forward" },
    { from: "ruling-handoff", to: "omen-release-rule", when: "OmenMarketMaker verifies", kind: "forward" },
    { from: "omen-release-rule", to: "settle-funds", when: "written payout rule selected", kind: "forward" },
    { from: "settle-funds", to: "market-record", when: "settlement succeeds", kind: "forward" },
    { from: "signed-ruling", to: "quality-update", when: "every completed case", kind: "parallel" },
    { from: "quality-update", to: "external-evidence", when: "later evidence is available", kind: "parallel" },
    { from: "signed-ruling", to: "collusion-clock", when: "accountability continues", kind: "parallel" },
    { from: "market-record", to: "bootstrap-loop", when: "court-backed market settles", kind: "parallel" },
    { from: "bootstrap-loop", to: "rules-fixed", when: "new market", kind: "loop" }
  ];

  var SYSTEM_STATE_OWNERS = {
    "rules-fixed": "omen", "public-pool": "omen", "private-room": "omen", "price-formation": "omen",
    "robustness-gate": "omen", "pooled-claims": "omen", "tokenized-claims": "omen", "parlay-route": "omen",
    "parlay-position": "omen", "parlay-cashout": "omen", "event-close": "omen", "resolution-requested": "omen",
    "fee-pool-check": "omen", "resolution-bond-posted": "omen", "fee-exceeds-pool": "omen",
    "court-fee-paid": "shared", "case-locked": "demothemis", "panel-plan": "demothemis", "panel-drawn": "demothemis",
    "seat-checked": "demothemis", "private-ballot": "demothemis", "panel-consensus": "demothemis", "provisional-verdict": "demothemis",
    "insufficient-verdict": "demothemis", "provisional-handoff": "shared", "omen-appeal-choice": "omen", "appeal-gate": "shared", "court-final": "demothemis", "larger-panel": "demothemis",
    "signed-ruling": "demothemis", "ruling-handoff": "shared", "omen-release-rule": "omen", "settle-funds": "omen",
    "market-record": "omen", "quality-update": "demothemis", "external-evidence": "demothemis", "collusion-clock": "demothemis",
    "bootstrap-loop": "shared"
  };

  SYSTEM_STATES.forEach(function (state) {
    state.owner = SYSTEM_STATE_OWNERS[state.id] || "shared";
  });

  var MACHINE_FOCUS_COPY = {
    all: ["Whole system.", "OmenMarketMaker states, DemoThemis states, and the shared product handoffs are all visible."],
    omen: ["OmenMarketMaker only.", "Market creation, trading, custody, resolution funding, ruling verification, and payout remain visible. Shared handoffs show where DemoThemis connects."],
    demothemis: ["DemoThemis only.", "Case intake, verified-human adjudication, appeals, finality, and juror learning remain visible. Shared handoffs show where OmenMarketMaker connects."]
  };
  var MACHINE_PHASE_FOCUS_COPY = {
    omen: {
      check: { title: "Bond resolution", note: "Calculate the exact fee, let an eligible caller post it, and atomically pay DemoThemis while the outcome pool stays locked.", transition: "Bonded case or cancellation" },
      finish: { title: "Settle the market", note: "Verify the returned ruling, apply the written release rule, redeem claims, and close the record.", transition: "Signed ruling → final payout" }
    },
    demothemis: {
      check: { title: "Accept the bonded case", note: "Only the locked case and caller's bond payment enter DemoThemis; outcome collateral remains with OmenMarketMaker.", transition: "Locked case → verified court" },
      finish: { title: "Finalize and learn", note: "Sign the final ruling, return its proof, and improve juror quality without reopening settlement.", transition: "Ruling returns → learning continues" }
    }
  };
  var MACHINE_PHASE_BRANDS = {
    build: ["omen"],
    check: ["omen", "demothemis"],
    judge: ["demothemis", "omen"],
    finish: ["demothemis", "omen"]
  };
  var machineRouteTimer = 0;

  function machineStateById(id) {
    return SYSTEM_STATES.find(function (state) { return state.id === id; });
  }

  function machineTransitionText(id) {
    return SYSTEM_TRANSITIONS.filter(function (edge) { return edge.from === id; }).map(function (edge) {
      var target = machineStateById(edge.to);
      return edge.when + " → " + (target ? target.title : edge.to) + (edge.kind === "loop" ? " (loop)" : "");
    }).join("; ");
  }

  function updateMachineStateAria(button) {
    if (!button) return;
    var root = document.getElementById("systemStateMachine");
    var baseLabel = button.getAttribute("data-machine-base-label") || "System state.";
    var focus = root ? root.getAttribute("data-focus") : "all";
    var label = baseLabel;
    if (focus !== "all") label += " Included in the " + (focus === "omen" ? "OmenMarketMaker" : "DemoThemis") + " product view.";
    if (button.classList.contains("is-sim-current")) {
      var chip = button.querySelector(".machine-sim-chip");
      label += " Current guided " + (chip ? chip.textContent.toLowerCase() : "event") + ".";
    }
    button.setAttribute("aria-label", label);
  }

  function machineKindLabel(state) {
    if (state.kind === "decision") return "Decision";
    if (state.kind === "terminal") return "Final result";
    if (state.kind === "optional") return "Optional";
    return "State";
  }

  function appendMachineFact(root, label, value) {
    var line = makeEl("span");
    line.appendChild(makeEl("b", "", label + ": "));
    line.appendChild(document.createTextNode(value));
    root.appendChild(line);
  }

  function createMachineStateButton(state) {
    var button = makeEl("button", "machine-state");
    button.type = "button";
    button.setAttribute("data-machine-state", state.id);
    button.setAttribute("data-machine-routes", (state.routes || []).join(" "));
    button.setAttribute("data-sim-stages", (state.sim || []).join(" "));
    button.setAttribute("data-sim-steps", (state.simSteps || []).join(" "));
    button.setAttribute("data-kind", state.kind || "state");
    button.setAttribute("data-owner", state.owner || "shared");
    button.setAttribute("aria-expanded", "false");
    var baseLabel = state.title + (/[.!?]$/.test(state.title) ? " " : ". ") + state.short + " Select to read full state details.";
    button.setAttribute("data-machine-base-label", baseLabel);
    button.setAttribute("aria-label", baseLabel);

    var top = makeEl("span", "machine-state-top");
    var labels = makeEl("span", "machine-state-top");
    labels.appendChild(makeEl("span", "machine-state-kind", machineKindLabel(state)));
    if (state.branch) labels.appendChild(makeEl("span", "machine-state-branch", state.branch));
    top.appendChild(labels);
    var ownerIcons = makeEl("span", "machine-owner-icons" + (state.owner === "shared" ? " machine-owner-icons--shared" : ""));
    ownerIcons.setAttribute("aria-hidden", "true");
    if (state.owner === "shared") {
      ownerIcons.appendChild(makeProductFavicon("omen", "machine-owner-icon"));
      ownerIcons.appendChild(makeProductFavicon("demothemis", "machine-owner-icon"));
    } else {
      ownerIcons.appendChild(makeProductFavicon(state.owner, "machine-owner-icon"));
    }
    top.appendChild(ownerIcons);
    top.appendChild(makeEl("span", "machine-sim-chip", "Current event"));
    button.appendChild(top);
    button.appendChild(makeEl("strong", "machine-state-title", state.title));
    button.appendChild(makeEl("span", "machine-state-short", state.short));

    var detail = makeEl("span", "machine-state-detail");
    detail.id = "machine-state-detail-" + state.id;
    detail.hidden = true;
    button.setAttribute("aria-controls", detail.id);
    detail.appendChild(makeEl("span", "machine-state-meaning", state.detail));
    var facts = makeEl("span", "machine-state-facts");
    appendMachineFact(facts, "Who", state.actor);
    appendMachineFact(facts, "Money", state.money);
    appendMachineFact(facts, "Trigger", state.condition);
    detail.appendChild(facts);
    var nextLine = makeEl("span", "machine-state-next");
    nextLine.appendChild(makeEl("b", "", "Next: "));
    nextLine.appendChild(document.createTextNode(state.next));
    detail.appendChild(nextLine);
    button.appendChild(detail);

    button.addEventListener("click", function () {
      var alreadyOpen = button.getAttribute("aria-expanded") === "true";
      document.querySelectorAll("#systemStateMachine .machine-state[aria-expanded='true']").forEach(function (other) {
        other.setAttribute("aria-expanded", "false");
        other.removeAttribute("aria-describedby");
        other.classList.remove("is-selected");
        var otherDetail = other.querySelector(".machine-state-detail");
        if (otherDetail) otherDetail.hidden = true;
        updateMachineStateAria(other);
      });
      if (!alreadyOpen) {
        button.setAttribute("aria-expanded", "true");
        button.setAttribute("aria-describedby", detail.id);
        button.classList.add("is-selected");
        detail.hidden = false;
      }
      updateMachineStateAria(button);
      var announcement = document.getElementById("machineAnnouncement");
      if (announcement) {
        announcement.textContent = alreadyOpen
          ? state.title + " details closed."
          : state.title + " details opened. " + state.detail + " Who: " + state.actor + ". Money: " + state.money + ". Trigger: " + state.condition + ". Next: " + state.next + ".";
      }
    });
    return button;
  }

  function groupedMachineStates(states) {
    var groups = [];
    states.forEach(function (state) {
      var key = state.group || state.id;
      var last = groups[groups.length - 1];
      if (last && last.key === key) last.states.push(state);
      else groups.push({ key: key, states: [state] });
    });
    return groups;
  }

  function renderMachineTextFlow() {
    var root = document.getElementById("machineTextFlow");
    if (!root) return;
    root.replaceChildren();
    SYSTEM_PHASES.forEach(function (phase) {
      var section = makeEl("section");
      section.setAttribute("data-phase", phase.id);
      section.appendChild(makeEl("h4", "", phase.number + " · " + phase.title));
      var list = makeEl("ol");
      SYSTEM_STATES.filter(function (state) { return state.phase === phase.id; }).sort(function (a, b) { return a.order - b.order; }).forEach(function (state) {
        var item = makeEl("li");
        item.setAttribute("data-owner", state.owner || "shared");
        item.appendChild(makeEl("b", "", state.title + ". "));
        item.appendChild(document.createTextNode(state.short));
        var transitions = machineTransitionText(state.id);
        if (transitions) item.appendChild(document.createTextNode(" Next: " + transitions + "."));
        list.appendChild(item);
      });
      section.appendChild(list);
      root.appendChild(section);
    });
  }

  function renderSystemStateMachine() {
    var phaseRoot = document.getElementById("machinePhaseGrid");
    if (!phaseRoot) return;
    phaseRoot.replaceChildren();

    SYSTEM_PHASES.forEach(function (phase) {
      var phaseEl = makeEl("section", "machine-phase");
      phaseEl.setAttribute("data-phase", phase.id);
      phaseEl.setAttribute("aria-labelledby", "machine-phase-" + phase.id);
      var head = makeEl("header", "machine-phase-head");
      head.appendChild(makeEl("span", "machine-phase-kicker", "Phase " + phase.number));
      var titleRow = makeEl("div", "machine-phase-title-row");
      var title = makeEl("h3", "machine-phase-title", phase.title);
      title.id = "machine-phase-" + phase.id;
      titleRow.appendChild(title);
      var phaseBrand = makeEl("span", "machine-phase-brand");
      phaseBrand.setAttribute("aria-label", "Products active in this phase");
      titleRow.appendChild(phaseBrand);
      head.appendChild(titleRow);
      head.appendChild(makeEl("p", "machine-phase-note", phase.note));
      if (phase.transition) head.appendChild(makeEl("span", "machine-phase-transition", phase.transition));
      phaseEl.appendChild(head);

      var flow = makeEl("ol", "machine-phase-flow");
      var states = SYSTEM_STATES.filter(function (state) { return state.phase === phase.id; }).sort(function (a, b) { return a.order - b.order; });
      groupedMachineStates(states).forEach(function (group) {
        var step = makeEl("li", "machine-step");
        var row = makeEl("div", "machine-state-row" + (group.states.length > 1 ? " is-branch" : ""));
        group.states.forEach(function (state) {
          row.appendChild(createMachineStateButton(state));
        });
        step.appendChild(row);
        var noteState = group.states.find(function (state) { return !!state.afterNote; });
        if (noteState) {
          step.classList.add("has-split-exit");
          step.appendChild(makeEl("p", "machine-flow-note", noteState.afterNote));
        }
        flow.appendChild(step);
      });
      phaseEl.appendChild(flow);
      phaseRoot.appendChild(phaseEl);
    });

    renderMachineTextFlow();
  }

  function setMachineFocusSummary(focus) {
    var root = document.getElementById("machineRouteSummary");
    var copy = MACHINE_FOCUS_COPY[focus] || MACHINE_FOCUS_COPY.all;
    if (!root) return;
    root.replaceChildren();
    root.appendChild(makeEl("strong", "", copy[0] + " "));
    root.appendChild(document.createTextNode(copy[1]));
  }

  function setMachinePhaseCopy(focus) {
    var overrides = MACHINE_PHASE_FOCUS_COPY[focus] || {};
    SYSTEM_PHASES.forEach(function (phase) {
      var copy = overrides[phase.id] || phase;
      var phaseRoot = document.querySelector('.machine-phase[data-phase="' + phase.id + '"]');
      if (phaseRoot) {
        var title = phaseRoot.querySelector(".machine-phase-title");
        var note = phaseRoot.querySelector(".machine-phase-note");
        var transition = phaseRoot.querySelector(".machine-phase-transition");
        if (title) title.textContent = copy.title;
        if (note) note.textContent = copy.note;
        if (transition) transition.textContent = copy.transition || phase.transition;
        var phaseBrand = phaseRoot.querySelector(".machine-phase-brand");
        if (phaseBrand) {
          phaseBrand.replaceChildren();
          var brands = focus === "all" ? (MACHINE_PHASE_BRANDS[phase.id] || []) : [focus];
          brands.forEach(function (brand) {
            phaseBrand.appendChild(makeProductWordmark(brand, "machine-phase-wordmark", brand === "omen" ? "OmenMarketMaker" : "DemoThemis", false));
          });
        }
      }
      var textTitle = document.querySelector('.machine-text-content section[data-phase="' + phase.id + '"] h4');
      if (textTitle) textTitle.textContent = phase.number + " · " + copy.title;
    });
  }

  function setMachineFocus(focus, animate) {
    var root = document.getElementById("systemStateMachine");
    if (!root) return;
    var filtered = focus !== "all";
    root.setAttribute("data-focus", focus);
    root.classList.toggle("is-product-filtered", filtered);
    document.querySelectorAll("[data-machine-focus]").forEach(function (button) {
      var selected = button.getAttribute("data-machine-focus") === focus;
      button.setAttribute("aria-checked", selected ? "true" : "false");
      button.tabIndex = selected ? 0 : -1;
    });

    var active = [];
    root.querySelectorAll(".machine-state").forEach(function (button) {
      var owner = button.getAttribute("data-owner") || "shared";
      var matches = !filtered || owner === focus || owner === "shared";
      button.hidden = !matches;
      button.classList.toggle("is-route-active", matches);
      button.classList.remove("is-route-tracing");
      if (!matches && button.getAttribute("aria-expanded") === "true") {
        button.setAttribute("aria-expanded", "false");
        button.removeAttribute("aria-describedby");
        button.classList.remove("is-selected");
        var detail = button.querySelector(".machine-state-detail");
        if (detail) detail.hidden = true;
      }
      updateMachineStateAria(button);
      if (matches) active.push(button);
    });
    root.querySelectorAll(".machine-state-row").forEach(function (row) {
      var visibleStates = Array.from(row.querySelectorAll(".machine-state")).filter(function (button) { return !button.hidden; });
      row.hidden = visibleStates.length === 0;
      row.classList.toggle("is-single", visibleStates.length === 1);
    });
    root.querySelectorAll(".machine-phase-flow").forEach(function (flow) {
      var visibleSteps = [];
      flow.querySelectorAll(".machine-step").forEach(function (step) {
        var matches = !!step.querySelector(".machine-state:not([hidden])");
        step.hidden = !matches;
        step.classList.toggle("is-route-active", matches);
        step.classList.remove("is-last-visible");
        if (matches) visibleSteps.push(step);
      });
      if (visibleSteps.length) visibleSteps[visibleSteps.length - 1].classList.add("is-last-visible");
    });
    root.querySelectorAll(".machine-phase").forEach(function (phase) {
      phase.hidden = !phase.querySelector(".machine-state:not([hidden])");
    });
    root.querySelectorAll("[data-machine-owner]").forEach(function (item) {
      var owner = item.getAttribute("data-machine-owner") || "shared";
      item.hidden = filtered && owner !== focus && owner !== "shared";
    });
    root.querySelectorAll(".machine-text-content li[data-owner]").forEach(function (item) {
      var owner = item.getAttribute("data-owner") || "shared";
      item.hidden = filtered && owner !== focus && owner !== "shared";
    });
    root.querySelectorAll(".machine-text-content section").forEach(function (section) {
      section.hidden = !section.querySelector("li:not([hidden])");
    });
    setMachineFocusSummary(focus);
    setMachinePhaseCopy(focus);

    if (machineRouteTimer) window.clearTimeout(machineRouteTimer);
    if (animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void root.offsetWidth;
      active.forEach(function (button, index) {
        button.style.setProperty("--machine-delay", Math.min(index * 28, 560) + "ms");
        button.classList.add("is-route-tracing");
      });
      machineRouteTimer = window.setTimeout(function () {
        active.forEach(function (button) { button.classList.remove("is-route-tracing"); });
      }, 1150);
    }
  }

  function syncSystemMachineStage() {
    var root = document.getElementById("systemStateMachine");
    if (!root) return;
    root.querySelectorAll(".machine-state").forEach(function (button) {
      var stages = (button.getAttribute("data-sim-stages") || "").split(/\s+/).filter(Boolean).map(Number);
      var steps = (button.getAttribute("data-sim-steps") || "").split(/\s+/).filter(Boolean).map(Number);
      var current = Boolean(selectedRunMode) && stages.indexOf(stage) >= 0 && (!steps.length || steps.indexOf(activeEventStep) >= 0);
      button.classList.toggle("is-sim-current", current);
      var chip = button.querySelector(".machine-sim-chip");
      if (chip && current) chip.textContent = "Event " + String(stage + 1).padStart(2, "0");
      updateMachineStateAria(button);
    });
  }

  function initSystemStateMachine() {
    if (!document.getElementById("systemStateMachine")) return;
    renderSystemStateMachine();
    var focusButtons = Array.from(document.querySelectorAll("[data-machine-focus]"));
    focusButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        setMachineFocus(button.getAttribute("data-machine-focus"), true);
      });
      button.addEventListener("keydown", function (event) {
        var direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
        var targetIndex = event.key === "Home" ? 0 : event.key === "End" ? focusButtons.length - 1 : direction ? (focusButtons.indexOf(button) + direction + focusButtons.length) % focusButtons.length : -1;
        if (targetIndex < 0) return;
        event.preventDefault();
        var target = focusButtons[targetIndex];
        setMachineFocus(target.getAttribute("data-machine-focus"), true);
        target.focus();
      });
    });
    setMachineFocus("demothemis", false);
    syncSystemMachineStage();
  }

  function cleanTip(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function tagInfo(el, tip, focusable) {
    var text = cleanTip(tip);
    if (!el || !text) return el;
    el.setAttribute("data-sim-tip", text);
    if (focusable && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/i.test(el.tagName)) {
      el.tabIndex = 0;
    }
    return el;
  }

  function setAttributeToken(el, attribute, token, enabled) {
    if (!el || !attribute || !token) return;
    var tokens = (el.getAttribute(attribute) || "").split(/\s+/).filter(Boolean);
    var index = tokens.indexOf(token);
    if (enabled && index < 0) tokens.push(token);
    if (!enabled && index >= 0) tokens.splice(index, 1);
    if (tokens.length) el.setAttribute(attribute, tokens.join(" "));
    else el.removeAttribute(attribute);
  }

  function tagWorkflowAction(el, label, info, owner) {
    var actionLabel = cleanTip(label);
    var actionInfo = cleanTip(info);
    if (!el || !actionLabel || !actionInfo) return el;
    el.setAttribute("data-control-role", "workflow-action");
    el.setAttribute("data-action-label", actionLabel);
    el.setAttribute("data-action-info", actionInfo);
    if (owner) el.setAttribute("data-action-owner", cleanTip(owner));
    el.setAttribute("aria-label", actionLabel);
    return el;
  }

  function clearWorkflowAction(el) {
    if (!el) return el;
    el.classList.remove("guided-target");
    ["data-control-role", "data-action-label", "data-action-info", "data-action-owner"].forEach(function (attribute) {
      el.removeAttribute(attribute);
    });
    setAttributeToken(el, "aria-describedby", "guidedCoachmark", false);
    return el;
  }

  function optionTip(label, context) {
    var text = cleanTip(label);
    if (/^YES$/i.test(text)) return "YES is the claim that pays if the market resolves true.";
    if (/^NO$/i.test(text)) return "NO is the claim that pays if the market resolves false.";
    if (/^INSUFFICIENT INFORMATION$/i.test(text)) return "INSUFFICIENT INFORMATION means the permitted evidence cannot reliably establish YES or NO.";
    return text + " is an option in the " + cleanTip(context || "current") + " screen.";
  }

  function makeHelpTip(label, tip) {
    var button = makeEl("button", "sim-help", "?");
    button.type = "button";
    button.setAttribute("aria-label", "Explain " + cleanTip(label || "this item"));
    button.setAttribute("aria-controls", "simTooltip");
    button.setAttribute("aria-expanded", "false");
    return tagInfo(button, tip);
  }

  function blockHelpText(block) {
    var item = block || {};
    var explanation = cleanTip(item.help || "");
    return cleanTip(item.title) ? cleanTip(item.title) + ": " + explanation : explanation;
  }

  function fieldHelpText(label, context) {
    var name = cleanTip(label);
    var screen = cleanTip(context || "current form");
    if (/resolve condition/i.test(name)) return "The exact rule and source used to decide YES or NO. It is fixed before funds are committed so settlement cannot change later.";
    if (/^question$/i.test(name)) return "The claim traders evaluate. It should be answerable as YES or NO under the written resolve condition.";
    if (/close time/i.test(name)) return "The last time normal market trading is allowed before the result and review process begins.";
    if (/outcome|answer/i.test(name)) return "The YES, NO, or INSUFFICIENT_INFORMATION result that this " + screen + " records under the market's fixed rules.";
    if (/odds|price|limit/i.test(name)) return "The locked price for this order. A matching trade fills this price before using the next available liquidity.";
    if (/stake|bond|amount|cost/i.test(name)) return "The funds committed by this " + screen + ". The preview shows what is locked, spent, or placed at risk.";
    if (/source|evidence/i.test(name)) return "The material the verified jury reviews against the market's fixed resolution rules.";
    if (/return|shares|payout/i.test(name)) return "The estimated position or payout produced if this ticket fills under the displayed terms.";
    if (/fill/i.test(name)) return "The order-routing rule that decides which available liquidity is consumed first.";
    if (/^buy$/i.test(name)) return "The outcome claim and size this ticket will purchase when submitted.";
    return name + " is the value the " + screen + " uses when this step is submitted.";
  }

  function installSimTooltips() {
    if (document.getElementById("simTooltip")) return;
    var tip = makeEl("div", "sim-tooltip");
    tip.id = "simTooltip";
    tip.setAttribute("role", "tooltip");
    tip.setAttribute("aria-hidden", "true");
    document.body.appendChild(tip);
    var activeTarget = null;
    var pinnedTarget = null;

    function isSimTipTarget(target) {
      var match = target && target.closest && target.closest("#system-run [data-sim-tip]");
      if (!match || !match.isConnected || match.classList.contains("guided-target") || match.disabled || match.getAttribute("aria-disabled") === "true") return null;
      return match;
    }

    function position(target) {
      if (!target || !target.isConnected || !tip.classList.contains("is-visible")) return;
      var rect = target.getBoundingClientRect();
      var gap = 10;
      var maxLeft = Math.max(8, window.innerWidth - tip.offsetWidth - 8);
      var left = Math.min(maxLeft, Math.max(8, rect.left + rect.width / 2 - tip.offsetWidth / 2));
      var top = rect.top - tip.offsetHeight - gap;
      if (top < 8) top = rect.bottom + gap;
      tip.style.left = left + "px";
      tip.style.top = Math.max(8, top) + "px";
    }

    function show(target) {
      if (!target || !target.isConnected) return;
      var text = target && target.getAttribute("data-sim-tip");
      if (!text) return;
      if (activeTarget && activeTarget !== target && activeTarget.classList.contains("sim-help")) activeTarget.setAttribute("aria-expanded", "false");
      activeTarget = target;
      tip.textContent = text;
      tip.setAttribute("aria-hidden", "false");
      tip.classList.add("is-visible");
      setAttributeToken(target, "aria-describedby", "simTooltip", true);
      if (target.classList.contains("sim-help")) target.setAttribute("aria-expanded", "true");
      position(target);
    }

    function hide(target, force) {
      if (target && activeTarget && target !== activeTarget) return;
      if (!force && pinnedTarget && activeTarget === pinnedTarget) return;
      if (activeTarget && activeTarget.classList.contains("sim-help")) activeTarget.setAttribute("aria-expanded", "false");
      if (activeTarget) setAttributeToken(activeTarget, "aria-describedby", "simTooltip", false);
      activeTarget = null;
      tip.classList.remove("is-visible");
      tip.setAttribute("aria-hidden", "true");
    }

    document.addEventListener("mouseover", function (event) {
      var target = isSimTipTarget(event.target);
      if (!target || target === activeTarget) return;
      show(target);
    });
    document.addEventListener("mouseout", function (event) {
      var target = isSimTipTarget(event.target);
      if (!target || (event.relatedTarget && target.contains(event.relatedTarget))) return;
      hide(target);
    });
    document.addEventListener("focusin", function (event) {
      var target = isSimTipTarget(event.target);
      if (target) show(target);
    });
    document.addEventListener("focusout", function (event) {
      var target = isSimTipTarget(event.target);
      if (target) hide(target);
    });
    document.addEventListener("click", function (event) {
      if (activeTarget && !activeTarget.isConnected) {
        var staleTarget = activeTarget;
        pinnedTarget = null;
        hide(staleTarget, true);
      }
      var target = isSimTipTarget(event.target);
      if (target && target.classList.contains("sim-help")) {
        if (pinnedTarget === target) {
          pinnedTarget = null;
          hide(target, true);
        } else {
          if (pinnedTarget) hide(pinnedTarget, true);
          pinnedTarget = target;
          show(target);
        }
        return;
      }
      if (target && activeTarget === target) show(target);
      if (pinnedTarget) {
        var previous = pinnedTarget;
        pinnedTarget = null;
        hide(previous, true);
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || !activeTarget) return;
      var previous = activeTarget;
      pinnedTarget = null;
      hide(previous, true);
      previous.focus();
    });
    document.addEventListener("mousemove", function () {
      if (activeTarget) position(activeTarget);
    });
    window.addEventListener("scroll", function () {
      var previous = activeTarget;
      pinnedTarget = null;
      hide(previous, true);
    }, true);
    window.addEventListener("resize", function () {
      var previous = activeTarget;
      pinnedTarget = null;
      hide(previous, true);
    });
  }

  function updateSimulatorSizeState() {
    var demoEl = document.getElementById("productDemo");
    var width = demoEl ? Math.round(demoEl.getBoundingClientRect().width) : Math.round(window.innerWidth || 0);
    var isCompact = width <= 760;
    var isTight = width <= 540;
    var isUltra = width <= 380;
    if (demoEl) {
      demoEl.classList.toggle("sim-compact", isCompact);
      demoEl.classList.toggle("sim-tight", isTight);
      demoEl.classList.toggle("sim-ultra", isUltra);
    }
    if (isUltra) return "ultra";
    if (isTight) return "tight";
    if (isCompact) return "compact";
    return "wide";
  }

  function currentArtLayout() {
    return updateSimulatorSizeState();
  }

  function setTags(rootId, attr, unlocked) {
    Array.prototype.forEach.call(document.querySelectorAll("#" + rootId + " .unlock"), function (el) {
      var key = el.getAttribute(attr);
      var on = unlocked.indexOf(key) !== -1;
      el.classList.toggle("on", on);
      var tag = el.querySelector(".tag");
      if (tag) tag.textContent = on ? "online" : "locked";
    });
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function svgShell(title, desc, inner) {
    return [
      "<title id=\"stepSvgTitle\">" + esc(title) + "</title>",
      "<desc id=\"stepSvgDesc\">" + esc(desc) + "</desc>",
      "<defs>",
      "<marker id=\"stepArrow\" markerWidth=\"10\" markerHeight=\"10\" refX=\"8\" refY=\"3\" orient=\"auto\" markerUnits=\"strokeWidth\"><path d=\"M0,0 L0,6 L8,3 z\" fill=\"currentColor\"></path></marker>",
      "</defs>",
      "<rect x=\"0\" y=\"0\" width=\"720\" height=\"320\" rx=\"0\" fill=\"transparent\"></rect>",
      inner
    ].join("");
  }

  function flow(x1, y1, x2, y2, tone, hot) {
    var cls = "line " + (tone || "accent") + (hot ? " hot" : "");
    return "<path class=\"" + cls + "\" d=\"M" + x1 + "," + y1 + " C" + ((x1 + x2) / 2) + "," + y1 + " " + ((x1 + x2) / 2) + "," + y2 + " " + x2 + "," + y2 + "\" marker-end=\"url(#stepArrow)\"></path>";
  }

  function node(x, y, w, h, label, sub, tone, hot) {
    var cls = "body " + (tone || "soft");
    return [
      "<g class=\"" + (hot ? "pulse" : "") + "\">",
      "<rect class=\"" + cls + "\" x=\"" + x + "\" y=\"" + y + "\" width=\"" + w + "\" height=\"" + h + "\" rx=\"15\"></rect>",
      "<text class=\"label\" x=\"" + (x + 14) + "\" y=\"" + (y + 28) + "\">" + esc(label) + "</text>",
      "<text class=\"small\" x=\"" + (x + 14) + "\" y=\"" + (y + 49) + "\">" + esc(sub) + "</text>",
      "</g>"
    ].join("");
  }

  function person(x, y, label, tone, hot) {
    return [
      "<g class=\"" + (hot ? "pulse" : "bob") + "\">",
      "<circle class=\"" + (tone || "accent") + "\" cx=\"" + x + "\" cy=\"" + y + "\" r=\"23\"></circle>",
      "<circle class=\"soft\" cx=\"" + x + "\" cy=\"" + (y - 8) + "\" r=\"7\"></circle>",
      "<path class=\"line\" d=\"M" + (x - 11) + "," + (y + 13) + " Q" + x + "," + (y + 2) + " " + (x + 11) + "," + (y + 13) + "\"></path>",
      "<text class=\"tiny\" x=\"" + x + "\" y=\"" + (y + 43) + "\" text-anchor=\"middle\">" + esc(label) + "</text>",
      "</g>"
    ].join("");
  }

  function chip(x, y, label, tone, hot) {
    return [
      "<g class=\"" + (hot ? "pop pulse" : "") + "\">",
      "<rect class=\"" + (tone || "accent") + "\" x=\"" + x + "\" y=\"" + y + "\" width=\"86\" height=\"30\" rx=\"15\"></rect>",
      "<text class=\"tiny\" x=\"" + (x + 43) + "\" y=\"" + (y + 20) + "\" text-anchor=\"middle\">" + esc(label) + "</text>",
      "</g>"
    ].join("");
  }

  function gauge(x, y, w, label, value, tone, hot) {
    var width = Math.max(10, Math.min(w, w * value));
    return [
      "<g class=\"" + (hot ? "pulse" : "") + "\">",
      "<text class=\"tiny\" x=\"" + x + "\" y=\"" + (y - 8) + "\">" + esc(label) + "</text>",
      "<rect class=\"soft\" x=\"" + x + "\" y=\"" + y + "\" width=\"" + w + "\" height=\"18\" rx=\"9\"></rect>",
      "<rect class=\"" + (tone || "accent-fill") + "\" x=\"" + x + "\" y=\"" + y + "\" width=\"" + width + "\" height=\"18\" rx=\"9\"></rect>",
      "</g>"
    ].join("");
  }

  function seats(x, y, count, hot) {
    var out = ["<g class=\"" + (hot ? "pulse" : "") + "\">"];
    for (var i = 0; i < count; i += 1) {
      var cx = x + (i % 8) * 22;
      var cy = y + Math.floor(i / 8) * 24;
      out.push("<circle class=\"seat " + (hot ? "on" : "") + "\" cx=\"" + cx + "\" cy=\"" + cy + "\" r=\"8\"></circle>");
    }
    out.push("</g>");
    return out.join("");
  }

  var SCENE_ART = [
    {
      actor: { title: "Starter", sub: "$0.10 is enough", icon: "person", tone: "accent", mark: "$" },
      core: { title: "Escrow opens", sub: "funds are neutral first", icon: "vault", tone: "accent", mark: "LOCK" },
      result: { title: "Live market", sub: "the question exists", icon: "market", tone: "good", mark: "LIVE" },
      chips: [["Public market", "accent"], ["Any bet size", "accent"], ["Page opens", "good"]]
    },
    {
      actor: { title: "Choose an outcome", sub: "Buy YES or NO", icon: "crowd", tone: "accent", mark: "1X" },
      core: { title: "$50 position", sub: "counts like $54 if correct", icon: "ticket", tone: "accent", mark: "+8%" },
      result: { title: "Odds respond", sub: "YES moves 62 to 67", icon: "dial", tone: "good", mark: "67%" },
      chips: [["One choice", "good"], ["Clear amount", "accent"], ["Reward explained", "good"]]
    },
    {
      actor: { title: "Robust pool", sub: "two sides + depth + time", icon: "market", tone: "good", mark: "PASS" },
      core: { title: "Token conversion", sub: "pool claims become ERC-20s", icon: "tokens", tone: "accent", mark: "ERC" },
      result: { title: "Wallet market", sub: "YES/NO move anywhere", icon: "book", tone: "good", mark: "BOOK" },
      chips: [["Pool phase ends", "accent"], ["Self custody", "good"], ["Lending unlocked", "good"]]
    },
    {
      actor: { title: "ERC-20 sell orders", sub: "500 YES at 58c + 240 at 60c", icon: "tokens", tone: "accent", mark: "SELL" },
      core: { title: "Order-book routing", sub: "cheapest token orders first", icon: "ticket", tone: "accent", mark: "BEST" },
      result: { title: "740 ERC-20 YES filled", sub: "no pooled remainder", icon: "book", tone: "good", mark: "FILL" },
      chips: [["58c fills first", "good"], ["60c fills second", "accent"], ["64c untouched", "good"]]
    },
    {
      actor: { title: "Invite", sub: "private counterparties", icon: "room", tone: "accent", mark: "ROOM" },
      core: { title: "Private escrow", sub: "same neutral lock", icon: "vault", tone: "accent", mark: "LOCK" },
      result: { title: "Court-ready", sub: "private path, public rules", icon: "court", tone: "good", mark: "COURT" },
      chips: [["Invite only", "accent"], ["Fixed odds", "accent"], ["Same settlement", "good"]]
    },
    {
      actor: { title: "Solver auction", sub: "competing fixed quotes", icon: "tokens", tone: "good", mark: "BID" },
      core: { title: "Payout escrow", sub: "full maximum return locked", icon: "vault", tone: "accent", mark: "$336" },
      result: { title: "Parlay receipt", sub: "one tradeable claim", icon: "ticket", tone: "good", mark: "PAR" },
      chips: [["Best quote", "accent"], ["Protected lending", "good"], ["Junior risk spread", "bad"]]
    },
    {
      actor: { title: "Result happens", sub: "the real event is over", icon: "clock", tone: "accent", mark: "NOW" },
      core: { title: "Resolution bond", sub: "exact fee posted now", icon: "court", tone: "accent", mark: "BOND" },
      result: { title: "Atomic payment", sub: "case opens once", icon: "vault", tone: "good", mark: "READY" },
      chips: [["Policy locked", "accent"], ["Paid from caller bond", "accent"], ["Pool stays locked", "good"]]
    },
    {
      actor: { title: "Outcome backing", sub: "$118k remains locked", icon: "vault", tone: "good", mark: "OMEN" },
      core: { title: "Product handoff", sub: "case + bond payment", icon: "handoff", tone: "accent", mark: "SEND" },
      result: { title: "DemoThemis intake", sub: "draw-ready case", icon: "court", tone: "accent", mark: "CASE" },
      chips: [["Outcome backing stays", "good"], ["Bond paid", "accent"], ["Case locked", "accent"]]
    },
    {
      actor: { title: "Beacon", sub: "public randomness", icon: "beacon", tone: "accent", mark: "RAND" },
      core: { title: "One jury draw", sub: "no panel shopping", icon: "jury", tone: "accent", mark: "DRAW" },
      result: { title: "Verified seats", sub: "humans must appear", icon: "crowd", tone: "good", mark: "7" },
      chips: [["One roll", "accent"], ["7 seats", "good"], ["Face proofs", "good"]]
    },
    {
      actor: { title: "Drawn juror", sub: "live person check", icon: "person", tone: "good", mark: "ID" },
      core: { title: "Private ballot", sub: "encrypted and re-keyed", icon: "ballot", tone: "accent", mark: "VOTE" },
      result: { title: "Private reserve", sub: "lazy votes risk a private debit", icon: "reserve", tone: "bad", mark: "RISK" },
      chips: [["No receipt", "accent"], ["Bribe breaks", "good"], ["Reserve live", "bad"]]
    },
    {
      actor: { title: "Sealed votes", sub: "only aggregate opens", icon: "ballot", tone: "accent", mark: "BOX" },
      core: { title: "Verdict proof", sub: "tally changes prices", icon: "verdict", tone: "accent", mark: "PROOF" },
      result: { title: "Pending updates", sub: "wait for final verdict", icon: "reserve", tone: "soft", mark: "WAIT" },
      chips: [["Aggregate tally", "accent"], ["Private updates", "bad"], ["Not settled", "soft"]]
    },
    {
      actor: { title: "Losing side", sub: "wants another panel", icon: "person", tone: "bad", mark: "LOSE" },
      core: { title: "Appeal ladder", sub: "fresh larger panel", icon: "ladder", tone: "accent", mark: "15" },
      result: { title: "Larger jury", sub: "harder to buy", icon: "jury", tone: "good", mark: "BIG" },
      chips: [["Pay next panel", "accent"], ["Beat attack value", "bad"], ["Finite retries", "good"]]
    },
    {
      actor: { title: "Final escrow", sub: "market cannot reopen", icon: "vault", tone: "accent", mark: "END" },
      core: { title: "Quality evidence", sub: "completed case saved", icon: "score", tone: "accent", mark: "SCORE" },
      result: { title: "Better court", sub: "scores raise trust", icon: "score", tone: "good", mark: "UP" },
      chips: [["Final proof", "good"], ["Record saved", "accent"], ["Juror updates", "good"]]
    }
  ];


  var APP_PAGES = [
    {
      template: "create-market",
      product: "OmenMarketMaker",
      tabs: ["Create", "Explore", "Portfolio"],
      activeTab: "Create",
      account: "0xA1...ce",
      section: "Create market",
      title: "Will England win the UEFA Euro 2024 final?",
      subtitle: "Define the outcome rule, request timing, backstop, and fee policy, then deposit initial liquidity.",
      status: "Ready to publish",
      kpis: [],
      blocks: [
        { type: "fields", title: "Market form", hot: 0, editable: true, rows: [["Question", "Will England win the UEFA Euro 2024 final?", "input"], ["Close time", "14 July 2024 19:00 UTC", "input"], ["Resolve condition", "YES only if UEFA records England as the winner of the 14 July 2024 final; otherwise NO.", "textarea"], ["Earliest request", "At the written close condition", "input"], ["Final backstop", "15 July 2024 19:00 UTC", "input"], ["Fee policy", "CourtFeePolicy v1", "input"]] },
        { type: "liquidity", title: "Initial liquidity", hot: 0, offers: [["YES", "yes", "good"], ["NO", "no", "bad"]], note: "Deposit any amount into YES, NO, or both. Every deposit remains outcome collateral; an eligible caller posts the exact resolution bond only when review is requested." }
      ]
    },
    {
      template: "live-market",
      product: "OmenMarketMaker",
      tabs: ["Market", "Order", "Portfolio"],
      activeTab: "Market",
      account: "0x7c...42",
      route: "/m/england-euro-final",
      section: "Live market",
      title: "England wins the Euro 2024 final?",
      subtitle: "Choose an outcome and enter the amount you want to buy.",
      status: "Open for trading",
      kpis: [],
      blocks: [
        { type: "marketTrade", title: "Buy an outcome", hot: 0, wide: true, yes: 62, no: 38, selected: "YES", amount: "$50", balance: "$740", reward: "+8%", rewardValue: "$54", rewardCopy: "If your outcome wins, your $50 is treated like $54 when winnings are divided.", pricingCopy: "YES and NO backing sets the odds. Every deposit remains collateral. At resolution, a caller posts the exact court fee; YES or NO later reimburses it pro-rata, while insufficient information leaves the pool whole.", activity: [["YES purchase", "+$120", "62%"], ["NO purchase", "+$80", "38%"], ["YES purchase", "+$42", "61%"]] }
      ]
    },
    {
      template: "token-lending",
      product: "OmenMarketMaker Earn",
      tabs: ["Earn", "Positions", "Assets"],
      activeTab: "Earn",
      route: "/earn/england-euro-final",
      section: "Graduated ERC-20 market",
      title: "Wallet-held YES is ready to earn",
      subtitle: "The pool passed its liquidity, two-sided participation, and time checks before converting claims into transferable ERC-20 YES and NO tokens. Court funding is separate.",
      status: "Claims tokenized",
      kpis: [["Wallet YES", "820.6"], ["Estimated APY", "12.4%"], ["Total deposits", "$284k"]],
      blocks: [
        { type: "yield", title: "Deposit YES to earn", hot: 0, wide: true, asset: "YES", market: "England final · YES lending", balance: "820.6 YES", amount: "250.0", apy: "12.4%", daily: "0.0320%", tvl: "$284,100", utilization: "68%", estimate30: "+2.55 YES", estimateYear: "+31.00 YES", withdraw: "Any time", depositFee: "0%", collateral: "Maximum-value backed", help: "The robustness gate converted the original pool claim into wallet-held ERC-20 YES. Deposit it into protected lending; the displayed APY changes with borrowing demand." }
      ]
    },
    {
      template: "order-book",
      product: "OmenMarketMaker",
      tabs: ["Order book", "Trade", "Portfolio"],
      activeTab: "Order book",
      route: "/m/england-euro-final/order-book",
      section: "Graduated ERC-20 market",
      title: "Buy 740 YES at the best available prices",
      subtitle: "The pool phase has ended. Wallet-held ERC-20 YES limit orders now trade at exact prices.",
      status: "Ready to buy",
      kpis: [["Quantity", "740 YES"], ["Average", "58.65c"], ["Total", "$434.00"]],
      blocks: [
        { type: "fill", title: "How your order will fill", hot: 0, help: "The order book sorts wallet-held ERC-20 YES sell orders from cheapest to most expensive and fills only the quantity you request.", requestLabel: "Your order", request: "Buy 740 ERC-20 YES", sources: [["Best limit order", "500 YES available", "58\u00a2", "order", "Fills first because it is cheapest", "The seller locked 500 wallet-held ERC-20 YES tokens behind this limit order."], ["Next limit order", "240 YES needed", "60\u00a2", "order", "Fills the remaining quantity", "The next-cheapest seller fills the remaining 240 ERC-20 YES at 60 cents."], ["Higher limit order", "Not used", "64\u00a2", "unused", "Skipped because it costs more", "The 64-cent order remains untouched because the full purchase is complete at cheaper prices."]], segments: [["500 at 58\u00a2", 67.57, "order"], ["240 at 60\u00a2", 32.43, "order"]], routeLabel: "500 ERC-20 YES at 58 cents followed by 240 ERC-20 YES at 60 cents", math: [["First limit order", "500 x 58\u00a2 = $290.00"], ["Second limit order", "240 x 60\u00a2 = $144.00"], ["Average price", "58.65\u00a2 per YES"], ["Trading fee", "$0.00"]], totalLabel: "Estimated total", totalValue: "$434.00", note: "Every fill is the same wallet-held ERC-20 YES token. The original pool is no longer a trading source." }
      ]
    },
    {
      template: "private-room",
      product: "OmenMarketMaker Rooms",
      tabs: ["Room", "Terms", "Escrow"],
      activeTab: "Room",
      route: "/rooms/new",
      section: "Optional format · Private wager",
      title: "England final private room",
      subtitle: "Invite Bob to accept the answer rule and a $10,000 stake.",
      status: "Draft room",
      kpis: [["Visibility", "Private"], ["Terms", "Editable"], ["Escrow", "$0 locked"]],
      blocks: [
        { type: "participants", title: "Counterparties", hot: 0, people: [["Alice", "Proposing YES"], ["Bob", "Invite not sent"]] },
        { type: "fields", title: "Draft terms", hot: 1, editable: true, rows: [["Outcome", "England wins Euro 2024", "input"], ["Your side", "YES", "input"], ["Stake per side", "$10,000", "input"], ["Winner receives", "$20,000", "input"], ["Resolve condition", "YES only if UEFA records England as the winner of the 14 July 2024 final; otherwise NO.", "textarea"]] }
      ]
    },
    {
      template: "parlay-slip",
      product: "OmenMarketMaker Parlays",
      tabs: ["Slip", "Markets", "Cashout"],
      activeTab: "Slip",
      route: "/parlays/new",
      section: "Optional format · Parlay builder",
      title: "England wins + Rain tomorrow",
      subtitle: "2 selections · The best solver must lock the full payout.",
      status: "Ready to place",
      user: "0x7c...42",
      actor: "Parlay bettor",
      kpis: [["Legs", "2"], ["Stake", "$100"], ["Max return", "$336"]],
      blocks: [
        { type: "legs", title: "Bet slip", hot: 0, legs: [["England wins", "YES 62c"], ["Rain tomorrow", "YES 48c"]], payout: "$100 stake · Max return $336 (3.36x)" },
        { type: "capital", title: "Who provides capital and what they earn", help: "Token lending, junior risk capital, and solver quoting are separate roles.", items: [["Protected lending", "YES/NO token lenders", "Earn borrowing interest while maximum-value collateral protects the token's original outcome payoff.", "protected", "This is the yield-bearing token feature. It is separate from posting a sell order in the market."], ["Risk capital", "Junior vault depositors", "Earn the parlay spread and knowingly absorb correlation risk between the selected outcomes.", "risk", "Junior capital earns directly from parlay activity because it accepts the risk protected lenders do not."], ["Price competition", "Solvers", "Compete to quote the whole parlay. The winner must lock the full $336 maximum payout before execution.", "", "Solvers price and execute the bundle; they are not described as market makers."]], note: "No role is silently treated as a market maker, and no payout can execute without full backing." }
      ]
    },
    {
      template: "resolution-request",
      product: "OmenMarketMaker",
      tabs: ["Resolution", "Market", "Funds"],
      activeTab: "Resolution",
      route: "/markets/england-euro-final/resolution",
      account: "0x4b...91",
      actor: "Resolution caller",
      section: "Court-backed resolution",
      title: "Post the exact resolution bond",
      subtitle: "The locked policy sets a $92 court fee.",
      status: "Bond required",
      kpis: [["Outcome backing", "$118k locked"], ["Resolution bond", "$92"], ["Fee policy", "v1"]],
      blocks: [
        { type: "record", title: "Resolution request", hot: 0, value: "EURO-FINAL · Eligible", caption: "Request-time calculation", details: [["Question", "Did England win the UEFA Euro 2024 final?"], ["Exact court fee", "$92"], ["Bond payer", "0x4b...91"], ["Outcome backing", "$118,000 · remains at OmenMarketMaker"]] },
        { type: "table", title: "Bond consequences", rows: [["Resolution bond", "$92 caller-funded", "pay DemoThemis"], ["Final YES or NO", "YES + NO pro-rata", "reimburse caller"], ["Insufficient information", "Market pool untouched", "bond not reimbursed"]] },
        { type: "odds", title: "Secondary trading live", yes: 91, no: 9 }
      ]
    },
    {
      template: "court-handoff",
      product: "OmenMarketMaker",
      tabs: ["Handoff", "Case", "Market"],
      activeTab: "Handoff",
      account: "Protocol",
      actor: "Court intake",
      route: "/markets/england-euro-final/court-handoff",
      section: "Product handoff",
      title: "Lock the case before the draw",
      subtitle: "Only the fixed case and caller's bond payment move to DemoThemis. Outcome collateral remains at OmenMarketMaker.",
      status: "Handoff ready",
      statusTone: "neutral",
      kpis: [["Case", "Prepared"], ["Bond payment", "$92 paid"], ["Outcome backing", "Stays at Omen"]],
      blocks: [
        { type: "record", title: "Bonded handoff", hot: 0, value: "Case #1182 · Ready", caption: "Two products, separate custody", details: [["Case and evidence rules", "Move to DemoThemis"], ["Resolution payment", "$92 caller bond"], ["Outcome collateral", "$118,000 · stays at OmenMarketMaker"], ["Return path", "Signed final ruling"]] },
        { type: "table", title: "Product boundary", rows: [["OmenMarketMaker", "Holds outcome collateral", "unchanged"], ["DemoThemis", "Receives paid case", "draw next"], ["Governance", "Independent", "both products"]] },
        { type: "odds", title: "Current market odds", hot: 0, yes: 91, no: 9 }
      ]
    },
    {
      template: "protocol-draw",
      product: "DemoThemis on-chain sequence",
      tabs: ["Activity", "Draw", "Presence"],
      activeTab: "Activity",
      section: "On-chain sequence",
      title: "Bound panel selection",
      subtitle: "A public seed selects the first 7-seat panel for this case.",
      status: "Awaiting draw event",
      kpis: [["Draws", "Pending"], ["Seats", "7"], ["Reroll", "No"]],
      blocks: [
        { type: "beacon", title: "Randomness beacon", hot: 0, code: "0x8fd9...c41a + case #1182", note: "One public seed binds this panel." },
        { type: "seats", title: "Panel slots", hot: 0, count: 7, on: 0 }
      ]
    },
    {
      template: "juror-workspace",
      product: "DemoThemis",
      tabs: ["Evidence", "Ballot", "Reserve"],
      activeTab: "Ballot",
      account: "Juror 04",
      route: "/cases/1182/ballot",
      section: "Ballot",
      title: "Case #1182",
      subtitle: "Research, then vote privately.",
      status: "Ready to vote",
      kpis: [["Juror fee", "$92"], ["Panel", "7"]],
      blocks: [
        { type: "evidence", title: "Case file", hot: 0, rows: [["Question", "Did England win the UEFA Euro 2024 final on 14 July 2024?"], ["Answer rule", "YES if UEFA records England as winner; otherwise NO."], ["Sources", "None supplied"], ["Research", "Check independent public sources."]] },
        { type: "ballot", title: "Encrypted ballot", hot: 0, options: [["YES", "good"], ["NO", "bad"], ["INSUFFICIENT INFORMATION", "insufficient"]] }
      ]
    },
    {
      template: "protocol-tally",
      product: "DemoThemis on-chain sequence",
      tabs: ["Activity", "Threshold", "Proof"],
      activeTab: "Activity",
      section: "On-chain sequence",
      title: "Waiting for 7 ballots",
      subtitle: "The proof waits for every drawn seat.",
      status: "Ballots 1/7",
      kpis: [["Ballots", "1/7"], ["Privacy", "Kept"]],
      blocks: [
        { type: "route", title: "Ballot arrivals", hot: 0, steps: [["04", "Ballot", "received"], ["09", "Ballot", "pending"], ["+5", "Other seats", "pending"]] },
        { type: "proof", title: "Tally", hot: 1, result: "Locked", note: "Opens at 7/7.", verified: false }
      ]
    },
    {
      template: "appeal-review",
      product: "OmenMarketMaker",
      activeTab: "Resolution",
      account: "0x51...9b",
      route: "/markets/england-euro-final/resolution",
      tabs: ["Resolution", "Market", "Position"],
      section: "Resolution pending",
      title: "Provisional result: NO",
      subtitle: "The first DemoThemis jury returned NO 4–3. Settlement stays paused while a public funding round can pay for a fresh jury.",
      status: "Appeal window open",
      statusTone: "neutral",
      kpis: [["Provisional result", "NO 4–3"], ["Your position", "YES"], ["Time left", "14 days"]],
      blocks: [
        { type: "record", title: "Provisional court result", open: true, icon: "shield-check", value: "NO 4–3 · Provisional", caption: "Verified DemoThemis proof", details: [["Question", "Did England win the UEFA Euro 2024 final?"], ["Your position", "YES · currently losing"], ["Settlement", "Paused until the appeal window closes"], ["Deadline", "29 Jul 2024, 22:30 UTC"]], note: "This result is checkable but not final. OmenMarketMaker still holds the $118,000 market escrow." },
        { type: "table", title: "How the appeal works", rows: [["Open public goal", "$31,000 before deadline", "next"], ["Tagged service fee", "$14,200 panel + delay", "consumed once"], ["Security bond", "$16,800 in escrow", "return or forfeit"], ["Goal stays short", "Every wallet refunded", "no jury"]] }
      ]
    },
    {
      template: "protocol-relay",
      product: "DemoThemis on-chain sequence",
      tabs: ["Activity", "Finality", "Relay"],
      activeTab: "Activity",
      section: "On-chain sequence",
      title: "Final proof relay",
      subtitle: "The closed appeal proof is ready for one-time delivery to OmenMarketMaker.",
      status: "Relay pending",
      kpis: [["Verdict", "NO"], ["Appeals", "Closed"], ["Proof", "Ready"]],
      blocks: [
        { type: "closed", title: "Final verdict", hot: 0, value: "NO 9-6" },
        { type: "table", title: "Court record", hot: 1, rows: [["Resolved case", "Ready", "quality evidence"], ["Juror updates", "Private", "future cases"], ["Final proof", "Ready", "OmenMarketMaker"]] }
      ]
    }
  ];

  var APP_FLOWS = [
    {
      start: { activeTab: "Create", account: "0xA1...ce", actor: "Market creator" },
      steps: [
        {
          cue: "Tap Publish market",
          target: "block",
          targetTitle: "Market form",
          result: "Market posted",
          toast: { title: "Market published", body: "Trading is live", detail: "PM-EURO-24 · Opening liquidity locked" },
          after: {
            route: "/m/england-euro-final",
            section: "Live market",
            title: "Public market page",
            subtitle: "The market is open, shareable, and ready for traders.",
            status: "Trading open",
            activeTab: "Explore",
            account: "0xA1...ce",
            kpis: [],
            blocks: [
              { type: "odds", title: "Opening odds", yes: 100, no: 0 },
              { type: "record", title: "Market details", value: "PM-EURO-24 · Trading open", caption: "Permanent market record", details: [["Creator", "0xA1...ce"], ["Initial liquidity", "$0.10 YES deposited into protocol escrow"], ["Closes", "14 July 2024 19:00 UTC"], ["Resolve rule", "YES only if UEFA records England as the winner; otherwise NO."]] }
            ]
          }
        }
      ]
    },
    {
      start: { activeTab: "Market", account: "0x7c...42", actor: "Trader" },
      steps: [
        {
          cue: "Tap Buy YES for $50",
          target: "block",
          targetTitle: "Buy an outcome",
          result: "Position added",
          toast: { title: "Position added", body: "$50 outcome purchase confirmed", detail: "The market odds moved and your early-entry reward is active" },
          after: {
            status: "Position added",
            activeTab: "Market",
            subtitle: "Your $50 purchase moved the market odds. Your position remains visible here.",
            kpis: [],
            blocks: [
              { type: "marketTrade", title: "Your market position", wide: true, yes: 67, no: 33, selected: "YES", amount: "$50", balance: "$690", reward: "+8%", rewardValue: "$54", rewardCopy: "If your outcome wins, your $50 is treated like $54 when winnings are divided.", position: "$50 YES", pricingCopy: "Money backing YES and NO is held together until resolution. The balance between the two sides sets the current odds. This shared total is called the market pool.", activity: [["Your YES purchase", "+$50", "67%"], ["YES purchase", "+$120", "62%"], ["NO purchase", "+$80", "38%"]] }
            ]
          }
        }
      ]
    },
    {
      start: { activeTab: "Order book", account: "0x7c...42", actor: "Trader" },
      steps: [
        {
          cue: "Tap Buy 740 YES at best prices",
          target: "block",
          targetTitle: "How your order will fill",
          result: "Cheapest ERC-20 limit orders filled first",
          toast: { title: "740 ERC-20 YES purchased", body: "500 at 58¢ + 240 at 60¢", detail: "Average price 58.65¢ · Total $434.00" },
          after: {
            title: "740 YES purchased at the best available prices",
            subtitle: "The order book filled the cheapest wallet-held ERC-20 YES orders first.",
            status: "Order filled",
            activeTab: "Order book",
            kpis: [["Wallet YES", "740"], ["Avg. price", "58.65c"], ["Balance", "$306.00"]],
            blocks: [
              { type: "fill", title: "Best-price fill complete", requestLabel: "Purchased", request: "740 ERC-20 YES", sources: [["Best limit order", "500 YES purchased", "58¢", "order", "$290.00 · filled first", "The seller's locked ERC-20 YES tokens guaranteed this price."], ["Next limit order", "240 YES purchased", "60¢", "order", "$144.00 · filled second", "The next-cheapest ERC-20 YES order filled the remaining quantity."], ["Higher limit order", "Not used", "64¢", "unused", "Skipped because it cost more", "The 64-cent order remained untouched because the full purchase completed at cheaper prices."]], segments: [["500 at 58¢", 67.57, "order"], ["240 at 60¢", 32.43, "order"]], routeLabel: "Completed fill: 500 ERC-20 YES at 58 cents and 240 ERC-20 YES at 60 cents", math: [["First limit order", "500 x 58¢ = $290.00"], ["Second limit order", "240 x 60¢ = $144.00"], ["Average price", "58.65¢ per YES"], ["Trading fee", "$0.00"]], totalLabel: "Total paid", totalValue: "$434.00", note: "Every fill used the same ERC-20 YES token; the original market pool was not used." },
              { type: "record", title: "Trade record", value: "PM-YES-740", caption: "Transaction and proof details", details: [["Quantity", "740 ERC-20 YES"], ["Average price", "58.65c"], ["Total", "$434.00"], ["Fee", "$0.00"]] }
            ]
          }
        }
      ]
    },
    {
      start: {
        route: "/earn/england-euro-final",
        title: "Wallet-held YES is ready to earn",
        subtitle: "The pool passed its robustness checks and converted its claims into transferable ERC-20 YES and NO tokens.",
        status: "Claims tokenized",
        activeTab: "Earn",
        kpis: [["Wallet YES", "820.6"], ["Estimated APY", "12.4%"], ["Total deposits", "$284k"]],
        blocks: [
          { type: "yield", title: "Deposit YES to earn", wide: true, asset: "YES", market: "England final · YES lending", balance: "820.6 YES", amount: "250.0", apy: "12.4%", daily: "0.0320%", tvl: "$284,100", utilization: "68%", estimate30: "+2.55 YES", estimateYear: "+31.00 YES", withdraw: "Any time", depositFee: "0%", collateral: "Maximum-value backed", help: "Deposit wallet-held YES or NO into protected lending. The displayed APY is an estimate that changes with borrowing demand." }
        ]
      },
      steps: [
        {
          cue: "Tap Deposit 250 YES",
          target: "block",
          targetTitle: "Deposit YES to earn",
          result: "250 YES deposited into protected lending",
          toast: { title: "Deposit confirmed", body: "250 YES now earning", detail: "Estimated APY 12.4% · variable with borrowing demand" },
          after: {
            route: "/earn/england-euro-final",
            title: "Your YES liquidity is earning",
            subtitle: "Borrowers pay variable interest while maximum-value collateral protects the original outcome exposure.",
            status: "Earning live",
            activeTab: "Earn",
            kpis: [["Deposited", "250 YES"], ["Estimated APY", "12.4%"], ["Earned", "0.00 YES"]],
            blocks: [
              { type: "yield", title: "Deposit YES to earn", wide: true, position: "250 YES deposited", asset: "YES", market: "England final · YES lending", balance: "570.6 YES", amount: "250.0", apy: "12.4%", daily: "0.0320%", tvl: "$284,350", utilization: "68%", estimate30: "+2.55 YES", estimateYear: "+31.00 YES", withdraw: "Any time", depositFee: "0%", collateral: "Maximum-value backed", help: "The position remains on this page. Yield is variable and comes from protected borrowing demand, not from an order-book offer." }
            ]
          }
        }
      ]
    },
    {
      start: {
        route: "/rooms/new",
        status: "Room draft",
        activeTab: "Room",
        user: "Alice",
        actor: "Alice",
        kpis: [["Visibility", "Private"], ["Terms", "Editable"], ["Escrow", "$0 locked"]],
        blocks: [
          { type: "participants", title: "Counterparties", people: [["Alice", "Proposing YES"], ["Bob", "Invite not sent"]] },
          { type: "fields", title: "Draft terms", editable: true, rows: [["Outcome", "England wins Euro 2024", "input"], ["Your side", "YES", "input"], ["Stake per side", "$10,000", "input"], ["Winner receives", "$20,000", "input"], ["Resolve condition", "YES only if UEFA records England as the winner of the 14 July 2024 final; otherwise NO.", "textarea"]] }
        ]
      },
      steps: [
        {
          cue: "Tap Invite Bob",
          roleHandoff: "Alice to Bob",
          target: "block",
          targetTitle: "Counterparties",
          result: "Invite sent",
          after: {
            route: "/rooms/PM-ROOM-204",
            title: "Bob reviews the room terms",
            subtitle: "The invited counterparty must accept before either stake is locked.",
            status: "Bob reviewing",
            activeTab: "Terms",
            user: "Bob",
            actor: "Bob",
            kpis: [["Visibility", "Private"], ["Bob", "Reviewing"], ["Escrow", "$0 locked"]],
            blocks: [
              { type: "participants", title: "Counterparties", people: [["Alice", "Proposing YES"], ["Bob", "Reviewing terms"]] },
              { type: "fields", title: "Visible terms", editable: false, rows: [["Outcome", "England wins Euro 2024", "input"], ["Your side", "YES", "input"], ["Stake per side", "$10,000", "input"], ["Winner receives", "$20,000", "input"], ["Resolve condition", "YES only if UEFA records England as the winner of the 14 July 2024 final; otherwise NO.", "textarea"]] }
            ]
          }
        },
        {
          cue: "Tap Accept & fund room",
          target: "block",
          targetTitle: "Visible terms",
          result: "Room accepted and funded",
          toast: { title: "Room funded", body: "$20,000 locked", detail: "Alice and Bob confirmed the same terms" },
          after: {
            route: "/rooms/PM-ROOM-204/escrow",
            title: "Private room funded",
            subtitle: "Both parties signed. $20,000 is locked until settlement.",
            status: "Escrow locked",
            activeTab: "Escrow",
            user: "Bob",
            actor: "Bob",
            kpis: [["Visibility", "Private"], ["Signatures", "2/2"], ["Escrow", "$20k"]],
            blocks: [
              { type: "participants", title: "Counterparties", people: [["Alice", "Signed YES"], ["Bob", "Signed NO"]] },
              { type: "record", title: "Escrow record", value: "$20,000 locked", caption: "Permanent agreement record", details: [["Alice", "$10,000 · YES"], ["Bob", "$10,000 · NO"], ["Status", "Both signed"], ["Room", "PM-ROOM-204"]] },
              { type: "checklist", title: "Final resolution", rows: [["Provider", "DemoThemis"], ["Status", "Required at close"]] }
            ]
          }
        }
      ]
    },
    {
      start: { view: "application", activeTab: "Slip", user: "0x7c...42", actor: "Parlay bettor", actionOwner: "user" },
      steps: [
        {
          cue: "Tap Place $100 parlay",
          roleHandoff: "Parlay bettor to solver auction",
          target: "block",
          targetTitle: "Bet slip",
          result: "Parlay order submitted",
          after: {
            view: "sequence",
            sequenceProfile: "omen",
            sequenceProgress: 1,
            surface: "omen",
            actor: "Solver network",
            actionOwner: "protocol",
            template: "parlay-execution",
            route: "",
            product: "OmenMarketMaker solver execution",
            title: "Selecting and backing the parlay",
            subtitle: "The winning solver must lock the full $336 maximum payout before the order can execute.",
            status: "Solver auction live",
            user: "",
            kpis: [["Order", "$100"], ["Max escrow", "$336"], ["Solvers", "3"]],
            sequenceSteps: [
              { actionLabel: "Collect solver quotes", ownerLabel: "Auction" },
              { actionLabel: "Lock $336 maximum payout", ownerLabel: "Winning solver" },
              { actionLabel: "Mint one parlay receipt", ownerLabel: "Protocol" }
            ],
            blocks: [
              { type: "table", title: "Solver auction", rows: [["Solver A", "3.18x", "outbid"], ["Solver B", "3.36x", "winner"], ["Solver C", "3.24x", "outbid"]] },
              { type: "table", title: "Execution guarantee", rows: [["Maximum payout", "$336", "locked"], ["Receipt", "PM-4821", "minting"]] }
            ]
          }
        },
        {
          cue: "Complete solver-backed placement",
          actionLabel: "Complete solver-backed placement",
          roleHandoff: "Winning solver to Parlay bettor",
          actionOwner: "protocol",
          autoAdvance: true,
          autoDelay: 1700,
          target: "block",
          targetTitle: "Solver auction",
          result: "Parlay confirmed",
          toast: { title: "Parlay placed", body: "$336 maximum payout locked", detail: "One tradeable receipt minted" },
          after: {
            view: "application",
            sequenceProfile: "",
            surface: "omen",
            actor: "Parlay bettor",
            actionOwner: "user",
            template: "parlay-position",
            route: "/parlays/PM-4821",
            product: "OmenMarketMaker Parlays",
            section: "Optional format · Open parlay",
            title: "Parlay placed",
            subtitle: "Your fully backed receipt is active. Solver cashout bids update with live prices.",
            status: "Confirmed",
            activeTab: "Cashout",
            user: "0x7c...42",
            kpis: [["Stake", "$100"], ["Max return", "$336"], ["Status", "Active"]],
            blocks: [
              { type: "legs", title: "Your parlay", legs: [["England wins", "YES 62c"], ["Rain tomorrow", "YES 48c"]], payout: "Max return $336" },
              { type: "ticket", title: "Best cashout bid", rows: [["Winning solver bid", "$128"], ["Profit", "+$28"], ["Quote expires", "00:15"]], summaryLabel: "Cashout amount", summaryValue: "$128" },
              { type: "record", title: "Parlay receipt", value: "PM-4821 · Tradeable", caption: "Permanent receipt record", details: [["Maximum payout escrow", "$336 locked"], ["Wallet", "0x7c...42"], ["Status", "Confirmed"], ["Transaction", "0xa81f...9c2e"], ["Time", "14 Jul 2024 · 18:42 UTC"]] }
            ]
          }
        },
        {
          cue: "Tap Accept $128 cashout",
          roleHandoff: "Parlay bettor to solver cashout auction",
          target: "block",
          targetTitle: "Best cashout bid",
          result: "Cashout order submitted",
          after: {
            view: "sequence",
            sequenceProfile: "omen",
            sequenceProgress: 1,
            surface: "omen",
            actor: "Solver network",
            actionOwner: "protocol",
            template: "cashout-execution",
            route: "",
            product: "OmenMarketMaker solver execution",
            title: "Auctioning the parlay receipt",
            subtitle: "Competing solvers bid for the single receipt before $128 returns to the wallet.",
            status: "Cashout auction",
            user: "",
            kpis: [["Best bid", "$128"], ["Bids", "4"], ["Receipt", "1"]],
            sequenceSteps: [
              { actionLabel: "Collect cashout bids", ownerLabel: "Auction" },
              { actionLabel: "Transfer the receipt", ownerLabel: "Protocol" },
              { actionLabel: "Return $128", ownerLabel: "Winning solver" }
            ],
            blocks: [
              { type: "table", title: "Cashout auction", rows: [["Solver D", "$124", "outbid"], ["Solver B", "$128", "winner"], ["Solver A", "$126", "outbid"]] },
              { type: "table", title: "Cashout guarantee", rows: [["Receipt", "PM-4821", "transferred"], ["Winning bid", "$128", "locked"]] }
            ]
          }
        },
        {
          cue: "Complete receipt cashout",
          actionLabel: "Complete receipt cashout",
          roleHandoff: "Winning solver to Parlay bettor",
          actionOwner: "protocol",
          autoAdvance: true,
          autoDelay: 1700,
          target: "block",
          targetTitle: "Cashout auction",
          result: "$128 payment confirmed",
          toast: { title: "Cashout complete", body: "$128 received", detail: "$28 profit · Position closed" },
          after: {
            view: "application",
            sequenceProfile: "",
            surface: "omen",
            actor: "Parlay bettor",
            actionOwner: "simulator",
            template: "parlay-position",
            route: "/parlays/PM-4821/cashout",
            product: "OmenMarketMaker Parlays",
            section: "Optional format · Closed parlay",
            title: "Cashout complete",
            subtitle: "$128 was sent to the connected wallet.",
            status: "Confirmed",
            activeTab: "Cashout",
            user: "0x7c...42",
            kpis: [["Received", "$128"], ["Profit", "+$28"], ["Position", "Closed"]],
            blocks: [
              { type: "settlement", title: "Cashout result", label: "Received", value: "$128.00", delta: "+$28 profit", status: "Paid", details: [["Wallet", "0x7c...42"], ["Network", "World Chain"], ["Transaction", "0xc42a...71be"], ["Time", "14 Jul 2024 · 19:16 UTC"]] },
              { type: "table", title: "Closed position", rows: [["Order", "PM-4821", "closed"], ["Stake", "$100", "settled"], ["Profit", "+$28", "paid"]] }
            ]
          }
        }
      ]
    },
    {
      start: {
        route: "/markets/england-euro-final/resolution",
        section: "Resolution",
        title: "Post the resolution bond",
        subtitle: "$92 exact fee; outcome backing stays.",
        status: "Bond required",
        activeTab: "Resolution",
        account: "0x4b...91",
        actor: "Resolution caller",
        kpis: [["Outcome backing", "$118k locked"], ["Resolution bond", "$92"], ["Fee policy", "v1"]],
        blocks: [
          { type: "record", title: "Resolution request", value: "EURO-FINAL · Eligible", caption: "Request-time calculation", details: [["Exact court fee", "$92"], ["Bond payer", "0x4b...91"], ["Outcome backing", "$118,000 · stays here"]] },
          { type: "table", title: "Bond consequences", rows: [["Caller bond", "$92", "pay court now"], ["YES or NO", "pool reimburses", "pro-rata"], ["Insufficient information", "no reimbursement", "pool untouched"]] },
          { type: "odds", title: "Secondary trading live", yes: 91, no: 9 }
        ]
      },
      steps: [
        {
          cue: "Tap Post resolution bond",
          target: "block",
          targetTitle: "Resolution request",
          result: "Resolution bond paid",
          toast: { title: "Court fee paid", body: "Case #1182 prepared", detail: "$92 caller bond · outcome pool untouched" },
          after: {
            route: "/markets/england-euro-final/resolution/funded",
            section: "Resolution",
            title: "Resolution bond paid",
            subtitle: "Case paid; outcome backing stays.",
            status: "Handoff ready",
            statusTone: "neutral",
            activeTab: "Resolution",
            account: "Protocol",
            actor: "Resolution caller",
            kpis: [["Outcome backing", "$118k locked"], ["Court fee", "$92 paid"], ["Bond payer", "0x4b...91"]],
            blocks: [
              { type: "record", title: "Bonded resolution", value: "Case #1182 · Prepared", caption: "Caller-funded", details: [["Question and rules", "Locked"], ["DemoThemis fee", "$92 paid from bond"], ["Outcome collateral", "$118,000 · stays here"], ["Transaction", "0x31ab…90f2"]] },
              { type: "table", title: "Product boundary", rows: [["Crosses next", "Case + bond payment", "ready"], ["Does not cross", "Outcome collateral", "stays at Omen"]] },
              { type: "odds", title: "Secondary trading live", yes: 91, no: 9 }
            ]
          }
        }
      ]
    },
    {
      start: {
        route: "/markets/england-euro-final/court-handoff",
        section: "Handoff",
        title: "Lock the case before the draw",
        subtitle: "Bonded case moves; backing stays.",
        status: "Handoff ready",
        statusTone: "neutral",
        activeTab: "Handoff",
        account: "Protocol",
        actor: "Court intake",
        kpis: [["Case", "Prepared"], ["Bond payment", "$92 paid"], ["Outcome backing", "Stays at Omen"]],
        blocks: [
          { type: "record", title: "Bonded handoff", value: "Case #1182 · Ready", caption: "Separate custody", details: [["Case and evidence rules", "Move to DemoThemis"], ["Resolution payment", "$92 caller bond"], ["Outcome collateral", "$118,000 · stays at OmenMarketMaker"], ["Return path", "Signed final ruling"]] },
          { type: "table", title: "Product boundary", rows: [["OmenMarketMaker", "Holds outcome collateral", "unchanged"], ["DemoThemis", "Receives paid case", "draw next"]] },
          { type: "odds", title: "Current market odds", yes: 91, no: 9 }
        ]
      },
      steps: [
        {
          cue: "Tap Lock case and court fee",
          target: "block",
          targetTitle: "Bonded handoff",
          result: "DemoThemis case accepted",
          toast: { title: "Case accepted", body: "Case #1182 · court fee paid", detail: "Outcome collateral stays at OmenMarketMaker" },
          after: {
            route: "/markets/england-euro-final/court-case",
            context: "Case #1182",
            section: "Intake",
            title: "DemoThemis case accepted",
            subtitle: "Funded before the draw.",
            status: "Draw ready",
            statusTone: "neutral",
            activeTab: "Case",
            account: "Protocol",
            actor: "Court intake",
            kpis: [["Case", "#1182"], ["Panel plan", "7 seats"], ["Outcome backing", "At Omen"]],
            blocks: [
              { type: "record", title: "Court intake", value: "Case #1182 · Draw ready", caption: "Case record", details: [["Rules", "Locked"], ["Value", "$118,000"], ["Panel", "7 seats"], ["Court fee", "$92 paid"]] },
              { type: "table", title: "Separate custody", rows: [["Outcome collateral", "$118,000", "locked at Omen"], ["DemoThemis fee", "Paid from caller bond", "court work"], ["Final ruling", "Returns to Omen", "after appeals"]] },
              { type: "odds", title: "Secondary trading live", yes: 91, no: 9 }
            ]
          }
        }
      ]
    },
    {
      start: {
        surface: "protocol",
        actor: "Network",
        actionOwner: "protocol",
        status: "Awaiting draw event",
        activeTab: "Activity",
        kpis: [["Draws", "Pending"], ["Seats", "7"], ["Reroll", "No"]],
        blocks: [
          { type: "beacon", title: "Randomness beacon", code: "0x8fd9...c41a + case #1182", note: "One public seed binds this panel." },
          { type: "seats", title: "Panel slots", count: 7, on: 0 }
        ]
      },
      steps: [
        {
          cue: "Bound draw",
          actionLabel: "Bound draw",
          actionOwner: "protocol",
          target: "block",
          targetTitle: "Randomness beacon",
          result: "7 jurors drawn",
          after: {
            title: "Seven jurors drawn",
            subtitle: "One public seed selected all 7 seats.",
            status: "Panel selected",
            activeTab: "Activity",
            surface: "protocol",
            actor: "Network",
            actionOwner: "protocol",
            kpis: [["Draws", "1"], ["Seats", "7"], ["Reroll", "No"]],
            blocks: [
              { type: "beacon", title: "Randomness beacon", code: "0x8fd9...c41a + case #1182", note: "One roll is bound to this case." },
              { type: "seats", title: "Drawn seats", count: 7, on: 7 },
              { type: "faceChecks", title: "Eligibility and presence", rows: [["Juror 04", "Ready"], ["Juror 09", "Ready"], ["5 other seats", "Checking"]] }
            ]
          }
        },
        {
          cue: "Presence checks",
          actionLabel: "Presence checks",
          actionOwner: "protocol",
          autoAdvance: true,
          autoDelay: 1500,
          target: "block",
          targetTitle: "Eligibility and presence",
          result: "7 jurors present",
          after: {
            title: "Seven jurors verified",
            subtitle: "Conflict, standby, and presence checks passed.",
            status: "Presence checked",
            activeTab: "Presence",
            surface: "protocol",
            actor: "Network",
            actionOwner: "protocol",
            kpis: [["Present", "7/7"], ["Draws", "1"], ["Reroll", "No"]],
            blocks: [
              { type: "faceChecks", title: "Presence checks", rows: [["Juror 04", "Present"], ["Juror 09", "Present"], ["5 other seats", "Present"]] },
              { type: "proof", title: "Bound panel", stamp: "7 of 7 present", result: "7 verified humans", note: "Conflicted holders were deterministically replaced." }
            ]
          }
        }
      ]
    },
    {
      start: { activeTab: "Ballot", account: "Juror 04" },
      steps: [
        {
          cue: "Pick one answer, then tap Seal ballot",
          actionLabel: "Seal ballot",
          target: "block",
          targetTitle: "Encrypted ballot",
          result: "Encrypted ballot sealed",
          toast: { title: "Ballot sealed", body: "Encrypted and submitted", detail: "You may silently replace it until the deadline" },
          after: {
            route: "/cases/1182/ballot",
            section: "Private ballot",
            title: "Ballot sealed",
            subtitle: "Hidden and replaceable until the deadline.",
            status: "Encrypted & replaceable",
            activeTab: "Ballot",
            account: "Juror 04",
            kpis: [["Juror fee", "$92 pending"], ["Case", "#1182"], ["Ballot", "Submitted"]],
            blocks: [
              { type: "proof", title: "Ballot box", stamp: "Encrypted & recorded", result: "Accepted", note: "Replaceable until deadline." },
              { type: "record", title: "Submission details", value: "Case #1182 · Confirmed", caption: "Private record", details: [["Ballot", "Hidden"], ["Re-keying", "Open until deadline"], ["Fee", "$92 pending"], ["Live reserve", "Protocol-fronted"]], note: "Proves participation, not the final vote." }
            ]
          }
        }
      ]
    },
    {
      start: {
        surface: "protocol",
        actor: "Network",
        actionOwner: "protocol",
        title: "Waiting for 7 ballots",
        subtitle: "The proof waits for every drawn seat.",
        status: "Ballots 1/7",
        activeTab: "Activity",
        kpis: [["Ballots", "1/7"], ["Privacy", "Kept"]],
        blocks: [
          { type: "route", title: "Ballot arrivals", steps: [["04", "Ballot", "received"], ["09", "Ballot", "pending"], ["+5", "Other seats", "pending"]] },
          { type: "proof", title: "Tally", result: "Locked", note: "Opens at 7/7.", verified: false }
        ]
      },
      steps: [
        {
          cue: "Aggregate proof publication",
          actionLabel: "Aggregate proof publication",
          actionOwner: "protocol",
          target: "block",
          targetTitle: "Ballot arrivals",
          result: "7/7 ballots received; aggregate proof posted",
          after: {
            title: "Aggregate proof posted",
            subtitle: "7/7 ballots arrived; only the tally is public.",
            status: "Proof posted",
            activeTab: "Proof",
            surface: "protocol",
            actor: "Network",
            actionOwner: "protocol",
            kpis: [["Ballots", "7/7"], ["Verdict", "NO"], ["Privacy", "Kept"]],
            blocks: [
              { type: "proof", title: "Aggregate tally", result: "NO wins 4-3", note: "Ready to verify.", verified: false },
              { type: "route", title: "Ballot arrivals", steps: [["04", "Ballot", "received"], ["09", "Ballot", "received"], ["+5", "Other seats", "received"]] }
            ]
          }
        },
        {
          cue: "Aggregate proof verification",
          actionLabel: "Aggregate proof verification",
          actionOwner: "protocol",
          autoAdvance: true,
          autoDelay: 1600,
          target: "block",
          targetTitle: "Aggregate tally",
          result: "Aggregate proof verified",
          after: {
            title: "Proof verified",
            subtitle: "NO 4-3 is valid; each ballot stays private.",
            status: "Proof valid",
            activeTab: "Proof",
            surface: "protocol",
            actor: "Network",
            actionOwner: "protocol",
            kpis: [["Verdict", "NO"], ["Proof", "Valid"], ["Privacy", "Kept"]],
            blocks: [
              { type: "proof", title: "Verified verdict", stamp: "Proof verified", result: "NO wins 4-3", note: "Individual ballots remain private." },
              { type: "table", title: "Case status", rows: [["Losing side", "YES", "may appeal"], ["Appeal window", "Open", "next"], ["Settlement", "Pending", "not paid"], ["Privacy", "Kept", "7 ballots"]] }
            ]
          }
        }
      ]
    },
    {
      start: { surface: "omen", actor: "Losing YES holder", actionOwner: "user", activeTab: "Resolution", account: "0x51...9b" },
      steps: [
        {
          cue: "Tap Review appeal",
          actionLabel: "Review appeal",
          actionOwner: "user",
          target: "block",
          targetTitle: "Provisional court result",
          result: "Appeal funding round opened",
          toast: { title: "Appeal funding open", body: "$18,400 of $31,000 already raised", detail: "Contributions lock directly in DemoThemis until the deadline" },
          after: {
            surface: "omen",
            actor: "Losing YES holder",
            actionOwner: "user",
            template: "appeal-crowdfund",
            product: "OmenMarketMaker",
            tabs: ["Resolution", "Appeal", "Position"],
            activeTab: "Appeal",
            account: "0x51...9b",
            route: "/markets/england-euro-final/resolution/appeal",
            section: "Public appeal funding",
            title: "Crowdfund a fresh 15-person decision",
            subtitle: "Contribute to the public bond. Reaching $31,000 before the deadline automatically starts a fresh jury.",
            status: "$18,400 raised",
            statusTone: "neutral",
            kpis: [["Raised", "$18,400 / $31,000"], ["Still needed", "$12,600"], ["Time left", "14 days"]],
            blocks: [
              { type: "appealCrowdfund", title: "Crowdfunded appeal funding", wide: true, round: 1, goal: 31000, funded: 18400, remaining: 12600, deadline: "29 Jul 2024 · 22:30 UTC", status: "$12,600 still needed", editable: true, walletBalance: 44200, userContribution: 0, contributors: [["0xa8...12", 7500, 24.2, "community"], ["0x72...ee", 6200, 20, "community"], ["0x19...0f", 4700, 15.2, "community"]], serviceFee: 14200, securityBond: 16800, quoteRows: [["Panel work fee", "$6,000", "supporters → 15 jurors"], ["Delay compensation", "$8,200", "supporters → case delay account"], ["Service fee subtotal", "$14,200", "non-refundable once jury starts"], ["Security bond", "$16,800", "supporters → separate escrow"], ["Total appeal funding", "$31,000", "source: appeal supporters"]], destination: "DemoThemis appeal contract", note: "A short round refunds everyone. Once funded, each wallet's service and security shares stay pro-rata; the service fee pays panel work and delay once, while only security returns on success or is forfeited on failure." }
            ]
          }
        },
        {
          cue: "Tap Contribute to appeal",
          actionLabel: "Contribute to appeal",
          coach: "Choose a contribution. The same percentage funds the service fee and owns the separately escrowed security return or forfeiture.",
          actionOwner: "user",
          target: "block",
          targetTitle: "Crowdfunded appeal funding",
          result: "Your contribution locked; public funding continues",
          toast: { title: "Contribution confirmed", body: "$4,000 added to appeal funding", detail: "$1,832 service fee + $2,168 security bond" },
          after: {
            surface: "omen",
            actor: "Appeal supporters",
            actionOwner: "protocol",
            template: "appeal-crowdfund",
            product: "OmenMarketMaker",
            tabs: ["Resolution", "Appeal", "Position"],
            title: "Your appeal contribution is live",
            subtitle: "Your contribution is locked in DemoThemis. Other wallets can close the remaining gap.",
            status: "Contribution confirmed",
            activeTab: "Appeal",
            account: "0x51...9b",
            kpis: [["Raised", "$22,400 / $31,000"], ["Your funding share", "12.9%"], ["Time left", "13d 22h"]],
            blocks: [
              { type: "appealCrowdfund", title: "Crowdfunded appeal funding", wide: true, round: 1, goal: 31000, funded: 22400, remaining: 8600, deadline: "29 Jul 2024 · 22:30 UTC", status: "$8,600 still needed", editable: false, walletBalance: 40200, userContribution: 4000, contributors: [["0xa8...12", 7500, 24.2, "community"], ["0x72...ee", 6200, 20, "community"], ["0x19...0f", 4700, 15.2, "community"], ["You · 0x51...9b", 4000, 12.9, "you"]], serviceFee: 14200, securityBond: 16800, destination: "DemoThemis appeal contract", note: "The jury starts only at 100%. A short round refunds every wallet automatically; a funded round tags each contribution between service and security." }
            ]
          }
        },
        {
          cue: "Crowd completes the $31,000 goal",
          actionLabel: "Crowd completes the $31,000 goal",
          roleHandoff: "OmenMarketMaker crowdfunding to DemoThemis appeal contract",
          actionOwner: "protocol",
          autoAdvance: true,
          autoDelay: 2100,
          target: "block",
          targetTitle: "Crowdfunded appeal funding",
          result: "Appeal goal funded; fresh jury starts automatically",
          after: {
            surface: "protocol",
            actor: "DemoThemis network",
            actionOwner: "protocol",
            template: "protocol-appeal",
            product: "DemoThemis on-chain sequence",
            tabs: ["Activity", "Panel", "Proof"],
            title: "Crowdfunded appeal accepted",
            subtitle: "The goal reached $31,000. Contributors retain pro-rata shares and a fresh 15-person jury starts.",
            status: "Panel voting",
            activeTab: "Activity",
            user: "",
            kpis: [["Crowdfunded bond", "$31,000"], ["Your share", "12.9%"], ["Panel", "15 fresh jurors"]],
            blocks: [
              { type: "route", title: "Appeal funding complete", steps: [["01", "First 3 wallets", "$18,400"], ["02", "Your wallet", "$4,000"], ["03", "14 later wallets", "$8,600"], ["04", "Service fee", "$14,200 paid once"], ["05", "Security escrow", "$16,800 locked"]] },
              { type: "seats", title: "Appeal panel", count: 15, on: 15 }
            ]
          }
        },
        {
          cue: "15-juror vote",
          actionLabel: "15-juror vote",
          actionOwner: "protocol",
          autoAdvance: true,
          autoDelay: 1800,
          target: "block",
          targetTitle: "Appeal panel",
          result: "Appeal vote complete",
          after: {
            title: "Fresh jury confirms NO",
            subtitle: "The 15-person panel returned NO 9–6. Its aggregate proof is ready to return to the OmenMarketMaker resolution page.",
            status: "Provisional proof ready",
            activeTab: "Proof",
            surface: "protocol",
            actor: "DemoThemis network",
            actionOwner: "protocol",
            user: "",
            kpis: [["Verdict", "NO 9–6"], ["Panel", "15"], ["Proof", "Provisional"]],
            blocks: [
              { type: "seats", title: "Appeal panel", count: 15, on: 15 },
              { type: "proof", title: "Appeal proof", stamp: "Proof ready", result: "NO wins 9–6", note: "The result is still provisional until the 31-person appeal window closes." },
              { type: "table", title: "Appeal funding settlement", rows: [["Panel work fee", "$6,000", "paid to 15 jurors"], ["Delay compensation", "$8,200", "credited by case rule"], ["Security bond", "$16,800", "forfeited to reward pool"], ["Total", "$31,000", "allocated once"]] }
            ]
          }
        },
        {
          cue: "Return provisional result to OmenMarketMaker",
          actionLabel: "Return provisional result to OmenMarketMaker",
          roleHandoff: "DemoThemis provisional proof to OmenMarketMaker resolution",
          actionOwner: "protocol",
          autoAdvance: true,
          autoDelay: 1500,
          target: "block",
          targetTitle: "Appeal proof",
          result: "OmenMarketMaker verified the new result",
          after: {
            surface: "omen",
            actor: "Losing YES holder",
            actionOwner: "protocol",
            template: "appeal-result",
            product: "OmenMarketMaker",
            tabs: ["Resolution", "Appeal", "Position"],
            activeTab: "Resolution",
            account: "0x51...9b",
            route: "/markets/england-euro-final/resolution",
            section: "Updated resolution",
            title: "Appeal result: NO 9–6",
            subtitle: "The new proof is verified. A public goal can still fund the 31-person rung before finality.",
            status: "31-person funding open",
            statusTone: "neutral",
            kpis: [["Provisional result", "NO 9–6"], ["Appeal window", "31-person rung open"], ["Settlement", "Paused"]],
            blocks: [
              { type: "proof", title: "Verified appeal result", stamp: "DemoThemis proof verified", result: "NO wins 9–6", note: "The first appeal failed. Its $14,200 service fee had already paid panel work and delay; only the $16,800 security bond routed to the reward pool." },
              { type: "appealCrowdfund", title: "31-person appeal funding", wide: true, round: 2, goal: 76000, funded: 0, remaining: 76000, deadline: "12 Aug 2024 · 22:30 UTC", status: "$76,000 still needed", editable: false, walletBalance: 40200, userContribution: 0, contributors: [], serviceFee: 33000, securityBond: 43000, quoteRows: [["31-juror work + delay", "$33,000", "non-refundable service fee"], ["Security bond", "$43,000", "separate return/forfeit escrow"], ["Total appeal funding", "$76,000", "source: appeal supporters"]], destination: "DemoThemis appeal contract", note: "At $76,000, the $33,000 service fee funds the fresh jury and delay and $43,000 locks as security. A short round refunds contributors and makes NO final." }
            ]
          }
        },
        {
          cue: "Appeal window expires unfunded",
          actionLabel: "Appeal window expires unfunded",
          roleHandoff: "OmenMarketMaker appeal window to DemoThemis finality",
          actionOwner: "protocol",
          target: "block",
          targetTitle: "31-person appeal funding",
          result: "31-seat appeal window expired unfunded",
          after: {
            template: "protocol-appeal",
            product: "DemoThemis on-chain sequence",
            tabs: ["Activity", "Panel", "Proof"],
            title: "NO verdict becomes final",
            subtitle: "The 31-person public goal stayed short before its deadline. Any contributions return to their wallets and DemoThemis can now sign the final proof.",
            status: "Appeals closed",
            activeTab: "Proof",
            surface: "protocol",
            actor: "DemoThemis network",
            actionOwner: "protocol",
            user: "",
            kpis: [["Verdict", "NO 9–6"], ["Final panel", "15"], ["Appeals", "Closed"]],
            blocks: [
              { type: "seats", title: "Final panel", count: 15, on: 15 },
              { type: "proof", title: "Appeal proof", stamp: "Appeals closed", result: "NO wins 9–6", note: "The 31-person funding goal expired below 100%, so no new jury was drawn." },
              { type: "table", title: "Appeal funding settlement", rows: [["Panel work fee", "$6,000", "paid to 15 jurors"], ["Delay compensation", "$8,200", "credited by case rule"], ["Security bond", "$16,800", "forfeited to reward pool"], ["Total", "$31,000", "allocated once"]] }
            ]
          }
        }
      ]
    },
    {
      start: {
        surface: "protocol",
        actor: "Network",
        actionOwner: "protocol",
        status: "Relay pending",
        activeTab: "Activity",
        kpis: [["Verdict", "NO"], ["Proof", "Ready"], ["Record", "Pending"]],
        blocks: [
          { type: "closed", title: "Final verdict", value: "NO 9-6" },
          { type: "table", title: "Court record", rows: [["Resolved case", "Waiting", "quality evidence"], ["Juror updates", "Private", "future cases"], ["Final proof", "Ready", "OmenMarketMaker"]] }
        ]
      },
      steps: [
        {
          cue: "Settle juror account",
          actionLabel: "Settle juror account",
          actionOwner: "protocol",
          autoAdvance: true,
          autoDelay: 1400,
          target: "block",
          targetTitle: "Final verdict",
          result: "Juror 04 paid and privately re-rated",
          toast: { title: "Juror account settled", body: "Compensation funded", detail: "Private rating updated from the final appealed result" },
          after: {
            surface: "themis",
            actor: "Juror 04",
            actionOwner: "user",
            template: "juror-settlement",
            product: "DemoThemis",
            tabs: ["Wallet", "Rating", "Cases"],
            activeTab: "Wallet",
            account: "Juror 04",
            route: "/jurors/04/settlements/1182",
            section: "Private juror settlement",
            title: "Case #1182 settled",
            subtitle: "Your compensation and private rating now update from the final appealed result.",
            status: "Account funded",
            statusTone: "good",
            kpis: [["Wallet credit", "+$92.00"], ["Juror rating", "1,472 to 1,490"], ["Privacy", "Only you"]],
            blocks: [
              {
                type: "jurorSettlement",
                title: "Private juror settlement",
                wide: true,
                source: "Locked court fee",
                destination: "Juror 04 wallet",
                vote: "NO",
                voteLabel: "Your sealed ballot",
                finalVerdict: "NO 9-6",
                balanceBefore: 216.40,
                balanceAfter: 308.40,
                fee: 92,
                reserveDebit: 0,
                netCredit: 92,
                ratingBefore: 1472,
                ratingAfter: 1490,
                ratingDelta: 18,
                ratingDirection: "up",
                factors: [["Final appealed verdict", "Matched"], ["Appeal survival", "Confirmed"], ["Case difficulty", "Applied"], ["Later external evidence", "Pending"]],
                note: "Only this juror can see the exact wallet and rating update. Public proofs reveal only the eligibility band needed for future draws."
              }
            ]
          }
        },
        {
          cue: "Tap Continue to market settlement",
          actionLabel: "Continue to market settlement",
          roleHandoff: "Private juror settlement to OmenMarketMaker payout",
          actionOwner: "user",
          target: "block",
          targetTitle: "Private juror settlement",
          result: "Final proof verified by OmenMarketMaker",
          toast: { title: "Settlement complete", body: "$206.29 market payout received", detail: "Final result NO · Bonds and fees routed" },
          after: {
            surface: "omen",
            actor: "Token holder",
            actionOwner: "simulator",
            template: "settled-market",
            product: "OmenMarketMaker",
            tabs: ["Market", "Payout", "Proof"],
            route: "/markets/england-euro-final/payout",
            section: "Settlement",
            title: "Settlement complete",
            subtitle: "Final NO applied; fees and bond settled.",
            status: "Paid",
            activeTab: "Payout",
            account: "0x7c...42",
            kpis: [["Result", "NO"], ["Net payout", "$206.29"], ["Market", "Closed"]],
            blocks: [
              { type: "settlement", title: "Market payout", label: "Net payout received", value: "$206.29", delta: "$210.50 backed redemption − $4.21 Omen fee", status: "Paid", open: true, details: [["Destination", "0x7c...42"], ["Backed redemption", "$210.50 after court-fee allocation"], ["OmenMarketMaker fee (2%)", "$4.21"], ["Transaction", "0xf190…c42a"], ["Final result", "NO"], ["Market", "Closed"]] },
              { type: "table", title: "Finality and fees", rows: [["Court ruling", "NO · verified", "applied"], ["Resolution bond", "$92 reimbursed pro-rata", "settled"], ["Failed YES appeal", "$31,000 pro-rata bond routed", "settled"], ["Court fee", "$92 paid from caller bond", "settled"]] }
            ]
          }
        }
      ]
    }
  ];

  // The walkthrough graduates pooled claims before it opens ERC-20 order-book trading.
  var graduatedMarketFlow = APP_FLOWS[2];
  APP_FLOWS[2] = APP_FLOWS[3];
  APP_FLOWS[3] = graduatedMarketFlow;

  var CONTROL_COACH_COPY = {
    "Publish market": "Lock the resolve condition and initial liquidity, then publish the market page.",
    "Buy YES for $50": "Buy a $50 YES position. The odds respond immediately; if YES wins, the early-entry reward makes this position count like $54 when winnings are divided.",
    "Buy NO for $50": "Buy a $50 NO position. The odds respond immediately; if NO wins, the early-entry reward makes this position count like $54 when winnings are divided.",
    "Buy 740 YES at best prices": "After pool graduation, buy 500 ERC-20 YES from the 58-cent limit order and the remaining 240 from the next 60-cent order.",
    "Deposit 250 YES": "Deposit wallet-held YES into protected lending after reviewing the variable APY, estimated yield, utilization, collateral protection, fees, and withdrawal terms.",
    "Invite Bob": "Send the room invite before either side locks funds.",
    "Accept & fund room": "Accept the fixed terms and lock both sides' stakes in neutral escrow.",
    "Place $100 parlay": "Submit the parlay for competing solver quotes and full maximum-payout backing.",
    "Complete solver-backed placement": "Show the winning solver locking $336 before one tradeable receipt is minted.",
    "Accept $128 cashout": "Accept the best live solver bid for the single parlay receipt.",
    "Complete receipt cashout": "Transfer the receipt to the winning solver before $128 returns to the wallet.",
    "Post resolution bond": "Post the exact deterministic court fee, pay DemoThemis atomically, and leave outcome collateral at OmenMarketMaker.",
    "Lock case and court fee": "Lock the fixed case and paid court fee before DemoThemis draws any juror.",
    "Bound draw": "Show the public seed selecting the first bound 7-seat panel for this case.",
    "Presence checks": "Show conflicts, capability, standbys, and live presence resolving for every seat.",
    "Seal ballot": "Submit an encrypted ballot that remains silently replaceable until the deadline.",
    "Aggregate proof publication": "Wait for all 7 encrypted ballots, then publish only the aggregate tally.",
    "Aggregate proof verification": "Verify the public aggregate without exposing individual ballots.",
    "Review appeal": "Open the public next-rung funding goal without moving any funds or changing the provisional result.",
    "Contribute to appeal": "Choose a contribution. Your wallet owns the same percentage of any returned bond or loss as the percentage of the goal it funds.",
    "Crowd completes the $31,000 goal": "Other wallets close the remaining gap. DemoThemis starts the fresh 15-person jury only after the public goal reaches 100%.",
    "15-juror vote": "Show the fresh, larger panel reaching its independent aggregate verdict.",
    "Return provisional result to OmenMarketMaker": "Return the verified fresh-jury proof to the market while settlement remains paused.",
    "Appeal window expires unfunded": "Close the 31-person crowdfunding window below its goal, refund any partial contributions, and finalize the current result.",
    "Settle juror account": "Release the locked panel compensation and update this juror's private rating from the final appealed result.",
    "Continue to market settlement": "Leave the private juror account and relay only the final court proof to OmenMarketMaker.",
    "Final proof relay": "Relay the final proof once so OmenMarketMaker can settle winning claims.",
    "Start a new walkthrough": "Restart at a fresh market after this case closes."
  };

  function sceneTone(tone) {
    return ["accent", "good", "bad", "soft"].indexOf(tone) === -1 ? "accent" : tone;
  }

  /*
   * Icon subset: Lucide static SVGs v1.23.0, ISC License.
   * Copyright (c) Lucide Contributors.
   * Vendored inline so the simulator works offline and avoids runtime CDN dependencies.
   * Permission to use, copy, modify, and/or distribute this software for any
   * purpose with or without fee is granted, provided that the copyright notice
   * and this permission notice appear in all copies. The software is provided
   * "as is" without warranty.
   */
  var LUCIDE_ICONS = {
    "badge-alert": `<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />`,
    "chart-no-axes-combined": `<path d="M12 16v5" /><path d="M16 14.639V21" /><path d="M20 10.656V21" /><path d="m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15" /><path d="M4 18.463V21" /><path d="M8 14.656V21" />`,
    "coins": `<path d="M13.744 17.736a6 6 0 1 1-7.48-7.48" /><path d="M15 6h1v4" /><path d="m6.134 14.768.866-.5 2 3.464" /><circle cx="16" cy="8" r="6" />`,
    "clipboard-check": `<rect width="8" height="4" x="8" y="2" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" />`,
    "clipboard-list": `<rect width="8" height="4" x="8" y="2" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />`,
    "credit-card": `<rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />`,
    "door-open": `<path d="M11 20H2" /><path d="M11 4.562v16.157a1 1 0 0 0 1.242.97L19 20V5.562a2 2 0 0 0-1.515-1.94l-4-1A2 2 0 0 0 11 4.561z" /><path d="M11 4H8a2 2 0 0 0-2 2v14" /><path d="M14 12h.01" /><path d="M22 20h-3" />`,
    "eye": `<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" />`,
    "file-search": `<path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M20 13V8l-6-6H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h5" /><circle cx="11.5" cy="16.5" r="2.5" /><path d="m13.3 18.3 2.2 2.2" />`,
    "file-check-2": `<path d="M10.5 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v6" /><path d="M14 2v5a1 1 0 0 0 1 1h5" /><path d="m14 20 2 2 4-4" />`,
    "gauge": `<path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" />`,
    "hand-coins": `<path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17" /><path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" /><path d="m2 16 6 6" /><circle cx="16" cy="9" r="2.9" /><circle cx="6" cy="5" r="3" />`,
    "landmark": `<path d="M10 18v-7" /><path d="M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z" /><path d="M14 18v-7" /><path d="M18 18v-7" /><path d="M3 22h18" /><path d="M6 18v-7" />`,
    "ladder": `<path d="M10 2v20" /><path d="M14 2v20" /><path d="M5 6h14" /><path d="M5 10h14" /><path d="M5 14h14" /><path d="M5 18h14" />`,
    "list-checks": `<path d="m3 7 2 2 4-4" /><path d="m3 17 2 2 4-4" /><path d="M13 6h8" /><path d="M13 12h8" /><path d="M13 18h8" />`,
    "message-square": `<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />`,
    "radio-tower": `<path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9" /><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5" /><circle cx="12" cy="9" r="2" /><path d="M16.2 4.8c2 2 2.26 5.11.8 7.47" /><path d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1" /><path d="M9.5 18h5" /><path d="m8 22 4-11 4 11" />`,
    "receipt-text": `<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h5" />`,
    "route": `<circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /><circle cx="18" cy="5" r="3" />`,
    "scale": `<path d="M12 3v18" /><path d="m19 8 3 8a5 5 0 0 1-6 0zV7" /><path d="M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1" /><path d="m5 8 3 8a5 5 0 0 1-6 0zV7" /><path d="M7 21h10" />`,
    "scan-face": `<path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01" /><path d="M15 9h.01" />`,
    "search-check": `<path d="m8 11 2 2 4-4" /><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />`,
    "shield-alert": `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="M12 8v4" /><path d="M12 16h.01" />`,
    "shield-check": `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" />`,
    "ticket": `<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />`,
    "timer": `<line x1="10" x2="14" y1="2" y2="2" /><line x1="12" x2="15" y1="14" y2="11" /><circle cx="12" cy="14" r="8" />`,
    "user-round": `<circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" />`,
    "users-round": `<path d="M18 21a8 8 0 0 0-16 0" /><circle cx="10" cy="8" r="5" /><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" />`,
    "vault": `<rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" /><path d="m7.9 7.9 2.7 2.7" /><circle cx="16.5" cy="7.5" r=".5" fill="currentColor" /><path d="m13.4 10.6 2.7-2.7" /><circle cx="7.5" cy="16.5" r=".5" fill="currentColor" /><path d="m7.9 16.1 2.7-2.7" /><circle cx="16.5" cy="16.5" r=".5" fill="currentColor" /><path d="m13.4 13.4 2.7 2.7" /><circle cx="12" cy="12" r="2" />`,
    "vote": `<path d="m9 12 2 2 4-4" /><path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z" /><path d="M22 19H2" />`,
    "wallet-cards": `<path d="M3 11h3.75a2 2 0 0 1 1.6.8l.45.6a4 4 0 0 0 6.4 0l.45-.6a2 2 0 0 1 1.6-.8H21" /><path d="M3 7h18" /><rect x="3" y="3" width="18" height="18" rx="2" />`,
    "waypoints": `<path d="m10.586 5.414-5.172 5.172" /><path d="m18.586 13.414-5.172 5.172" /><path d="M6 12h12" /><circle cx="12" cy="20" r="2" /><circle cx="12" cy="4" r="2" /><circle cx="20" cy="12" r="2" /><circle cx="4" cy="12" r="2" />`
  };

  var LUCIDE_KIND = {
    ballot: "vote",
    beacon: "radio-tower",
    book: "list-checks",
    challenge: "search-check",
    clock: "timer",
    court: "landmark",
    crowd: "users-round",
    dial: "gauge",
    jury: "users-round",
    ladder: "ladder",
    market: "chart-no-axes-combined",
    person: "user-round",
    pool: "hand-coins",
    reserve: "shield-alert",
    room: "door-open",
    router: "waypoints",
    score: "clipboard-check",
    ticket: "ticket",
    tokens: "coins",
    vault: "vault",
    verdict: "scale"
  };

  function lucideIconName(kind) {
    return LUCIDE_KIND[kind] || kind;
  }

  function lucideGlyph(kind, cx, cy) {
    var name = lucideIconName(kind);
    var svg = LUCIDE_ICONS[name] || LUCIDE_ICONS["badge-alert"];
    return "<g class=\"lucide-pack-icon\" transform=\"translate(" + (cx - 24) + " " + (cy - 24) + ") scale(2)\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.1\" stroke-linecap=\"round\" stroke-linejoin=\"round\">" + svg + "</g>";
  }

  function lucideMini(kind) {
    var name = lucideIconName(kind);
    var svg = LUCIDE_ICONS[name] || LUCIDE_ICONS["badge-alert"];
    return "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\">" + svg + "</svg>";
  }

  function sceneIcon(kind, cx, cy, tone, hot) {
    var t = sceneTone(tone);
    var pulse = hot ? " pulse" : "";
    return [
      "<g class=\"" + pulse + "\">",
      "<circle class=\"sigil " + t + "\" cx=\"" + cx + "\" cy=\"" + cy + "\" r=\"38\"></circle>",
      lucideGlyph(kind, cx, cy),
      "</g>"
    ].join("");
  }

  function sceneCard(x, y, w, h, data, hot, hero) {
    var tone = sceneTone(data.tone);
    var cx = x + w / 2;
    var cardClass = (hero ? "hero-card" : "scene-card") + (hot ? " hot" : "");
    return [
      "<g>",
      "<rect class=\"halo " + tone + "\" x=\"" + (x + 10) + "\" y=\"" + (y + 10) + "\" width=\"" + (w - 20) + "\" height=\"" + (h - 20) + "\" rx=\"28\"></rect>",
      "<rect class=\"" + cardClass + "\" x=\"" + x + "\" y=\"" + y + "\" width=\"" + w + "\" height=\"" + h + "\" rx=\"22\"></rect>",
      sceneIcon(data.icon, cx, y + (hero ? 67 : 58), tone, hot),
      "<text class=\"label\" x=\"" + cx + "\" y=\"" + (y + (hero ? 145 : 132)) + "\" text-anchor=\"middle\">" + esc(data.title) + "</text>",
      "<text class=\"small\" x=\"" + cx + "\" y=\"" + (y + (hero ? 168 : 153)) + "\" text-anchor=\"middle\">" + esc(data.sub) + "</text>",
      "</g>"
    ].join("");
  }

  function sceneChip(x, y, label, tone, hot) {
    return [
      "<g class=\"" + (hot ? "pop" : "") + "\">",
      "<rect class=\"chip-card " + (hot ? "hot" : "") + "\" x=\"" + x + "\" y=\"" + y + "\" width=\"148\" height=\"34\" rx=\"17\"></rect>",
      "<text class=\"tiny\" x=\"" + (x + 74) + "\" y=\"" + (y + 22) + "\" text-anchor=\"middle\">" + esc(label) + "</text>",
      "</g>"
    ].join("");
  }

  function buildSceneSvg(index, item, focus, actionIndex) {
    var scene = SCENE_ART[index];
    var title = focus.title;
    var desc = focus.body;
    var primary = actionIndex === 0;
    var secondary = actionIndex === 1;
    var tertiary = actionIndex >= 2;
    var idle = actionIndex < 0;
    var chips = scene.chips || [];
    var inner = [
      "<path class=\"flow-track " + (primary ? "hot" : "") + "\" d=\"M205,160 C242,160 242,160 282,160\"></path>",
      "<path class=\"flow-track " + (secondary || tertiary ? "hot" : "") + "\" d=\"M438,160 C478,160 478,160 518,160\"></path>",
      sceneCard(42, 74, 158, 164, scene.actor, primary, false),
      sceneCard(270, 44, 180, 224, scene.core, idle || primary || secondary, true),
      sceneCard(520, 74, 158, 164, scene.result, secondary || tertiary, false),
      sceneChip(64, 274, chips[0] ? chips[0][0] : scene.actor.title, chips[0] ? chips[0][1] : scene.actor.tone, primary),
      sceneChip(286, 274, chips[1] ? chips[1][0] : scene.core.title, chips[1] ? chips[1][1] : scene.core.tone, secondary),
      sceneChip(508, 274, chips[2] ? chips[2][0] : scene.result.title, chips[2] ? chips[2][1] : scene.result.tone, tertiary)
    ].join("");
    return svgShell(title, desc, inner);
  }

  function buildStepSvg(index, item, focus, actionIndex, narrow) {
    if (SCENE_ART[index]) return buildSceneSvg(index, item, focus, actionIndex);
    var hot0 = actionIndex === 0;
    var hot1 = actionIndex === 1;
    var hot2 = actionIndex === 2;
    var title = focus.title;
    var desc = focus.body;
    var svg = "";
    if (index === 0) {
      svg += person(82, 142, "creator", "accent", hot0);
      svg += node(186, 96, 138, 88, "Escrow", "offers locked", "accent", hot0);
      svg += node(405, 86, 158, 105, "New market", "question is live", "good", hot0);
      svg += person(635, 128, "observers", "good", hot1);
      svg += flow(112, 142, 186, 140, "accent", hot0);
      svg += flow(324, 140, 405, 138, "good", hot0);
      svg += flow(563, 138, 615, 130, "good", hot1);
      svg += chip(210, 214, "$0.10", "accent", hot0);
      svg += chip(475, 214, "live link", "good", hot1);
    } else if (index === 1) {
      svg += person(95, 118, "YES crowd", "good", hot0);
      svg += person(95, 222, "NO crowd", "bad", hot1);
      svg += node(276, 106, 168, 116, "Shared pool", money(item.pot) + " pot", "accent", hot0 || hot1);
      svg += node(526, 100, 124, 124, "Price dial", Math.round(item.yes * 100) + "% YES", "soft", hot2);
      svg += flow(122, 118, 276, 137, "good", hot0);
      svg += flow(122, 222, 276, 188, "bad", hot1);
      svg += flow(444, 164, 526, 163, "accent", hot2);
      svg += gauge(520, 246, 140, "YES share", item.yes, "yes-fill", hot0 || hot2);
      svg += gauge(520, 282, 140, "NO share", 1 - item.yes, "no-fill", hot1);
    } else if (index === 2) {
      svg += node(58, 96, 126, 96, "Pool", "two-sided + deep", "accent", hot0);
      svg += node(236, 70, 120, 54, "Participation", "both sides", "good", hot0);
      svg += node(236, 138, 120, 54, "Pool depth", "durable capital", "good", hot0);
      svg += node(236, 206, 120, 54, "Time active", "not a flash", "good", hot0);
      svg += node(438, 82, 112, 72, "YES token", "wallet held", "good", hot0 || hot1);
      svg += node(438, 176, 112, 72, "NO token", "wallet held", "bad", hot0 || hot1);
      svg += flow(184, 144, 236, 97, "good", hot0);
      svg += flow(184, 144, 236, 165, "good", hot0);
      svg += flow(184, 144, 236, 233, "good", hot0);
      svg += flow(356, 150, 438, 117, "good", hot0);
      svg += flow(356, 150, 438, 211, "bad", hot0);
    } else if (index === 3) {
      svg += person(78, 130, "ERC-20 sellers", "accent", hot0);
      svg += node(174, 74, 150, 70, "500 YES @ 58c", "best limit order", "accent", hot0);
      svg += node(174, 158, 150, 70, "240 YES @ 60c", "next limit order", "accent", hot0);
      svg += person(395, 130, "buyer", "good", hot0);
      svg += node(528, 91, 132, 94, "Order filled", "740 ERC-20 YES", "good", hot1);
      svg += flow(104, 130, 174, 110, "accent", hot0);
      svg += flow(324, 110, 374, 132, "good", hot0);
      svg += flow(324, 194, 374, 148, "good", hot0);
      svg += flow(421, 132, 528, 134, "accent", hot1);
      svg += chip(207, 254, "64c untouched", "soft", hot1);
    } else if (index === 4) {
      svg += person(76, 122, "friend A", "good", hot0);
      svg += person(76, 230, "friend B", "bad", hot0);
      svg += node(198, 126, 148, 96, "Private room", "invite-only", "accent", hot0);
      svg += node(424, 112, 132, 86, "Escrow", "neutral funds", "soft", hot1);
      svg += node(586, 120, 96, 70, "Court", "same path", "good", hot1);
      svg += flow(103, 122, 198, 150, "good", hot0);
      svg += flow(103, 230, 198, 196, "bad", hot0);
      svg += flow(346, 173, 424, 154, "accent", hot1);
      svg += flow(556, 154, 586, 154, "good", hot1);
      svg += chip(229, 239, "invite", "accent", hot0);
      svg += chip(440, 224, "fixed odds", "soft", hot1);
    } else if (index === 5) {
      svg += node(56, 80, 128, 78, "Market A", "YES leg", "good", hot0);
      svg += node(56, 190, 128, 78, "Market B", "YES leg", "good", hot0);
      svg += node(284, 126, 150, 96, "Parlay route", "all-or-nothing", "accent", hot0 || hot1);
      svg += node(536, 96, 132, 74, "Parlay token", "YES A + YES B", "good", hot0);
      svg += node(536, 202, 132, 74, "Cash out", "sell legs", "soft", hot1);
      svg += flow(184, 119, 284, 150, "good", hot0);
      svg += flow(184, 229, 284, 192, "good", hot0);
      svg += flow(434, 158, 536, 134, "good", hot0);
      svg += flow(536, 238, 434, 191, "accent", hot1);
      svg += chip(316, 246, "fill-or-kill", "accent", hot0);
    } else if (index === 6) {
      svg += node(48, 102, 130, 88, "Event closes", "result needed", "soft", hot0);
      svg += node(242, 88, 154, 112, "Resolution bond", "exact fee posted", "good", hot0);
      svg += node(470, 88, 158, 112, "Court request", "rules + bond", "accent", hot0);
      svg += node(278, 230, 188, 50, "Trading stays open", "price keeps moving", "soft", hot1);
      svg += flow(178, 146, 242, 144, "accent", hot0);
      svg += flow(396, 144, 470, 144, "accent", hot0);
      svg += flow(350, 200, 366, 230, "good", hot1);
      svg += chip(493, 220, "paid from caller bond", "accent", hot0);
    } else if (index === 7) {
      svg += node(46, 92, 150, 96, "OmenMarketMaker", "outcome custody", "good", hot0);
      svg += node(270, 88, 168, 104, "Bonded handoff", "case + bond pay", "accent", hot0);
      svg += node(516, 92, 150, 96, "DemoThemis", "case accepted", "accent", hot1);
      svg += flow(196, 140, 270, 140, "good", hot0);
      svg += flow(438, 140, 516, 140, "accent", hot1);
      svg += node(84, 230, 166, 50, "Outcome backing", "stays at Omen", "soft", hot0);
      svg += node(462, 230, 166, 50, "Draw next", "unknown panel", "soft", hot1);
      svg += chip(296, 224, "boundary", "accent", hot0);
    } else if (index === 8) {
      svg += node(54, 104, 126, 84, "Beacon", "public random", "accent", hot0);
      svg += node(268, 90, 140, 112, "Draw wheel", "one roll", "soft", hot0);
      svg += flow(180, 145, 268, 146, "accent", hot0);
      svg += seats(500, 94, 7, hot1 || hot0);
      svg += flow(408, 146, 500, 145, "good", hot0);
      svg += node(470, 220, 188, 52, "Face proofs", "drawn humans present", "good", hot1);
      svg += flow(575, 188, 575, 220, "good", hot1);
      svg += chip(294, 230, "no re-roll", "accent", hot0);
    } else if (index === 9) {
      svg += person(82, 126, "juror", "good", hot1);
      svg += node(172, 88, 126, 86, "Face check", "live human", "good", hot1);
      svg += node(376, 82, 142, 98, "Encrypted box", "sealed vote", "accent", hot0);
      svg += node(572, 96, 102, 72, "Reserve", "at risk", "bad", hot1);
      svg += flow(105, 126, 172, 130, "good", hot1);
      svg += flow(298, 132, 376, 132, "accent", hot0);
      svg += flow(518, 132, 572, 132, "bad", hot1);
      svg += chip(404, 214, "no receipt", "accent", hot0);
      svg += gauge(564, 214, 104, "live reserve", .68, "no-fill", hot1);
    } else if (index === 10) {
      svg += node(54, 104, 126, 82, "Ballots", "sealed set", "soft", hot0);
      svg += node(254, 88, 142, 102, "Tally proof", "aggregate only", "accent", hot0);
      svg += node(468, 88, 124, 102, "Verdict", "YES loses", "bad", hot0);
      svg += node(548, 216, 130, 58, "Updates", "pending appeal", "soft", hot1);
      svg += flow(180, 144, 254, 140, "accent", hot0);
      svg += flow(396, 140, 468, 140, "bad", hot0);
      svg += flow(530, 190, 596, 216, "good", hot1);
      svg += chip(448, 218, "not final", "soft", hot1);
    } else if (index === 11) {
      svg += person(82, 142, "losing side", "bad", hot0);
      svg += node(190, 96, 136, 92, "Appeal floor", "pay rung", "bad", hot0);
      svg += node(386, 74, 112, 140, "Ladder", "finite climb", "accent", hot0);
      svg += seats(560, 90, 15, hot1);
      svg += flow(108, 142, 190, 142, "bad", hot0);
      svg += flow(326, 142, 386, 143, "accent", hot0);
      svg += flow(498, 143, 560, 143, "good", hot1);
      svg += gauge(197, 218, 126, "attack cost", .82, "no-fill", hot0);
      svg += chip(566, 242, "15 seats", "good", hot1);
    } else {
      svg += node(50, 94, 126, 90, "Escrow", "final", "accent", hot0);
      svg += node(258, 80, 122, 74, "Payout", "winning NO paid", "good", hot0);
      svg += node(258, 190, 122, 74, "Quality evidence", "case record", "accent", hot1);
      svg += node(500, 96, 136, 76, "Juror update", "private", "good", hot1);
      svg += node(500, 210, 136, 56, "Next demand", "more trust", "soft", hot2);
      svg += flow(176, 139, 258, 118, "good", hot0);
      svg += flow(176, 139, 258, 226, "accent", hot1);
      svg += flow(380, 226, 500, 136, "good", hot1);
      svg += flow(568, 172, 568, 210, "accent", hot2);
      svg += chip(63, 222, "closed", "accent", hot0);
    }
    if (narrow) svg = "<g transform=\"translate(0 28) scale(.5)\">" + svg + "</g>";
    return svgShell(title, desc, svg);
  }

  function mobileTiles(index, item, focus) {
    var scene = SCENE_ART[index];
    if (!scene) return [["NOW", focus.title, focus.change, focus.tone || "accent"], ["NEXT", focus.next, item.panel, "good"]];
    return [scene.actor, scene.core, scene.result].map(function (piece) {
      return [piece.icon, piece.title, piece.sub, piece.tone || "accent"];
    });
  }

  function renderMobileArt(item, focus) {
    var root = document.getElementById("mobileArt");
    if (!root) return;
    root.replaceChildren();
    mobileTiles(stage, item, focus).forEach(function (tile, i, arr) {
      var div = document.createElement("div");
      var mark = document.createElement("div");
      var copy = document.createElement("div");
      var b = document.createElement("b");
      var small = document.createElement("small");
      var tone = tile[3] || "accent";
      var hotIndex = activeAction < 0 ? -1 : Math.min(activeAction + 1, arr.length - 1);
      div.className = "mobile-art-tile " + tone + (i === hotIndex ? " hot" : "");
      mark.className = "mobile-art-mark";
      mark.innerHTML = lucideMini(tile[0]);
      b.textContent = tile[1];
      small.textContent = tile[2];
      copy.appendChild(b);
      copy.appendChild(small);
      div.appendChild(mark);
      div.appendChild(copy);
      root.appendChild(div);
      if (i < arr.length - 1) {
        var arrow = document.createElement("div");
        arrow.className = "mobile-art-arrow";
        root.appendChild(arrow);
      }
    });
  }

  function hasHot(hot) {
    if (activeAction < 0 || hot == null) return false;
    return hotMatchesAction(hot, activeAction);
  }

  function hotMatchesAction(hot, index) {
    if (hot == null || index < 0) return false;
    return Array.isArray(hot) ? hot.indexOf(index) !== -1 : hot === index;
  }

  function cloneData(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function mergePage(base, patch) {
    var out = cloneData(base || {});
    Object.keys(patch || {}).forEach(function (key) {
      out[key] = cloneData(patch[key]);
    });
    return out;
  }

  function safeLiquidityAmount(value) {
    var amount = Number(value);
    return Number.isFinite(amount) ? Math.max(0, amount) : 0;
  }

  function formatLiquidityAmount(value) {
    return "$" + safeLiquidityAmount(value).toFixed(2);
  }

  function openingLiquiditySummary() {
    var yes = safeLiquidityAmount(marketLiquidityDraft.yes);
    var no = safeLiquidityAmount(marketLiquidityDraft.no);
    var funded = [];
    if (yes > 0) funded.push(formatLiquidityAmount(yes) + " YES");
    if (no > 0) funded.push(formatLiquidityAmount(no) + " NO");
    return funded.length ? funded.join(" + ") : "No opening liquidity";
  }

  function setReceiptDetail(block, label, value) {
    if (!block || !Array.isArray(block.details)) return;
    var detail = block.details.find(function (row) { return row && row[0] === label; });
    if (detail) detail[1] = value;
    else block.details.push([label, value]);
  }

  function applyOpeningLiquidityDraft(page) {
    if (stage !== 0 || activeEventStep < 1) return page;
    var yes = safeLiquidityAmount(marketLiquidityDraft.yes);
    var no = safeLiquidityAmount(marketLiquidityDraft.no);
    var total = yes + no;
    var yesOdds = total > 0 ? Math.round(yes / total * 100) : 50;
    (page.blocks || []).forEach(function (block) {
      if (block.title === "Market published" || block.title === "Market page") {
        setReceiptDetail(block, "Opening liquidity", openingLiquiditySummary());
      }
      if (block.title === "Opening odds") {
        block.yes = yesOdds;
        block.no = 100 - yesOdds;
      }
    });
    return page;
  }

  function applyLiveTradeSelection(page) {
    if (stage !== 1) return page;
    var side = liveTradeSide === "NO" ? "NO" : "YES";
    var completed = activeEventStep >= 1;
    var yesOdds = completed ? (side === "YES" ? 67 : 57) : 62;
    var noOdds = 100 - yesOdds;
    (page.blocks || []).forEach(function (block) {
      if (block.type !== "marketTrade") return;
      block.selected = side;
      block.yes = yesOdds;
      block.no = noOdds;
      block.rewardCopy = "If " + side + " wins, your $50 is treated like $54 when winnings are divided.";
      if (!completed) return;
      block.position = "$50 " + side;
      block.activity = [
        ["Your " + side + " purchase", "+$50", side === "YES" ? yesOdds + "%" : noOdds + "%"],
        ["YES purchase", "+$120", "62%"],
        ["NO purchase", "+$80", "38%"]
      ];
    });
    if (completed) {
      page.status = side + " position added";
      page.subtitle = "Your $50 " + side + " purchase moved the market odds. Your position remains visible here.";
    }
    return page;
  }

  function liveFieldValue(stageIndex, label, fallback) {
    var key = stageIndex + "|" + cleanTip(label).toLowerCase();
    return Object.prototype.hasOwnProperty.call(liveFieldDrafts, key) ? liveFieldDrafts[key] : fallback;
  }

  function currentStepValidation() {
    function hasText(value) { return cleanTip(value).length > 0; }
    if (stage === 0 && activeEventStep === 0) {
      var marketFieldsReady = [
        liveFieldValue(0, "Question", "Will England win the UEFA Euro 2024 final?"),
        liveFieldValue(0, "Close time", "14 July 2024 19:00 UTC"),
        liveFieldValue(0, "Resolve condition", "YES only if UEFA records England as the winner of the 14 July 2024 final; otherwise NO.")
      ].every(hasText);
      if (!marketFieldsReady) return { valid: false, message: "Complete the question, close time, and resolve condition." };
      if (safeLiquidityAmount(marketLiquidityDraft.yes) + safeLiquidityAmount(marketLiquidityDraft.no) <= 0) {
        return { valid: false, message: "Fund at least one opening side before publishing." };
      }
    }
    if (stage === 4 && activeEventStep <= 1) {
      var roomSide = liveFieldValue(4, "Your side", "YES");
      var roomFieldsReady = [
        liveFieldValue(4, "Outcome", "England wins Euro 2024"),
        roomSide,
        liveFieldValue(4, "Stake per side", "$10,000"),
        liveFieldValue(4, "Winner receives", "$20,000"),
        liveFieldValue(4, "Resolve condition", "YES only if UEFA records England as the winner of the 14 July 2024 final; otherwise NO.")
      ].every(hasText);
      if (!roomFieldsReady) return { valid: false, message: "Complete every room term before continuing." };
      if (!/^(?:YES|NO)$/i.test(cleanTip(roomSide))) return { valid: false, message: "Choose YES or NO for your side." };
    }
    if (stage === 9 && activeEventStep === 0 && !selectedBallotChoice) {
      return { valid: false, message: "Choose YES, NO, or insufficient information before sealing the ballot." };
    }
    if (stage === 11 && activeEventStep === 1) {
      var appealContribution = safeAppealContribution(appealContributionDraft);
      if (appealContribution < 50) return { valid: false, message: "Contribute at least $50 to join this appeal bond." };
      if (appealContribution > 12600) return { valid: false, message: "The funding round only has $12,600 remaining." };
    }
    return { valid: true, message: "" };
  }

  function setActionValidation(button, messageEl) {
    var validation = currentStepValidation();
    button.disabled = !validation.valid;
    if (!validation.valid) {
      messageEl.textContent = validation.message;
      messageEl.hidden = false;
      setAttributeToken(button, "aria-describedby", messageEl.id, true);
    } else {
      messageEl.textContent = "";
      messageEl.hidden = true;
      setAttributeToken(button, "aria-describedby", messageEl.id, false);
    }
  }

  function syncGuidedActionValidity() {
    var root = document.getElementById("productDemo");
    if (!root) return;
    root.querySelectorAll(".live-action-row[data-validates-action]").forEach(function (row) {
      var button = row.querySelector(".sim-app-action");
      var message = row.querySelector(".action-validation");
      if (button && message) setActionValidation(button, message);
    });
  }

  function applyLiveFieldDrafts(page) {
    if (stage === 0 && activeEventStep >= 1) {
      var question = liveFieldValue(0, "Question", "Will England win the UEFA Euro 2024 final?");
      var closeTime = liveFieldValue(0, "Close time", "14 July 2024 19:00 UTC");
      var resolveCondition = liveFieldValue(0, "Resolve condition", "YES only if UEFA records England as the winner of the 14 July 2024 final; otherwise NO.");
      page.title = question;
      (page.blocks || []).forEach(function (block) {
        if (block.title === "Market details") {
          setReceiptDetail(block, "Closes", closeTime);
          setReceiptDetail(block, "Resolve rule", resolveCondition);
        }
      });
    }
    if (stage === 4) {
      var outcome = liveFieldValue(4, "Outcome", "England wins Euro 2024");
      var yourSide = liveFieldValue(4, "Your side", "YES");
      var stake = liveFieldValue(4, "Stake per side", "$10,000");
      var winnerReceives = liveFieldValue(4, "Winner receives", "$20,000");
      var normalizedSide = cleanTip(yourSide).toUpperCase();
      var opposingSide = normalizedSide === "YES" ? "NO" : normalizedSide === "NO" ? "YES" : "Opposing side";
      if (activeEventStep === 1) page.title = outcome + " private room";
      (page.blocks || []).forEach(function (block) {
        if (block.type === "fields") {
          block.rows = (block.rows || []).map(function (row) {
            return [row[0], liveFieldValue(4, row[0], row[1]), row[2]];
          });
        }
        if (block.type === "participants") {
          block.people = (block.people || []).map(function (person) {
            if (person[0] === "Alice") return ["Alice", activeEventStep >= 2 ? "Signed " + normalizedSide : normalizedSide + " side ready"];
            if (person[0] === "Bob" && activeEventStep >= 2) return ["Bob", "Signed " + opposingSide];
            return person;
          });
        }
        if (block.title === "Escrow record") {
          block.value = winnerReceives + " locked";
          setReceiptDetail(block, "Alice", stake + " · " + yourSide);
          setReceiptDetail(block, "Bob", stake + " · " + opposingSide);
        }
      });
    }
    return page;
  }

  function applyBallotChoice(page) {
    if (stage !== 9 || activeEventStep < 1 || !selectedBallotChoice) return page;
    (page.blocks || []).forEach(function (block) {
      if (block.title === "Ballot box") block.result = "Encrypted ballot sealed";
    });
    return page;
  }

  function applyInsufficientBallotTally(page) {
    if (selectedBallotChoice !== "INSUFFICIENT INFORMATION" || stage < 10 || stage > 11) return page;
    function update(value) {
      if (typeof value === "string") return value.replace(/NO 4(?:-|–)3/g, "NO 4–2–1");
      if (Array.isArray(value)) return value.map(update);
      if (value && typeof value === "object") {
        Object.keys(value).forEach(function (key) { value[key] = update(value[key]); });
      }
      return value;
    }
    return update(page);
  }

  function appealContributorRows(userAmount, includeClosingCrowd) {
    var contributors = [
      ["0xa8...12", 7500],
      ["0x72...ee", 6200],
      ["0x19...0f", 4700]
    ];
    if (userAmount > 0) contributors.push(["You · 0x51...9b", userAmount, "you"]);
    var closingAmount = Math.max(0, APPEAL_FUNDING_GOAL - APPEAL_EXISTING_FUNDING - userAmount);
    if (includeClosingCrowd && closingAmount > 0) contributors.push(["14 later wallets", closingAmount, "crowd"]);
    return contributors.map(function (row) {
      return [row[0], row[1], row[1] / APPEAL_FUNDING_GOAL * 100, row[2] || "community"];
    });
  }

  function applyAppealCrowdfunding(page) {
    if (stage !== 11) return page;
    var userAmount = safeAppealContribution(appealContributionDraft);
    var userHasContributed = activeEventStep >= 2;
    var currentFunded = APPEAL_EXISTING_FUNDING + (userHasContributed ? userAmount : 0);
    var remaining = Math.max(0, APPEAL_FUNDING_GOAL - currentFunded);
    var userShare = userAmount / APPEAL_FUNDING_GOAL * 100;

    (page.blocks || []).forEach(function (block) {
      if (block.type === "appealCrowdfund" && Number(block.round || 1) === 1) {
        block.goal = APPEAL_FUNDING_GOAL;
        block.funded = currentFunded;
        block.remaining = remaining;
        block.userContribution = userHasContributed ? userAmount : 0;
        block.contributors = appealContributorRows(userHasContributed ? userAmount : 0, false);
        block.editable = activeEventStep === 1;
        block.walletBalance = 44200;
        block.deadline = "29 Jul 2024 · 22:30 UTC";
        block.status = remaining > 0 ? appealMoney(remaining) + " still needed" : "Goal reached";
      }
      if (block.type === "route" && block.title === "Appeal funding complete") {
        var fundingSteps = [
          ["01", "First 3 wallets", appealMoney(APPEAL_EXISTING_FUNDING)],
          ["02", "Your wallet", appealMoney(userAmount)]
        ];
        var closingCrowdAmount = Math.max(0, APPEAL_FUNDING_GOAL - APPEAL_EXISTING_FUNDING - userAmount);
        if (closingCrowdAmount > 0) fundingSteps.push(["03", "14 later wallets", appealMoney(closingCrowdAmount)]);
        fundingSteps.push([closingCrowdAmount > 0 ? "04" : "03", "Service fee", appealMoney(APPEAL_SERVICE_FEE) + " paid once"]);
        fundingSteps.push([closingCrowdAmount > 0 ? "05" : "04", "Security escrow", appealMoney(APPEAL_SECURITY_BOND) + " locked"]);
        block.steps = fundingSteps;
      }
      if (block.type === "table" && block.title === "Appeal funding settlement") {
        block.rows = [
          ["Panel work fee", appealMoney(APPEAL_PANEL_FEE), "paid to 15 jurors"],
          ["Delay compensation", appealMoney(APPEAL_DELAY_FEE), "credited by case rule"],
          ["Security bond", appealMoney(APPEAL_SECURITY_BOND), "forfeited to reward pool"],
          ["Total", appealMoney(APPEAL_FUNDING_GOAL), "allocated once"]
        ];
      }
    });

    if (activeEventStep === 2 && page.surface === "omen") {
      page.status = "Contribution confirmed";
      page.subtitle = "Your " + appealMoney(userAmount) + " contribution is locked directly in DemoThemis. The public round needs " + appealMoney(remaining) + " more before the deadline.";
      page.kpis = [["Raised", appealMoney(currentFunded) + " / " + appealMoney(APPEAL_FUNDING_GOAL)], ["Your funding share", userShare.toFixed(1) + "%"], ["Time left", "13d 22h"]];
    }
    if (activeEventStep >= 3 && page.surface === "protocol" && /funding/i.test(page.title || "")) {
      page.subtitle = "The public goal reached " + appealMoney(APPEAL_FUNDING_GOAL) + ". The service fee pays panel work and delay once; each wallet keeps only its pro-rata security principal in escrow.";
      page.kpis = [["Service fee", appealMoney(APPEAL_SERVICE_FEE)], ["Security bond", appealMoney(APPEAL_SECURITY_BOND)], ["Panel", "15 fresh jurors"]];
    }
    return page;
  }

  function applyJurorSettlement(page) {
    if (stage !== 12 || activeEventStep < 1) return page;
    var settlementBlock = null;
    (page.blocks || []).forEach(function (block) {
      if (block.type === "jurorSettlement") settlementBlock = block;
    });
    if (!settlementBlock) return page;

    var vote = selectedBallotChoice || "NO";
    var matchedFinalVerdict = vote === "NO";
    var fee = 92;
    var reserveDebit = matchedFinalVerdict ? 0 : 6;
    var netCredit = fee - reserveDebit;
    var ratingBefore = 1472;
    var ratingDelta = matchedFinalVerdict ? 18 : -6;
    var ratingAfter = ratingBefore + ratingDelta;
    var balanceBefore = 216.40;
    var balanceAfter = balanceBefore + netCredit;

    settlementBlock.vote = vote;
    settlementBlock.voteLabel = selectedBallotChoice ? "Your sealed ballot" : "Illustrated ballot";
    settlementBlock.finalVerdict = "NO 9-6";
    settlementBlock.fee = fee;
    settlementBlock.reserveDebit = reserveDebit;
    settlementBlock.netCredit = netCredit;
    settlementBlock.balanceBefore = balanceBefore;
    settlementBlock.balanceAfter = balanceAfter;
    settlementBlock.ratingBefore = ratingBefore;
    settlementBlock.ratingAfter = ratingAfter;
    settlementBlock.ratingDelta = ratingDelta;
    settlementBlock.ratingDirection = matchedFinalVerdict ? "up" : "down";
    settlementBlock.factors = matchedFinalVerdict
      ? [["Final appealed verdict", "Matched"], ["Appeal survival", "Confirmed"], ["Case difficulty", "Applied"], ["Later external evidence", "Pending"]]
      : [["Final appealed verdict", "Did not match"], ["Appeal survival", "Reduced rating"], ["Case difficulty", "Limited the change"], ["Later external evidence", "Pending"]];

    page.subtitle = matchedFinalVerdict
      ? "Your compensation is funded and your private rating rises after the final appealed verdict confirms your ballot."
      : "Your compensation is funded while the final appealed verdict applies a small private reserve debit and rating correction.";
    page.kpis = [
      ["Net wallet credit", "+$" + netCredit.toFixed(2)],
      ["Juror rating", ratingBefore.toLocaleString("en-US") + " to " + ratingAfter.toLocaleString("en-US")],
      ["Privacy", "Only you"]
    ];
    return page;
  }

  function currentFlow() {
    return APP_FLOWS[stage] || { steps: [] };
  }

  function eventSurfaceDefaults(stageIndex) {
    return EVENT_SURFACES[stageIndex] || { surface: "omen", actor: "User", actionOwner: "user" };
  }

  function currentContinuation() {
    return EVENT_CONTINUATIONS[stage] || null;
  }

  function eventStartSurface(stageIndex) {
    var flow = APP_FLOWS[stageIndex];
    var flowStart = flow && flow.start;
    return (flowStart && flowStart.surface) || eventSurfaceDefaults(stageIndex).surface;
  }

  function nextEventSurface() {
    return stage < EVENT_SURFACES.length - 1 ? eventStartSurface(stage + 1) : "";
  }

  function nextControlPlacement(page) {
    var continuation = currentContinuation();
    if (!isEventComplete() || !continuation) return "outer";
    var currentSurface = (page && page.surface) || eventSurfaceDefaults(stage).surface;
    var upcomingSurface = nextEventSurface();
    if (currentSurface === "protocol") return "explainer";
    if (
      continuation.restart ||
      upcomingSurface === "protocol" ||
      !upcomingSurface ||
      upcomingSurface !== currentSurface
    ) return "browser";
    return "app";
  }

  function placeNextEventControl(page, browserBar, appWindow, guideDock) {
    var placement = nextControlPlacement(page);
    var continuation = currentContinuation();
    var continuationHost = null;
    var continuationDock = continuation && continuation.dock === "card" ? "card" : "page";
    if (placement === "app" && appWindow && continuation) {
      if (continuationDock === "page") {
        continuationHost = appWindow.querySelector(".live-main");
      } else {
        Array.prototype.some.call(appWindow.querySelectorAll(".live-card[data-block-title]"), function (card) {
          if (card.getAttribute("data-block-title") !== continuation.targetTitle) return false;
          continuationHost = card;
          return true;
        });
      }
    }
    if (placement === "app" && !continuationHost) placement = "browser";
    if (placement === "browser" && !browserBar) placement = "outer";
    if (placement === "explainer" && !guideDock) placement = "outer";
    next.classList.remove("sim-app-next", "sim-app-action", "sim-app-continuation", "sim-browser-next", "sim-explainer-next");
    next.classList.toggle("alt", placement === "outer");
    next.setAttribute("data-nav-placement", placement);
    next.setAttribute("data-sim-nav", "next-event");
    if (runControls) runControls.classList.toggle("is-next-docked", placement !== "outer");
    if (placement === "app" && continuationHost) {
      var continuationRow = makeEl("div", continuationDock === "page" ? "live-page-continuation" : "live-action-row live-continuation-row");
      continuationRow.setAttribute("data-continuation-dock", continuationDock);
      next.classList.add("sim-app-action", "sim-app-continuation");
      continuationRow.appendChild(next);
      continuationHost.appendChild(continuationRow);
      return;
    }
    if (placement === "browser") {
      next.classList.add("sim-browser-next");
      browserBar.appendChild(next);
      return;
    }
    if (placement === "explainer") {
      next.classList.add("sim-explainer-next");
      guideDock.appendChild(next);
      return;
    }
    if (runControls) runControls.appendChild(next);
  }

  function eventStepCount() {
    return (currentFlow().steps || []).length;
  }

  function cancelConfirmationTimers() {
    confirmationTimers.forEach(function (timer) { window.clearTimeout(timer); });
    confirmationTimers = [];
  }

  function clearStepConfirmation() {
    cancelConfirmationTimers();
    pendingConfirmation = null;
  }

  function queueStepConfirmation(step, targetStep) {
    clearStepConfirmation();
    if (!step || !step.toast) return;
    var duration = Math.max(2800, Math.min(7000, Number(step.toast.duration) || 4200));
    var toastBody = cleanTip(step.toast.body || step.result || "Action complete");
    var toastDetail = cleanTip(step.toast.detail || "Details remain available on this page");
    if (stage === 11 && activeEventStep === 1 && step.actionLabel === "Contribute to appeal") {
      var confirmedAmount = safeAppealContribution(appealContributionDraft);
      toastBody = appealMoney(confirmedAmount) + " added to the appeal bond";
      toastDetail = appealMoney(confirmedAmount * APPEAL_SERVICE_FEE / APPEAL_FUNDING_GOAL) + " service fee + " + appealMoney(confirmedAmount * APPEAL_SECURITY_BOND / APPEAL_FUNDING_GOAL) + " security bond";
    }
    pendingConfirmation = {
      stage: stage,
      step: targetStep,
      title: cleanTip(step.toast.title || step.result || "Complete"),
      body: toastBody,
      detail: toastDetail,
      duration: duration,
      expiresAt: Date.now() + duration
    };
  }

  function currentStepConfirmation() {
    if (!pendingConfirmation) return null;
    if (pendingConfirmation.stage !== stage || pendingConfirmation.step !== activeEventStep || pendingConfirmation.expiresAt <= Date.now()) {
      clearStepConfirmation();
      return null;
    }
    return pendingConfirmation;
  }

  function renderStepConfirmation(host, appTheme) {
    var notice = currentStepConfirmation();
    if (!host || !notice) return;
    cancelConfirmationTimers();
    var remaining = Math.max(1, notice.expiresAt - Date.now());
    var layer = makeEl("div", "sim-toast-layer");
    var toast = makeEl("div", "sim-result-toast");
    var icon = makeEl("span", "sim-toast-icon");
    var content = makeEl("span", "sim-toast-content");
    layer.setAttribute("data-app-theme", appTheme || "omen");
    layer.setAttribute("aria-hidden", "true");
    toast.style.setProperty("--toast-duration", remaining + "ms");
    icon.innerHTML = lucideMini("shield-check");
    content.appendChild(makeEl("span", "sim-toast-header", notice.title));
    content.appendChild(makeEl("span", "sim-toast-body", notice.body));
    content.appendChild(makeEl("span", "sim-toast-detail", notice.detail));
    toast.appendChild(icon);
    toast.appendChild(content);
    toast.appendChild(makeEl("span", "sim-toast-saved", "Details on page"));
    toast.appendChild(makeEl("span", "sim-toast-progress"));
    layer.appendChild(toast);
    host.appendChild(layer);
    function settleToastCoachmark(event) {
      if (event.target !== toast || event.animationName !== "toast-rise") return;
      toast.removeEventListener("animationend", settleToastCoachmark);
      invalidateCoachmarkGeometry("toast-entered", true);
      queueCoachmarkPosition();
    }
    toast.addEventListener("animationend", settleToastCoachmark);

    confirmationTimers.push(window.setTimeout(function () {
      if (pendingConfirmation !== notice) return;
      toast.classList.add("is-leaving");
    }, Math.max(0, remaining - 240)));
    confirmationTimers.push(window.setTimeout(function () {
      if (pendingConfirmation === notice) pendingConfirmation = null;
      if (layer.parentNode) layer.parentNode.removeChild(layer);
      confirmationTimers = [];
      invalidateCoachmarkGeometry("toast-dismissed", true);
      queueCoachmarkPosition();
    }, remaining));
  }

  function cancelAutomaticStep() {
    automaticStepToken += 1;
    if (automaticStepTimer) window.clearTimeout(automaticStepTimer);
    automaticStepTimer = null;
  }

  function scheduleAutomaticStep() {
    cancelAutomaticStep();
    var step = currentTutorialStep();
    if (!step || !step.autoAdvance || isEventComplete()) return;
    var expectedStage = stage;
    var expectedStep = activeEventStep;
    var token = automaticStepToken;
    var delay = Math.max(700, Math.min(5000, Number(step.autoDelay) || 1500));
    function completeWhenVisible() {
      if (token !== automaticStepToken || stage !== expectedStage || activeEventStep !== expectedStep) return;
      if (document.hidden) {
        automaticStepTimer = window.setTimeout(completeWhenVisible, 400);
        return;
      }
      automaticStepTimer = null;
      advanceEventStep({ automatic: true });
    }
    automaticStepTimer = window.setTimeout(completeWhenVisible, delay);
  }

  function previousRunState(stageIndex, stepIndex) {
    if (stepIndex > 0) {
      var steps = (APP_FLOWS[stageIndex] && APP_FLOWS[stageIndex].steps) || [];
      var previousStep = stepIndex - 1;
      while (previousStep > 0 && steps[previousStep] && steps[previousStep].autoAdvance) previousStep -= 1;
      return { stage: stageIndex, step: previousStep };
    }
    if (stageIndex <= 0) return null;
    var previousFlow = APP_FLOWS[stageIndex - 1] || { steps: [] };
    return { stage: stageIndex - 1, step: (previousFlow.steps || []).length };
  }

  function canRewindRunState() {
    return !!previousRunState(stage, activeEventStep);
  }

  function isEventComplete() {
    return activeEventStep >= eventStepCount();
  }

  function currentTutorialStep() {
    var steps = currentFlow().steps || [];
    return steps[activeEventStep] || null;
  }

  function lastTutorialStep() {
    var steps = currentFlow().steps || [];
    return activeEventStep > 0 ? steps[Math.min(activeEventStep - 1, steps.length - 1)] : null;
  }

  function eventPageAtStep(basePage, stepLimit) {
    var flow = currentFlow();
    var page = mergePage(eventSurfaceDefaults(stage), basePage);
    page = mergePage(page, flow.start);
    (flow.steps || []).forEach(function (step, index) {
      if (index < stepLimit) page = mergePage(page, step.after);
    });
    return page;
  }

  function resolvedEventPage(basePage) {
    var page = eventPageAtStep(basePage, activeEventStep);
    return applyJurorSettlement(applyAppealCrowdfunding(applyInsufficientBallotTally(applyBallotChoice(applyLiveFieldDrafts(applyLiveTradeSelection(applyOpeningLiquidityDraft(page)))))));
  }

  function currentSurfaceMeta() {
    var page = resolvedEventPage(APP_PAGES[stage] || {});
    var step = currentTutorialStep();
    var surface = (step && step.surface) || page.surface || "omen";
    var actionOwner = (step && step.actionOwner) || page.actionOwner || "user";
    if (isEventComplete() && surface !== "protocol") actionOwner = "simulator";
    return {
      surface: surface,
      view: (step && step.view) || page.view || (surface === "protocol" ? "sequence" : "application"),
      sequenceProfile: (step && step.sequenceProfile) || page.sequenceProfile || (surface === "protocol" ? "themis" : ""),
      actor: (step && step.actor) || page.actor || page.user || "User",
      actionOwner: actionOwner
    };
  }

  function currentActionOwner() {
    return currentSurfaceMeta().actionOwner;
  }

  function resetEventFlow(toEnd) {
    cancelAutomaticStep();
    clearStepConfirmation();
    activeEventStep = toEnd ? eventStepCount() : 0;
    activeAction = activeEventStep > 0 ? activeEventStep - 1 : -1;
    if (!toEnd && stage === 9) selectedBallotChoice = "";
  }

  function targetMatches(area, name) {
    var step = currentTutorialStep();
    if (!step || step.target !== area) return false;
    if (area === "primary") return true;
    return cleanTip(step.targetTitle || step.title) === cleanTip(name);
  }

  function stepActionLabel(step) {
    if (!step) return "Event complete";
    var label = cleanTip(step.actionLabel || (step.cue || "").replace(/^Tap\s+/i, "") || step.title || "Next step");
    if (stage === 1 && /^Buy (?:YES|NO) for \$50$/i.test(label)) return "Buy " + liveTradeSide + " for $50";
    if (stage === 11 && activeEventStep === 1 && /^Contribute to appeal$/i.test(label)) return "Contribute " + appealMoney(safeAppealContribution(appealContributionDraft)) + " to appeal";
    return label;
  }

  function stepCoachText(step) {
    var label = stepActionLabel(step);
    return CONTROL_COACH_COPY[label] || (step && step.coach) || (step && step.result) || "Tap this control to continue the app flow.";
  }

  function simulatorButtonInfo(button) {
    if (!button) return "";
    var continuation = currentContinuation();
    if (button.id === "runNext") {
      return continuation && isEventComplete()
        ? cleanTip(continuation.action + ". " + continuation.note)
        : "Complete the current event to unlock the next one.";
    }
    if (button.id === "runBack") {
      if (!canRewindRunState()) return "This is the first action in the run.";
      return activeEventStep > 0
        ? "Return to the previous screen state in this event."
        : "Return to the completed state of the previous event.";
    }
    if (button.id === "eventNavigatorToggle") {
      return button.getAttribute("aria-expanded") === "true"
        ? "Close the event navigator."
        : "Open the event navigator to revisit available events.";
    }
    if (button.classList.contains("tutorial-rewind")) {
      return activeEventStep > 0
        ? "Return to the previous screen state in this event."
        : "Return to the completed state of the previous event.";
    }
    if (button.classList.contains("stage-group-toggle")) {
      var groupName = cleanTip((button.querySelector(".stage-group-name") || {}).textContent);
      return (button.getAttribute("aria-expanded") === "true" ? "Collapse " : "Open ") + groupName + " events.";
    }
    if (button.classList.contains("stage-step")) return cleanTip(button.getAttribute("aria-label"));
    if (button.classList.contains("product-tab")) return cleanTip(button.getAttribute("aria-label"));
    return cleanTip(button.getAttribute("data-sim-tip") || button.getAttribute("data-action-info") || button.getAttribute("title") || button.getAttribute("aria-label") || button.textContent);
  }

  function ensureSimulatorButtonInfoLabels() {
    var scope = document.getElementById("system-run");
    if (!scope) return;
    scope.querySelectorAll("button").forEach(function (button) {
      if (button.classList.contains("guided-target")) {
        var step = currentTutorialStep();
        var label = cleanTip(button.getAttribute("data-action-label")) || stepActionLabel(step);
        var info = cleanTip(button.getAttribute("data-action-info")) || stepCoachText(step);
        tagWorkflowAction(button, label, info, button.getAttribute("data-action-owner") || currentActionOwner());
        button.removeAttribute("data-sim-tip");
        setAttributeToken(button, "aria-describedby", "guidedCoachmark", true);
        return;
      }
      if (button.disabled || button.getAttribute("aria-disabled") === "true") {
        button.removeAttribute("data-sim-tip");
        return;
      }
      var info = simulatorButtonInfo(button);
      if (info) {
        tagInfo(button, info);
        if ((button.getAttribute("aria-describedby") || "").split(/\s+/).indexOf("simTooltip") >= 0) {
          var visibleTooltip = document.getElementById("simTooltip");
          if (visibleTooltip && visibleTooltip.classList.contains("is-visible")) visibleTooltip.textContent = info;
        }
      }
    });
  }

  function targetInstruction() {
    var step = currentTutorialStep();
    return step ? step.cue : "Event complete";
  }

  function updateTargetCallout(callout, target) {
    var step = currentTutorialStep();
    var owner = cleanTip(target && target.getAttribute("data-action-owner")) || currentActionOwner();
    var label = cleanTip(target && target.getAttribute("data-action-label")) || stepActionLabel(step);
    var info = cleanTip(target && target.getAttribute("data-action-info")) || stepCoachText(step);
    var total = Math.max(1, (currentFlow().steps || []).length);
    var progress = step ? "Step " + Math.min(activeEventStep + 1, total) + " of " + total : "Event complete";
    var copyKey = [stage, activeEventStep, owner, label, info, progress].join("|");
    if (callout.getAttribute("data-copy-key") === copyKey) return;
    callout.replaceChildren();
    callout.appendChild(makeEl("small", "target-callout-step", progress));
    callout.appendChild(makeEl("b", "", (owner === "user" ? "Tap " : "Play ") + label));
    callout.appendChild(makeEl("span", "", info));
    callout.setAttribute("data-copy-key", copyKey);
  }

  function makeTargetCallout(target) {
    var callout = makeEl("div", "target-callout");
    callout.id = "guidedCoachmark";
    callout.setAttribute("role", "note");
    callout.setAttribute("aria-hidden", "false");
    updateTargetCallout(callout, target);
    return callout;
  }

  function setCoachmarkDescriptionTarget(target) {
    if (coachmarkDescribedTarget && coachmarkDescribedTarget !== target) {
      setAttributeToken(coachmarkDescribedTarget, "aria-describedby", "guidedCoachmark", false);
    }
    coachmarkDescribedTarget = target || null;
    if (!target) return;
    setAttributeToken(target, "aria-describedby", "guidedCoachmark", true);
  }

  function clearCoachmarkInlineSlots() {
    document.querySelectorAll(".coachmark-inline-slot").forEach(function (slot) {
      var parent = slot.parentElement;
      slot.remove();
      if (parent) {
        parent.classList.remove("has-inline-coachmark");
        parent.style.removeProperty("--sim-toast-safe-top");
      }
    });
  }

  function ensureCoachmark(target) {
    if (!coachmarkEl || !document.body.contains(coachmarkEl)) {
      coachmarkEl = makeTargetCallout(target);
      document.body.appendChild(coachmarkEl);
    } else {
      updateTargetCallout(coachmarkEl, target);
    }
    if (coachmarkEl.parentNode !== document.body) {
      document.body.appendChild(coachmarkEl);
      clearCoachmarkInlineSlots();
    }
    coachmarkEl.classList.remove("is-inline");
    setCoachmarkDescriptionTarget(target);
    return coachmarkEl;
  }

  function ensureCoachmarkConnector() {
    if (coachmarkConnectorEl && document.body.contains(coachmarkConnectorEl)) return coachmarkConnectorEl;
    var svgNs = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNs, "svg");
    var path = document.createElementNS(svgNs, "path");
    var endpoint = document.createElementNS(svgNs, "circle");
    svg.classList.add("coachmark-connector");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.hidden = true;
    path.setAttribute("data-coachmark-path", "");
    endpoint.setAttribute("data-coachmark-endpoint", "");
    endpoint.setAttribute("r", "4");
    svg.appendChild(path);
    svg.appendChild(endpoint);
    document.body.appendChild(svg);
    coachmarkConnectorEl = svg;
    return svg;
  }

  function hideCoachmarkConnector() {
    if (!coachmarkConnectorEl) return;
    coachmarkConnectorEl.hidden = true;
    var path = coachmarkConnectorEl.querySelector("[data-coachmark-path]");
    var endpoint = coachmarkConnectorEl.querySelector("[data-coachmark-endpoint]");
    if (path) path.removeAttribute("d");
    if (endpoint) {
      endpoint.removeAttribute("cx");
      endpoint.removeAttribute("cy");
      endpoint.setAttribute("hidden", "");
    }
  }

  function removeCoachmarkConnector() {
    if (coachmarkConnectorEl && coachmarkConnectorEl.parentNode) coachmarkConnectorEl.parentNode.removeChild(coachmarkConnectorEl);
    coachmarkConnectorEl = null;
  }

  function clearCoachmark() {
    setCoachmarkDescriptionTarget(null);
    if (coachmarkTargetObserver) coachmarkTargetObserver.disconnect();
    coachmarkTargetObserver = null;
    coachmarkObservedTarget = null;
    if (coachmarkEl && coachmarkEl.parentNode) {
      coachmarkEl.parentNode.removeChild(coachmarkEl);
    }
    removeCoachmarkConnector();
    coachmarkEl = null;
    coachmarkTargetKey = "";
    coachmarkLastPlacement = null;
    coachmarkObstacleCache = null;
    clearCoachmarkInlineSlots();
  }

  function coachmarkKeyForTarget(target) {
    var step = currentTutorialStep();
    return [
      stage,
      activeEventStep,
      activeAction,
      step ? step.target : "",
      step ? stepActionLabel(step) : "",
      target ? target.getAttribute("data-action-label") || "" : "",
      target ? target.getAttribute("data-action-info") || "" : ""
    ].join("|");
  }

  function activeCoachmarkTarget() {
    var root = document.getElementById("productDemo");
    var target = root && root.querySelector(".guided-target:not(:disabled)");
    if (target) return target;
    var continuation = document.getElementById("runNext");
    if (continuation && continuation.classList.contains("guided-target") && !continuation.hidden && !continuation.disabled) return continuation;
    return null;
  }

  function applyGuidedTarget(el, area, name) {
    if (!targetMatches(area, name)) return el;
    var step = currentTutorialStep();
    el.classList.add("guided-target");
    tagWorkflowAction(el, stepActionLabel(step), stepCoachText(step), currentActionOwner());
    setAttributeToken(el, "aria-describedby", "guidedCoachmark", true);
    if (!/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/i.test(el.tagName)) {
      el.setAttribute("role", "button");
      el.tabIndex = 0;
      el.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          advanceEventStep();
        }
      });
    }
    el.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      advanceEventStep();
    });
    return el;
  }

  function blockIsCurrentTarget(block) {
    return currentActionOwner() === "user" && targetMatches("block", block.title || blockTypeLabel(block.type));
  }

  function runContinuationAction() {
    var continuation = currentContinuation();
    if (!continuation || !isEventComplete()) return false;
    return continuation.restart ? restartRunFromContinuation() : goToNextEvent();
  }

  function makeLiveActionControl(block) {
    if (currentActionOwner() !== "user") return null;
    if (!blockIsCurrentTarget(block)) return null;
    if (block.type === "ballot") return null;
    var row = makeEl("div", "live-action-row");
    var btn = makeEl("button", "sim-app-action");
    var validationMessage = makeEl("span", "action-validation");
    btn.type = "button";
    validationMessage.id = "action-validation-" + stage + "-" + activeEventStep;
    validationMessage.setAttribute("aria-live", "polite");
    validationMessage.hidden = true;
    btn.appendChild(makeEl("span", "sim-app-action-label", stepActionLabel(currentTutorialStep())));
    applyGuidedTarget(btn, "block", block.title || blockTypeLabel(block.type));
    row.setAttribute("data-validates-action", "true");
    row.appendChild(btn);
    row.appendChild(validationMessage);
    setActionValidation(btn, validationMessage);
    return row;
  }

  function currentActionLabel() {
    var item = STAGES[stage] || {};
    var step = lastTutorialStep();
    if (step) return stepActionLabel(step);
    return item.actions && item.actions[activeAction] ? item.actions[activeAction] : "Action " + (activeAction + 1);
  }

  function appendAppRows(root, rows, context) {
    (rows || []).forEach(function (row) {
      var line = makeEl("div", "app-row");
      line.appendChild(makeEl("span", "", row[0]));
      line.appendChild(makeEl("b", "", row[1]));
      root.appendChild(line);
    });
  }

  function appendBars(root, bars, context) {
    (bars || []).forEach(function (bar) {
      var wrap = makeEl("div", "app-bar");
      var label = makeEl("div", "app-bar-label");
      var track = makeEl("div", "app-track");
      var fill = makeEl("span", "app-fill " + (bar[2] || ""));
      label.appendChild(makeEl("span", "", bar[0]));
      label.appendChild(makeEl("b", "", bar[1] + "%"));
      fill.style.setProperty("--w", Math.max(0, Math.min(100, bar[1])) + "%");
      tagInfo(wrap, cleanTip(bar[0]) + " is at " + bar[1] + "%. This meter shows how much of that " + cleanTip(context || "state") + " is active.");
      track.appendChild(fill);
      wrap.appendChild(label);
      wrap.appendChild(track);
      root.appendChild(wrap);
    });
  }

  function appendLiveRows(root, rows, context, editable) {
    (rows || []).forEach(function (row, index) {
      var field = makeEl("div", "live-field");
      var label = makeEl("label", "", row[0]);
      var labelRow = makeEl("div", "live-field-label");
      var controlType = row[2] || "";
      labelRow.appendChild(label);
      if (editable) labelRow.appendChild(makeHelpTip(row[0], fieldHelpText(row[0], context)));
      if (editable) {
        var id = "live-field-" + stage + "-" + cleanTip(context || "form").replace(/[^a-z0-9]+/gi, "-").toLowerCase() + "-" + index;
        var draftKey = stage + "|" + cleanTip(row[0]).toLowerCase();
        var control = document.createElement(controlType === "textarea" ? "textarea" : "input");
        control.className = "live-input live-control" + (controlType === "textarea" ? " live-textarea" : "");
        control.id = id;
        control.value = Object.prototype.hasOwnProperty.call(liveFieldDrafts, draftKey) ? liveFieldDrafts[draftKey] : row[1];
        control.setAttribute("aria-label", row[0]);
        if (control.tagName === "INPUT") control.type = "text";
        if (controlType === "textarea") field.classList.add("is-long");
        control.addEventListener("input", function () {
          liveFieldDrafts[draftKey] = control.value;
          syncGuidedActionValidity();
        });
        label.htmlFor = id;
        field.appendChild(labelRow);
        field.appendChild(control);
      } else {
        field.appendChild(labelRow);
        field.appendChild(makeEl("div", "live-static-value", row[1]));
      }
      root.appendChild(field);
    });
  }

  function collectVisibleBlockValues(value, values) {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach(function (item) { collectVisibleBlockValues(item, values); });
      return;
    }
    if (typeof value === "object") {
      Object.keys(value).forEach(function (key) {
        if (key !== "hot" && key !== "tone" && key !== "type") collectVisibleBlockValues(value[key], values);
      });
      if (value.yes != null) values.add(String(value.yes).toLowerCase() + "%");
      if (value.no != null) values.add(String(value.no).toLowerCase() + "%");
      return;
    }
    values.add(String(value).trim().toLowerCase());
  }

  function compactPageKpis(page) {
    var visibleValues = new Set();
    collectVisibleBlockValues(page && page.blocks, visibleValues);
    return (page && page.kpis || []).filter(function (kpi) {
      var label = String(kpi[0] || "").trim();
      var value = String(kpi[1] || "").trim().toLowerCase();
      return !/^next(?:\s|$)/i.test(label) && value && !visibleValues.has(value);
    });
  }

  function appendLiveKpis(root, page) {
    var kpis = compactPageKpis(page);
    if (!kpis.length) return;
    var wrap = makeEl("div", "live-kpis");
    kpis.forEach(function (kpi) {
      var item = makeEl("div", "live-kpi");
      item.appendChild(makeEl("span", "", kpi[0]));
      item.appendChild(makeEl("b", "", kpi[1]));
      wrap.appendChild(item);
    });
    root.appendChild(wrap);
  }

  function appendMiniTable(root, rows, context) {
    var table = makeEl("div", "mini-table");
    (rows || []).forEach(function (row) {
      var line = makeEl("div", "mini-row " + (row[3] || ""));
      line.appendChild(makeEl("b", "", row[0]));
      line.appendChild(makeEl("span", "", row[1]));
      line.appendChild(makeEl("span", "", row[2] || ""));
      table.appendChild(line);
    });
    root.appendChild(table);
  }

  function appendReceiptDetails(root, details) {
    if (!(details || []).length) return;
    var list = makeEl("dl", "receipt-details");
    (details || []).forEach(function (detail) {
      var row = makeEl("div", "receipt-detail");
      row.appendChild(makeEl("dt", "", detail[0] || ""));
      row.appendChild(makeEl("dd", "", detail[1] || ""));
      list.appendChild(row);
    });
    root.appendChild(list);
  }

  var PAGE_CHROME = {
    "create-market": { context: "Public market", user: "0x7c...42" },
    "live-market": { context: "EURO-FINAL", user: "0x7c...42" },
    "order-book": { context: "ERC-20 order book", user: "0x7c...42" },
    "token-lending": { context: "Protected lending", user: "0x7c...42" },
    "wallet-unlock": { context: "Portfolio", user: "0x7c...42" },
    "private-room": { context: "Private room", user: "0x7c...42" },
    "parlay-slip": { context: "Parlay builder", user: "0x7c...42" },
    "parlay-position": { context: "Active parlay", user: "0x7c...42" },
    "parlay-receipt": { context: "Cashout receipt", user: "0x7c...42" },
    "resolution-request": { context: "Court resolution", user: "Protocol" },
    "court-handoff": { context: "Product handoff", user: "Protocol" },
    "jury-draw": { context: "Case #1182", user: "0x7c...42" },
    "juror-workspace": { context: "Private ballot", user: "Juror 04" },
    "verdict-page": { context: "Case #1182", user: "0x7c...42" },
    "appeal-review": { context: "EURO-FINAL · Resolution", user: "0x51...9b" },
    "appeal-checkout": { context: "EURO-FINAL · Appeal", user: "0x51...9b" },
    "appeal-crowdfund": { context: "EURO-FINAL · Public appeal", user: "0x51...9b" },
    "appeal-result": { context: "EURO-FINAL · Resolution", user: "0x51...9b" },
    "juror-settlement": { context: "Private juror account", user: "Juror 04" },
    "final-receipt": { context: "Case #1182", user: "0x7c...42" },
    "settled-market": { context: "EURO-FINAL", user: "0x7c...42" }
  };

  var BLOCK_LABELS = {
    form: "Form",
    fields: "Form",
    choice: "Choice",
    liquidity: "Liquidity",
    receipt: "Receipt",
    record: "Activity",
    settlement: "Settlement",
    odds: "Market",
    marketTrade: "Market purchase",
    ticket: "Ticket",
    fill: "Best-price fill",
    yield: "Lending pool",
    utilities: "Token uses",
    capital: "Capital layers",
    table: "List",
    route: "Route",
    tokens: "Wallet",
    checklist: "Checks",
    participants: "People",
    messages: "Feed",
    legs: "Slip",
    scoreboard: "Source",
    countdown: "Timer",
    handoff: "Handoff",
    beacon: "Beacon",
    list: "List",
    seats: "Seats",
    faceChecks: "Presence",
    evidence: "Evidence",
    ballot: "Ballot",
    bars: "Meter",
    proof: "Proof",
    checkout: "Checkout",
    appealCrowdfund: "Appeal funding",
    jurorSettlement: "Juror settlement",
    closed: "Closed"
  };

  var BLOCK_ICONS = {
    form: "clipboard-list",
    fields: "clipboard-list",
    choice: "list-checks",
    liquidity: "coins",
    receipt: "receipt-text",
    record: "file-check-2",
    settlement: "wallet-cards",
    odds: "chart-no-axes-combined",
    marketTrade: "circle-dollar-sign",
    ticket: "ticket",
    fill: "route",
    yield: "coins",
    utilities: "wallet-cards",
    capital: "waypoints",
    table: "list-checks",
    route: "route",
    tokens: "wallet-cards",
    checklist: "clipboard-check",
    participants: "users-round",
    messages: "message-square",
    legs: "ticket",
    scoreboard: "gauge",
    countdown: "timer",
    handoff: "waypoints",
    beacon: "radio-tower",
    list: "list-checks",
    seats: "users-round",
    faceChecks: "scan-face",
    evidence: "file-search",
    ballot: "vote",
    bars: "gauge",
    proof: "shield-check",
    checkout: "credit-card",
    appealCrowdfund: "hand-coins",
    jurorSettlement: "wallet-cards",
    closed: "vault"
  };

  function pageChrome(page, item) {
    var chrome = PAGE_CHROME[page.template] || {};
    return {
      context: page.context || chrome.context || page.section || "Screen",
      user: page.account || chrome.user || "0x7c...42"
    };
  }

  function liveStatusTone(page) {
    if (page.statusTone) return page.statusTone;
    var status = cleanTip(page.status).toLowerCase();
    if (/\b(false|adversarial|challenge|wrong|failed|risk)\b/.test(status)) return "warn";
    if (/\bunlocked\b/.test(status)) return "neutral";
    if (/\b(live|open|filled|locked|checked|sealed|posted|published|saved|complete|completed|final|ready|decided|closed)\b/.test(status)) return "good";
    return "neutral";
  }

  function blockClassName(type) {
    return "block-" + String(type || "panel").replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }

  function blockTypeLabel(type) {
    return BLOCK_LABELS[type] || "Panel";
  }

  function makeBlockIcon(type) {
    var icon = makeEl("span", "block-icon");
    icon.innerHTML = lucideMini(BLOCK_ICONS[type] || "file-check-2");
    return icon;
  }

  function getStepGuide(item, focus) {
    return STEP_GUIDES[stage] || {
      label: focus.lane || item.title,
      headline: focus.change || item.title,
      look: focus.body || item.text,
      use: item.actions && item.actions.length ? "Try " + item.actions.join(", then ") + "." : "Press the screen buttons to see what changes.",
      notice: focus.why || item.log
    };
  }

  function renderStepGuide(item, guide, page) {
    var guideEl = makeEl("div", "sim-step-guide");
    var badge = makeEl("div", "sim-step-badge");
    var eventNumber = String(stage + 1).padStart(2, "0");
    badge.setAttribute("aria-label", "Event " + eventNumber + " of " + STAGES.length);
    badge.appendChild(makeEl("span", "", "Event "));
    badge.appendChild(makeEl("b", "", eventNumber));
    guideEl.appendChild(badge);

    var copy = makeEl("div", "sim-step-copy");
    copy.appendChild(makeEl("strong", "", guide.label));
    copy.appendChild(makeEl("b", "", guide.headline));
    copy.appendChild(makeEl("span", "", guide.look));
    guideEl.appendChild(copy);

    var tutorialDock = renderTutorialDock(item, guide, page);
    if (tutorialDock) {
      var controls = makeEl("div", "sim-step-controls");
      controls.appendChild(tutorialDock);
      guideEl.appendChild(controls);
    } else {
      guideEl.classList.add("has-floating-action-label");
    }

    return guideEl;
  }

  function renderTutorialDock(item, guide, page) {
    var flow = currentFlow();
    var steps = flow.steps || [];
    var step = currentTutorialStep();
    var completedStep = activeEventStep > 0 ? steps[Math.min(activeEventStep - 1, steps.length - 1)] : null;
    var continuation = currentContinuation();
    if (step && currentActionOwner() === "user") return null;
    var dock = makeEl("div", "tutorial-dock");
    var top = makeEl("div", "tutorial-top");
    var total = steps.length || 1;
    var current = Math.min(activeEventStep + 1, total);
    top.appendChild(makeEl("span", "tutorial-step", isEventComplete() ? "Event complete" : "Step " + current + " of " + total));
    var surfaceMeta = currentSurfaceMeta();
    if (surfaceMeta.view === "sequence" && canRewindRunState()) {
      var rewindAcrossEvent = activeEventStep === 0;
      var rewind = makeEl("button", "tutorial-rewind", rewindAcrossEvent ? "Previous event" : "Previous state");
      rewind.type = "button";
      rewind.setAttribute("aria-label", rewindAcrossEvent ? "Return to the completed state of the previous event" : "Return to the previous state in this event");
      tagInfo(rewind, rewindAcrossEvent ? "Return to the completed state of the previous event." : "Return to the previous screen state in this event.");
      rewind.addEventListener("click", rewindCurrentEventStep);
      top.appendChild(rewind);
    }
    dock.appendChild(top);

    var automaticPrefix = surfaceMeta.sequenceProfile === "omen" ? "Automatic execution · " : "Network step · ";
    if (step) {
      dock.appendChild(makeEl("div", "tutorial-cue", currentActionOwner() === "user" ? targetInstruction() : automaticPrefix + stepActionLabel(step)));
    } else if (!continuation) {
      dock.appendChild(makeEl("div", "tutorial-cue", "Run complete"));
    } else if (nextControlPlacement(page) !== "app") {
      dock.appendChild(makeEl("div", "tutorial-cue", continuation.action));
    }
    if (completedStep && completedStep.result) dock.appendChild(makeEl("div", "tutorial-result", completedStep.result));

    if (step && currentActionOwner() !== "user") {
      if (step.autoAdvance) {
        var automatic = makeEl("div", "automatic-progress");
        automatic.setAttribute("role", "status");
        automatic.setAttribute("aria-label", stepActionLabel(step) + " is completing automatically");
        automatic.appendChild(makeEl("span", "automatic-progress-mark"));
        var automaticCopy = makeEl("span", "automatic-progress-copy");
        automaticCopy.appendChild(makeEl("strong", "", stepActionLabel(step)));
        automaticCopy.appendChild(makeEl("span", "", "Completing automatically — no extra tap needed"));
        automatic.appendChild(automaticCopy);
        dock.appendChild(automatic);
      } else {
        var advance = makeEl("button", "tutorial-advance guided-target");
        advance.type = "button";
        tagWorkflowAction(advance, stepActionLabel(step), stepCoachText(step), currentActionOwner());
        setAttributeToken(advance, "aria-describedby", "guidedCoachmark", true);
        advance.appendChild(makeEl("span", "", "Play"));
        advance.appendChild(makeEl("b", "", stepActionLabel(step)));
        advance.addEventListener("click", advanceEventStep);
        dock.appendChild(advance);
      }
    }

    var dots = makeEl("div", "tutorial-dots");
    steps.forEach(function (_, index) {
      var dot = makeEl("span");
      if (index < activeEventStep) dot.classList.add("done");
      if (index === activeEventStep && !isEventComplete()) dot.classList.add("active");
      dots.appendChild(dot);
    });
    dock.appendChild(dots);
    return dock;
  }

  function simulatedAppUrl(page, appBoundary) {
    if (page.route) return appBoundary.appOrigin + page.route;
    var slug = (page.template || "screen").replace(/-/g, "/");
    return appBoundary.appOrigin + (page.route || "/" + slug);
  }

  var LIVE_BLOCK_LAYOUT_WEIGHTS = {
    fields: 7,
    choice: 5,
    liquidity: 6,
    receipt: 4,
    record: 6,
    settlement: 7,
    odds: 5,
    marketTrade: 10,
    table: 7,
    ticket: 7,
    fill: 9,
    yield: 10,
    utilities: 7,
    capital: 7,
    route: 6,
    checklist: 7,
    tokens: 6,
    participants: 5,
    legs: 6,
    scoreboard: 5,
    countdown: 3,
    handoff: 7,
    beacon: 7,
    seats: 6,
    faceChecks: 5,
    evidence: 4,
    ballot: 7,
    proof: 5,
    bars: 5,
    checkout: 7,
    appealCrowdfund: 10,
    jurorSettlement: 10,
    closed: 4
  };

  function liveBlockLayoutWeight(block) {
    var weight = LIVE_BLOCK_LAYOUT_WEIGHTS[block.type] || 5;
    if (block.wide) weight += 1;
    if (blockIsCurrentTarget(block)) weight += 3;
    return weight;
  }

  function distributeLiveBlockSpans(weights) {
    if (!weights.length) return [];
    if (weights.length === 1) return [12];
    var minimum = weights.length === 2 ? 5 : 3;
    var maximum = weights.length === 2 ? 7 : 6;
    var spans = weights.map(function () { return minimum; });
    var remaining = 12 - minimum * weights.length;
    while (remaining > 0) {
      var best = -1;
      var bestScore = -Infinity;
      weights.forEach(function (weight, index) {
        if (spans[index] >= maximum) return;
        var score = weight / (spans[index] + 1);
        if (score > bestScore) {
          best = index;
          bestScore = score;
        }
      });
      if (best < 0) break;
      spans[best] += 1;
      remaining -= 1;
    }
    return spans;
  }

  function liveBlockSpanPlan(blocks) {
    return distributeLiveBlockSpans((blocks || []).map(liveBlockLayoutWeight));
  }

  function renderActivityRecord(block, span) {
    var isCurrentTarget = blockIsCurrentTarget(block);
    var card = document.createElement("details");
    card.className = "live-card block-record activity-record live-span-" + (span || 4) + (block.tone ? " " + block.tone : "");
    card.setAttribute("data-block-title", block.title || "Activity details");
    if (block.wide) card.classList.add("wide");
    if (block.open || isCurrentTarget) card.open = true;
    if (isCurrentTarget) card.classList.add("awaiting-action");

    var summary = document.createElement("summary");
    var mark = makeEl("span", "record-mark");
    mark.innerHTML = lucideMini(block.icon || "file-check-2");
    var copy = makeEl("span", "record-copy");
    copy.appendChild(makeEl("strong", "", block.title || "Activity details"));
    copy.appendChild(makeEl("span", "", block.caption || "Permanent record"));
    summary.appendChild(mark);
    summary.appendChild(copy);
    summary.appendChild(makeEl("span", "record-value", block.value || "View details"));
    var chevron = makeEl("span", "record-chevron");
    chevron.setAttribute("aria-hidden", "true");
    summary.appendChild(chevron);
    card.appendChild(summary);

    var panel = makeEl("div", "record-panel");
    appendReceiptDetails(panel, block.details);
    if (block.note) panel.appendChild(makeEl("p", "app-note", block.note));
    card.appendChild(panel);
    var actionControl = makeLiveActionControl(block);
    if (actionControl) card.appendChild(actionControl);
    return card;
  }

  function animateSettlementValue(node, from, to, delay, duration, formatter) {
    if (!node) return;
    var format = formatter || function (value) { return String(Math.round(value)); };
    node.textContent = format(from);
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || from === to) {
      node.textContent = format(to);
      return;
    }
    window.setTimeout(function () {
      if (!node.isConnected) return;
      var startedAt = 0;
      function tick(timestamp) {
        if (!node.isConnected) return;
        if (!startedAt) startedAt = timestamp;
        var progress = Math.min(1, (timestamp - startedAt) / duration);
        var eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = format(from + (to - from) * eased);
        if (progress < 1) window.requestAnimationFrame(tick);
      }
      window.requestAnimationFrame(tick);
    }, delay);
  }

  function renderLiveBlock(block, span) {
    var type = block.type || "panel";
    if (type === "record") return renderActivityRecord(block, span);
    var isHot = hasHot(block.hot);
    var isCurrentTarget = blockIsCurrentTarget(block);
    var card = makeEl("div", "live-card " + blockClassName(type) + " " + (block.tone || ""));
    card.setAttribute("data-block-title", block.title || "");
    card.classList.add("live-span-" + (span || 4));
    if (block.wide) card.classList.add("wide");
    if (type === "ticket" && (block.rows || []).length > 3) card.classList.add("long-ticket");
    if (isHot) card.classList.add("hot");
    if (isCurrentTarget) card.classList.add("awaiting-action");
    var title = makeEl("div", "live-card-title");
    var titleMain = makeEl("span", "block-title-main");
    titleMain.appendChild(makeBlockIcon(type));
    titleMain.appendChild(makeEl("b", "", block.title || ""));
    if (block.help) titleMain.appendChild(makeHelpTip(block.title || blockTypeLabel(type), blockHelpText(block)));
    title.appendChild(titleMain);
    if (isHot) title.appendChild(makeEl("span", "step-link-badge", currentActionLabel()));
    card.appendChild(title);

    if (type === "fields") {
      appendLiveRows(card, block.rows, block.title || "form", Boolean(block.editable));
    } else if (type === "choice") {
      var picker = makeEl("div", "side-picker");
      (block.options || []).forEach(function (option) {
        picker.appendChild(tagInfo(makeEl("div", "side-button " + (option[1] || ""), option[0]), optionTip(option[0], block.title), true));
      });
      card.appendChild(picker);
      if (block.note) card.appendChild(makeEl("div", "app-note", block.note));
    } else if (type === "liquidity") {
      var liquidityGrid = makeEl("div", "liquidity-grid");
      var liquidityPreview = makeEl("div", "liquidity-preview");
      var oddsPreview = makeEl("div", "liquidity-preview-item");
      var escrowPreview = makeEl("div", "liquidity-preview-item");
      var oddsPreviewValue = makeEl("b");
      var escrowPreviewValue = makeEl("b");
      var oddsPreviewLabel = makeEl("div", "liquidity-preview-label");
      var escrowPreviewLabel = makeEl("div", "liquidity-preview-label");
      liquidityPreview.setAttribute("aria-live", "polite");
      oddsPreviewLabel.appendChild(makeEl("small", "", "Opening odds"));
      oddsPreviewLabel.appendChild(makeHelpTip("opening odds", "The funded YES and NO amounts are converted into the market's first implied probabilities."));
      oddsPreview.appendChild(oddsPreviewLabel);
      oddsPreview.appendChild(oddsPreviewValue);
      escrowPreviewLabel.appendChild(makeEl("small", "", "Opening escrow"));
      escrowPreviewLabel.appendChild(makeHelpTip("opening escrow", "The total creator-funded liquidity locked behind the market when it is published."));
      escrowPreview.appendChild(escrowPreviewLabel);
      escrowPreview.appendChild(escrowPreviewValue);
      liquidityPreview.appendChild(oddsPreview);
      liquidityPreview.appendChild(escrowPreview);

      function updateLiquidityPreview() {
        var yesAmount = safeLiquidityAmount(marketLiquidityDraft.yes);
        var noAmount = safeLiquidityAmount(marketLiquidityDraft.no);
        var totalAmount = yesAmount + noAmount;
        var yesPercent = totalAmount > 0 ? Math.round(yesAmount / totalAmount * 100) : 50;
        oddsPreviewValue.textContent = yesPercent + "% YES / " + (100 - yesPercent) + "% NO";
        escrowPreviewValue.textContent = formatLiquidityAmount(totalAmount);
      }

      (block.offers || []).forEach(function (offer) {
        var side = offer[0];
        var key = offer[1];
        var tone = offer[2] || "";
        var liquidityOffer = makeEl("div", "liquidity-offer");
        var sideButton = makeEl("button", "liquidity-side " + tone, side);
        var amountField = makeEl("div", "liquidity-amount");
        var captionRow = makeEl("div", "liquidity-caption-row");
        var amountLabel = makeEl("label", "liquidity-caption", "Liquidity");
        var amountInput = document.createElement("input");
        var amountId = "opening-liquidity-" + key;
        var liquidityTip = side + " opening liquidity is the amount locked behind " + side + " before publishing. It contributes to the opening odds and remains in escrow for traders to take.";
        amountInput.className = "liquidity-input";
        amountInput.id = amountId;
        amountInput.type = "number";
        amountInput.min = "0";
        amountInput.step = "0.01";
        amountInput.inputMode = "decimal";
        amountInput.value = safeLiquidityAmount(marketLiquidityDraft[key]).toFixed(2);
        amountInput.setAttribute("aria-label", side + " opening liquidity in dollars");
        sideButton.type = "button";
        sideButton.setAttribute("aria-label", "Toggle " + side + " opening liquidity");
        tagInfo(sideButton, liquidityTip);

        function syncLiquidityOffer() {
          var amount = safeLiquidityAmount(amountInput.value);
          marketLiquidityDraft[key] = amount;
          sideButton.setAttribute("aria-pressed", amount > 0 ? "true" : "false");
          liquidityOffer.classList.toggle("is-funded", amount > 0);
          updateLiquidityPreview();
          syncGuidedActionValidity();
        }

        sideButton.addEventListener("click", function () {
          amountInput.value = safeLiquidityAmount(amountInput.value) > 0 ? "0.00" : "0.10";
          syncLiquidityOffer();
          amountInput.focus();
        });
        amountInput.addEventListener("input", syncLiquidityOffer);
        syncLiquidityOffer();

        amountLabel.htmlFor = amountId;
        captionRow.appendChild(amountLabel);
        captionRow.appendChild(makeHelpTip(side + " opening liquidity", liquidityTip));
        amountField.appendChild(captionRow);
        amountField.appendChild(makeEl("span", "liquidity-currency", "$"));
        amountField.appendChild(amountInput);
        liquidityOffer.appendChild(sideButton);
        liquidityOffer.appendChild(amountField);
        liquidityGrid.appendChild(liquidityOffer);
      });
      card.appendChild(liquidityGrid);
      card.appendChild(liquidityPreview);
      if (block.note) card.appendChild(makeEl("div", "app-note", block.note));
    } else if (type === "yield") {
      var vault = makeEl("div", "defi-vault");
      var vaultHead = makeEl("div", "defi-vault-head");
      var vaultAsset = makeEl("div", "defi-vault-asset");
      vaultAsset.appendChild(makeEl("span", "defi-vault-token", block.asset || "YES"));
      var vaultName = makeEl("div", "defi-vault-name");
      vaultName.appendChild(makeEl("strong", "", block.market || "Outcome token lending"));
      var vaultBadges = makeEl("div", "defi-vault-badges");
      vaultBadges.appendChild(makeEl("span", "defi-vault-badge", "Protected lending"));
      vaultBadges.appendChild(makeEl("span", "defi-vault-badge", "NO lending market available"));
      vaultName.appendChild(vaultBadges);
      vaultAsset.appendChild(vaultName);
      vaultHead.appendChild(vaultAsset);
      var vaultRate = makeEl("div", "defi-vault-rate");
      vaultRate.appendChild(makeEl("span", "", "Estimated APY"));
      vaultRate.appendChild(makeEl("b", "", block.apy || "—"));
      vaultRate.appendChild(makeEl("small", "", "Variable with borrowing demand"));
      vaultHead.appendChild(vaultRate);
      vault.appendChild(vaultHead);

      var vaultStats = makeEl("div", "defi-vault-stats");
      [["Total deposits", block.tvl], ["Utilization", block.utilization], ["Daily estimate", block.daily]].forEach(function (stat, statIndex) {
        var vaultStat = makeEl("div", "defi-vault-stat" + (statIndex === 2 ? " is-yield" : ""));
        vaultStat.appendChild(makeEl("span", "", stat[0]));
        vaultStat.appendChild(makeEl("b", "", stat[1] || "—"));
        vaultStats.appendChild(vaultStat);
      });
      vault.appendChild(vaultStats);

      if (block.position) {
        var positionLive = makeEl("div", "defi-position-live");
        positionLive.appendChild(makeEl("span", "", "Position earning"));
        positionLive.appendChild(makeEl("b", "", block.position));
        vault.appendChild(positionLive);
      }

      var depositCard = makeEl("div", "defi-deposit-card");
      var depositTabs = makeEl("div", "defi-deposit-tabs");
      depositTabs.appendChild(makeEl("span", "defi-deposit-tab is-active", "Deposit"));
      depositTabs.appendChild(makeEl("span", "defi-deposit-tab", "Withdraw"));
      depositCard.appendChild(depositTabs);
      var depositBody = makeEl("div", "defi-deposit-body");
      var balanceRow = makeEl("div", "defi-balance-row");
      balanceRow.appendChild(makeEl("span", "", block.position ? "Remaining wallet balance" : "Wallet balance"));
      balanceRow.appendChild(makeEl("b", "", block.balance || "0 " + (block.asset || "YES")));
      depositBody.appendChild(balanceRow);
      var amountBox = makeEl("div", "defi-amount-box");
      var amountCopy = makeEl("div", "defi-amount-copy");
      amountCopy.appendChild(makeEl("span", "", block.position ? "Deposited amount" : "Amount to deposit"));
      amountCopy.appendChild(makeEl("b", "", block.amount || "0"));
      amountBox.appendChild(amountCopy);
      amountBox.appendChild(makeEl("span", "defi-token-select", block.asset || "YES"));
      depositBody.appendChild(amountBox);

      var yieldPreview = makeEl("div", "defi-yield-preview");
      [["Estimated yield · 30 days", block.estimate30], ["Estimated yield · 1 year", block.estimateYear]].forEach(function (estimate) {
        var estimateCard = makeEl("div", "defi-yield-estimate");
        estimateCard.appendChild(makeEl("span", "", estimate[0]));
        estimateCard.appendChild(makeEl("b", "", estimate[1] || "—"));
        yieldPreview.appendChild(estimateCard);
      });
      depositBody.appendChild(yieldPreview);

      var vaultTerms = makeEl("div", "defi-vault-terms");
      [["Withdrawal", block.withdraw], ["Deposit fee", block.depositFee], ["Borrower protection", block.collateral]].forEach(function (term) {
        var termRow = makeEl("div", "defi-vault-term");
        termRow.appendChild(makeEl("span", "", term[0]));
        termRow.appendChild(makeEl("b", "", term[1] || "—"));
        vaultTerms.appendChild(termRow);
      });
      depositBody.appendChild(vaultTerms);
      depositBody.appendChild(makeEl("p", "defi-vault-note", "Yield is an estimate, not a fixed promise. It changes with borrowing demand; depositing into lending does not place a market sell order."));
      depositCard.appendChild(depositBody);
      vault.appendChild(depositCard);
      card.appendChild(vault);
    } else if (type === "receipt") {
      card.appendChild(makeEl("div", "app-value", block.value));
      appendReceiptDetails(card, block.details);
      if (block.note) card.appendChild(makeEl("div", "app-note", block.note));
    } else if (type === "settlement") {
      var settlement = makeEl("div", "settlement-hero");
      var settlementMark = makeEl("span", "settlement-mark");
      settlementMark.innerHTML = lucideMini(block.icon || "wallet-cards");
      var settlementCopy = makeEl("div", "settlement-copy");
      settlementCopy.appendChild(makeEl("span", "", block.label || "Received"));
      settlementCopy.appendChild(makeEl("b", "", block.value || "Complete"));
      if (block.delta) settlementCopy.appendChild(makeEl("small", "", block.delta));
      settlement.appendChild(settlementMark);
      settlement.appendChild(settlementCopy);
      settlement.appendChild(makeEl("span", "settlement-status", block.status || "Complete"));
      card.appendChild(settlement);
      if ((block.details || []).length) {
        var settlementDetails = document.createElement("details");
        settlementDetails.className = "settlement-details";
        if (block.open) settlementDetails.open = true;
        settlementDetails.appendChild(makeEl("summary", "", block.detailsLabel || "Proof & transaction details"));
        appendReceiptDetails(settlementDetails, block.details);
        card.appendChild(settlementDetails);
      }
      if (block.note) card.appendChild(makeEl("div", "app-note", block.note));
    } else if (type === "odds") {
      var odds = makeEl("div", "big-odds");
      var yes = makeEl("div", "odds-side yes");
      var no = makeEl("div", "odds-side no");
      tagInfo(yes, "YES price is " + block.yes + "%. It is the market's current implied price for the true outcome.", true);
      tagInfo(no, "NO price is " + block.no + "%. It is the market's current implied price for the false outcome.", true);
      yes.appendChild(makeEl("span", "", "YES"));
      yes.appendChild(makeEl("b", "", block.yes + "%"));
      no.appendChild(makeEl("span", "", "NO"));
      no.appendChild(makeEl("b", "", block.no + "%"));
      odds.appendChild(yes);
      odds.appendChild(no);
      card.appendChild(odds);
    } else if (type === "fill") {
      var fill = makeEl("div", "best-fill");
      var fillRequest = makeEl("div", "fill-request");
      fillRequest.appendChild(makeEl("span", "", block.requestLabel || "Your order"));
      fillRequest.appendChild(makeEl("b", "", block.request || ""));
      fill.appendChild(fillRequest);

      var sourceList = makeEl("div", "fill-source-list");
      (block.sources || []).forEach(function (source, sourceIndex) {
        var tone = source[3] || "";
        var sourceRow = makeEl("div", "fill-source" + (tone ? " is-" + tone : ""));
        sourceRow.appendChild(makeEl("span", "fill-rank", tone === "unused" ? "\u2014" : String(sourceIndex + 1)));
        var sourceCopy = makeEl("div", "fill-source-copy");
        sourceCopy.appendChild(makeEl("b", "", source[0]));
        sourceCopy.appendChild(makeEl("span", "", source[4] || ""));
        sourceRow.appendChild(sourceCopy);
        var sourcePrice = makeEl("div", "fill-source-price");
        sourcePrice.appendChild(makeEl("b", "", source[2]));
        sourcePrice.appendChild(makeEl("span", "", source[1]));
        sourceRow.appendChild(sourcePrice);
        if (source[5]) tagInfo(sourceRow, source[5], true);
        sourceList.appendChild(sourceRow);
      });
      fill.appendChild(sourceList);

      if ((block.segments || []).length) {
        var fillRoute = makeEl("div", "fill-route");
        fillRoute.setAttribute("aria-label", block.routeLabel || "Order allocation");
        (block.segments || []).forEach(function (segment) {
          var fillSegment = makeEl("span", "fill-segment is-" + (segment[2] || "order"), segment[0]);
          fillSegment.style.flexBasis = String(segment[1] || 0) + "%";
          fillRoute.appendChild(fillSegment);
        });
        fill.appendChild(fillRoute);
      }

      if ((block.math || []).length) {
        var fillMath = makeEl("div", "fill-math");
        (block.math || []).forEach(function (calculation) {
          var mathItem = makeEl("div", "fill-math-item");
          mathItem.appendChild(makeEl("span", "", calculation[0]));
          mathItem.appendChild(makeEl("b", "", calculation[1]));
          fillMath.appendChild(mathItem);
        });
        fill.appendChild(fillMath);
      }
      if (block.totalLabel && block.totalValue) {
        var fillTotal = makeEl("div", "fill-total");
        fillTotal.appendChild(makeEl("span", "", block.totalLabel));
        fillTotal.appendChild(makeEl("b", "", block.totalValue));
        fill.appendChild(fillTotal);
      }
      if (block.note) fill.appendChild(makeEl("div", "app-note", block.note));
      card.appendChild(fill);
    } else if (type === "utilities") {
      var utilityGrid = makeEl("div", "token-utility-grid");
      (block.items || []).forEach(function (utility) {
        var utilityItem = makeEl("div", "token-utility" + (utility[3] ? " is-" + utility[3] : ""));
        utilityItem.appendChild(makeEl("span", "utility-eyebrow", utility[0]));
        utilityItem.appendChild(makeEl("strong", "", utility[1]));
        utilityItem.appendChild(makeEl("span", "", utility[2]));
        if (utility[4]) tagInfo(utilityItem, utility[4], true);
        utilityGrid.appendChild(utilityItem);
      });
      card.appendChild(utilityGrid);
      if (block.note) card.appendChild(makeEl("div", "app-note", block.note));
    } else if (type === "capital") {
      var capitalGrid = makeEl("div", "capital-layer-grid");
      (block.items || []).forEach(function (layer) {
        var capitalItem = makeEl("div", "capital-layer" + (layer[3] ? " is-" + layer[3] : ""));
        var capitalRole = makeEl("div", "capital-role");
        capitalRole.appendChild(makeEl("span", "", layer[0]));
        capitalRole.appendChild(makeEl("b", "", layer[1]));
        capitalItem.appendChild(capitalRole);
        capitalItem.appendChild(makeEl("div", "capital-detail", layer[2]));
        if (layer[4]) tagInfo(capitalItem, layer[4], true);
        capitalGrid.appendChild(capitalItem);
      });
      card.appendChild(capitalGrid);
      if (block.note) card.appendChild(makeEl("div", "app-note", block.note));
    } else if (type === "marketTrade") {
      var marketTrade = makeEl("div", "market-trade");
      if (block.position) {
        var marketPosition = makeEl("div", "market-trade-position");
        marketPosition.appendChild(makeEl("span", "", "Your position"));
        marketPosition.appendChild(makeEl("b", "", block.position));
        marketTrade.appendChild(marketPosition);
      }

      marketTrade.appendChild(makeEl("div", "market-outcome-label", block.position ? "Current market odds" : "Choose an outcome"));
      var outcomeGrid = makeEl("div", "market-outcomes");
      outcomeGrid.setAttribute("role", "group");
      outcomeGrid.setAttribute("aria-label", "Choose YES or NO");
      var outcomeButtons = [];
      [["YES", block.yes, "yes"], ["NO", block.no, "no"]].forEach(function (outcome) {
        var outcomeButton = makeEl("button", "market-outcome " + outcome[2]);
        outcomeButton.type = "button";
        outcomeButton.disabled = Boolean(block.position);
        outcomeButton.setAttribute("data-market-side", outcome[0]);
        outcomeButton.setAttribute("aria-pressed", String((block.selected || liveTradeSide) === outcome[0]));
        outcomeButton.appendChild(makeEl("span", "market-outcome-name", outcome[0]));
        outcomeButton.appendChild(makeEl("b", "", outcome[1] + "%"));
        outcomeButton.appendChild(makeEl("small", "", "Current odds"));
        if (!block.position) {
          tagInfo(outcomeButton, "Choose " + outcome[0] + ". The displayed percentage is the market's current estimate and can continue moving.");
          outcomeButton.addEventListener("click", function () {
            liveTradeSide = outcome[0];
            if (card._syncMarketTrade) card._syncMarketTrade();
          });
        }
        outcomeButtons.push(outcomeButton);
        outcomeGrid.appendChild(outcomeButton);
      });
      marketTrade.appendChild(outcomeGrid);

      var marketOrder = makeEl("div", "market-order");
      var marketAmount = makeEl("div", "market-order-item is-amount");
      marketAmount.appendChild(makeEl("span", "", "Amount"));
      marketAmount.appendChild(makeEl("b", "", block.amount || "$50"));
      var marketBalance = makeEl("div", "market-order-item");
      marketBalance.appendChild(makeEl("span", "", "Balance"));
      marketBalance.appendChild(makeEl("b", "", block.balance || "\u2014"));
      marketOrder.appendChild(marketAmount);
      marketOrder.appendChild(marketBalance);
      marketTrade.appendChild(marketOrder);

      var earlyReward = makeEl("div", "market-early-reward");
      var rewardHelp = block.rewardHelp || "Illustrated calculation: this entry has a 1.08× multiplier, made from 1.00× base plus a 0.08× early-entry reward. $50 × 1.08 = $54 if your outcome wins. Earlier entries receive higher displayed multipliers; the multiplier moves toward 1.00× over time and never guarantees profit.";
      var earlyRewardTitle = makeEl("div", "market-early-reward-title");
      earlyRewardTitle.appendChild(makeEl("strong", "", "Early-entry reward"));
      earlyRewardTitle.appendChild(makeHelpTip("how the early-entry reward is calculated", rewardHelp));
      earlyReward.appendChild(earlyRewardTitle);
      earlyReward.appendChild(makeEl("b", "", block.reward || "+8%"));
      var rewardExplanation = makeEl("p", "", block.rewardCopy || "If your outcome wins, your entry receives a larger share when winnings are divided.");
      rewardExplanation.appendChild(document.createTextNode(" This is not guaranteed profit."));
      earlyReward.appendChild(rewardExplanation);
      tagInfo(earlyReward, rewardHelp);
      marketTrade.appendChild(earlyReward);

      var pricingDetails = document.createElement("details");
      pricingDetails.className = "market-disclosure";
      pricingDetails.appendChild(makeEl("summary", "", "How this market sets its price"));
      pricingDetails.appendChild(makeEl("p", "", block.pricingCopy || "The balance between YES and NO sets the current odds."));
      marketTrade.appendChild(pricingDetails);

      if ((block.activity || []).length) {
        var activityDetails = document.createElement("details");
        activityDetails.className = "market-disclosure";
        activityDetails.appendChild(makeEl("summary", "", "Recent market activity"));
        appendMiniTable(activityDetails, block.activity, "recent market activity");
        marketTrade.appendChild(activityDetails);
      }

      card._syncMarketTrade = function () {
        outcomeButtons.forEach(function (button) {
          var selected = button.getAttribute("data-market-side") === liveTradeSide;
          button.classList.toggle("is-selected", selected);
          button.setAttribute("aria-pressed", String(selected));
        });
        if (!block.position) rewardExplanation.textContent = "If " + liveTradeSide + " wins, your $50 is treated like $54 when winnings are divided. This is not guaranteed profit.";
        var actionLabel = card.querySelector(".sim-app-action-label");
        var actionButton = card.querySelector(".sim-app-action");
        if (actionLabel) actionLabel.textContent = "Buy " + liveTradeSide + " for $50";
        if (actionButton) {
          tagWorkflowAction(actionButton, "Buy " + liveTradeSide + " for $50", CONTROL_COACH_COPY["Buy " + liveTradeSide + " for $50"], currentActionOwner());
          if (coachmarkEl) updateTargetCallout(coachmarkEl, actionButton);
        }
      };
      card.appendChild(marketTrade);
    } else if (type === "ticket") {
      var ticket = makeEl("div", "trade-ticket");
      appendLiveRows(ticket, block.rows, block.title || "ticket");
      if ((block.rows || []).length % 2 && ticket.lastElementChild) ticket.lastElementChild.classList.add("span-full");
      if (block.summaryLabel && block.summaryValue) {
        var summary = makeEl("div", "ticket-summary");
        summary.appendChild(makeEl("span", "", block.summaryLabel));
        summary.appendChild(makeEl("b", "", block.summaryValue));
        ticket.appendChild(summary);
      }
      card.appendChild(ticket);
    } else if (type === "table") {
      appendMiniTable(card, block.rows, block.title || "table");
    } else if (type === "route") {
      var route = makeEl("div", "app-route");
      (block.steps || []).forEach(function (step) {
        var item = makeEl("div", "app-route-step");
        item.appendChild(makeEl("i", "", step[0]));
        item.appendChild(makeEl("span", "", step[1]));
        item.appendChild(makeEl("span", "", step[2]));
        route.appendChild(item);
      });
      card.appendChild(route);
    } else if (type === "tokens") {
      var wallet = makeEl("div", "token-wallet");
      (block.tokens || []).forEach(function (token) {
        var item = makeEl("div", "wallet-token " + (token[2] || ""));
        item.appendChild(makeEl("span", "", token[0]));
        item.appendChild(makeEl("b", "", token[1]));
        wallet.appendChild(item);
      });
      card.appendChild(wallet);
    } else if (type === "checklist") {
      var list = makeEl("div", "check-list");
      (block.rows || []).forEach(function (row) {
        var item = makeEl("div", "check-item");
        item.appendChild(makeEl("span", "", row[0]));
        item.appendChild(makeEl("b", "", row[1]));
        list.appendChild(item);
      });
      card.appendChild(list);
    } else if (type === "participants") {
      var people = makeEl("div", "participant-grid");
      (block.people || []).forEach(function (person) {
        var item = makeEl("div", "participant");
        item.appendChild(makeEl("b", "", person[0]));
        item.appendChild(makeEl("span", "", person[1]));
        people.appendChild(item);
      });
      card.appendChild(people);
    } else if (type === "messages") {
      var feed = makeEl("div", "message-feed");
      (block.messages || []).forEach(function (msg) {
        feed.appendChild(makeEl("div", "message " + (msg[0] === "me" ? "me" : ""), msg[1]));
      });
      card.appendChild(feed);
    } else if (type === "legs") {
      var slip = makeEl("div", "bet-slip");
      (block.legs || []).forEach(function (leg) {
        var item = makeEl("div", "leg-card");
        item.appendChild(makeEl("b", "", leg[0]));
        item.appendChild(makeEl("span", "", leg[1]));
        slip.appendChild(item);
      });
      slip.appendChild(makeEl("div", "app-value", block.payout));
      card.appendChild(slip);
    } else if (type === "scoreboard") {
      var score = makeEl("div", "scoreboard");
      var left = makeEl("div", "team-score");
      var right = makeEl("div", "team-score");
      left.appendChild(makeEl("span", "", block.left[0]));
      left.appendChild(makeEl("b", "", block.left[1]));
      right.appendChild(makeEl("span", "", block.right[0]));
      right.appendChild(makeEl("b", "", block.right[1]));
      score.appendChild(left);
      score.appendChild(makeEl("div", "score-sep", block.note || "Final"));
      score.appendChild(right);
      card.appendChild(score);
    } else if (type === "countdown") {
      var timer = makeEl("div", "countdown");
      timer.appendChild(makeEl("span", "", block.note || ""));
      timer.appendChild(makeEl("b", "", block.value));
      card.appendChild(timer);
    } else if (type === "handoff") {
      var handoff = makeEl("div", "handoff");
      var leftBox = makeEl("div", "handoff-box");
      var rightBox = makeEl("div", "handoff-box");
      leftBox.appendChild(makeEl("b", "", block.left[0]));
      leftBox.appendChild(makeEl("div", "app-note", block.left[1]));
      rightBox.appendChild(makeEl("b", "", block.right[0]));
      rightBox.appendChild(makeEl("div", "app-note", block.right[1]));
      handoff.appendChild(leftBox);
      handoff.appendChild(makeEl("div", "handoff-arrow", "->"));
      handoff.appendChild(rightBox);
      card.appendChild(handoff);
    } else if (type === "beacon") {
      var beacon = makeEl("div", "beacon-readout");
      beacon.appendChild(tagInfo(makeEl("code", "", block.code), "This randomness plus the case seed creates the one jury draw.", true));
      beacon.appendChild(makeEl("div", "app-note", block.note));
      card.appendChild(beacon);
    } else if (type === "seats") {
      var seats = makeEl("div", "app-seat-grid");
      for (var i = 0; i < (block.count || 0); i += 1) {
        seats.appendChild(tagInfo(makeEl("span", "app-seat" + (i < (block.on || 0) ? " on" : "")), "Seat " + (i + 1) + (i < (block.on || 0) ? " is drawn for this case." : " is not active yet."), true));
      }
      card.appendChild(seats);
    } else if (type === "faceChecks") {
      var checks = makeEl("div", "face-checks");
      (block.rows || []).forEach(function (row) {
        var item = makeEl("div", "face-check");
        item.appendChild(makeEl("span", "", row[0]));
        item.appendChild(makeEl("b", "", row[1]));
        checks.appendChild(item);
      });
      card.appendChild(checks);
    } else if (type === "evidence") {
      var evidence = makeEl("div", "evidence-brief");
      var evidenceRows = block.rows || (block.tabs || []).map(function (value, index) {
        return [["Question", "Answer rule", "Research"][index] || "Case", value];
      });
      evidenceRows.forEach(function (row) {
        var item = makeEl("div", "evidence-item");
        item.appendChild(makeEl("span", "", row[0]));
        item.appendChild(makeEl("b", "", row[1]));
        evidence.appendChild(item);
      });
      card.appendChild(evidence);
    } else if (type === "appealCrowdfund") {
      var appealGoal = Math.max(1, Number(block.goal || 0));
      var appealFunded = Math.max(0, Math.min(appealGoal, Number(block.funded || 0)));
      var appealRemaining = Math.max(0, appealGoal - appealFunded);
      var appealShell = makeEl("div", "appeal-crowdfund");
      var appealSummary = makeEl("div", "appeal-funding-summary");
      var appealNumbers = makeEl("div", "appeal-funding-numbers");
      appealNumbers.appendChild(makeEl("span", "", "Public bond progress"));
      var appealTotalReadout = makeEl("b");
      appealTotalReadout.appendChild(document.createTextNode(appealMoney(appealFunded)));
      appealTotalReadout.appendChild(makeEl("small", "", " of " + appealMoney(appealGoal)));
      appealNumbers.appendChild(appealTotalReadout);
      var appealDeadline = makeEl("div", "appeal-deadline");
      appealDeadline.appendChild(makeEl("span", "", "Funding deadline"));
      appealDeadline.appendChild(makeEl("b", "", block.deadline || "Deadline pending"));
      appealSummary.appendChild(appealNumbers);
      appealSummary.appendChild(appealDeadline);
      appealShell.appendChild(appealSummary);

      var appealProgress = makeEl("div", "appeal-progress");
      appealProgress.setAttribute("role", "progressbar");
      appealProgress.setAttribute("aria-valuemin", "0");
      appealProgress.setAttribute("aria-valuemax", String(appealGoal));
      appealProgress.setAttribute("aria-valuenow", String(appealFunded));
      (block.contributors || []).forEach(function (contributor) {
        var segment = makeEl("i", "appeal-progress-segment is-" + (contributor[3] || "community"));
        segment.style.setProperty("--appeal-share", Math.max(0, Number(contributor[1] || 0)) / appealGoal * 100 + "%");
        segment.setAttribute("aria-hidden", "true");
        appealProgress.appendChild(segment);
      });
      appealShell.appendChild(appealProgress);
      var appealProgressMeta = makeEl("div", "appeal-progress-meta");
      appealProgressMeta.appendChild(makeEl("span", "", Math.round(appealFunded / appealGoal * 100) + "% funded"));
      appealProgressMeta.appendChild(makeEl("b", "", appealRemaining ? appealMoney(appealRemaining) + " remaining" : "Goal reached"));
      appealShell.appendChild(appealProgressMeta);

      var appealBody = makeEl("div", "appeal-crowdfund-body");
      var contributorPanel = makeEl("section", "appeal-contributors");
      var contributorHeading = makeEl("div", "appeal-panel-heading");
      contributorHeading.appendChild(makeEl("b", "", "Bond contributors"));
      contributorHeading.appendChild(makeEl("span", "", (block.contributors || []).length ? (block.contributors || []).length + " visible groups" : "No funds locked"));
      contributorPanel.appendChild(contributorHeading);
      var contributorList = makeEl("div", "appeal-contributor-list");
      if (!(block.contributors || []).length) {
        var emptyFunding = makeEl("div", "appeal-empty-state");
        emptyFunding.appendChild(makeEl("b", "", "This goal is still empty"));
        emptyFunding.appendChild(makeEl("span", "", "A jury starts only if supporters reach 100% before the deadline."));
        contributorList.appendChild(emptyFunding);
      } else {
        (block.contributors || []).forEach(function (contributor) {
          var contributorRow = makeEl("div", "appeal-contributor-row" + (contributor[3] === "you" ? " is-you" : ""));
          var contributorIdentity = makeEl("div");
          contributorIdentity.appendChild(makeEl("b", "", contributor[0]));
          contributorIdentity.appendChild(makeEl("span", "", Number(contributor[2] || 0).toFixed(1) + "% of goal"));
          contributorRow.appendChild(contributorIdentity);
          contributorRow.appendChild(makeEl("strong", "", appealMoney(contributor[1])));
          contributorList.appendChild(contributorRow);
        });
      }
      contributorPanel.appendChild(contributorList);
      appealBody.appendChild(contributorPanel);

      var contributionPanel = makeEl("section", "appeal-contribution-panel" + (block.editable ? " is-editable" : ""));
      var contributionHeading = makeEl("div", "appeal-panel-heading");
      contributionHeading.appendChild(makeEl("b", "", block.editable ? "Add your contribution" : "Funding rule"));
      contributionHeading.appendChild(makeEl("span", "", block.editable ? "Connected · 0x51...9b" : "Automatic at deadline"));
      contributionPanel.appendChild(contributionHeading);
      if (block.editable) {
        var contributionField = makeEl("label", "appeal-contribution-field");
        contributionField.appendChild(makeEl("span", "", "Contribution amount"));
        var contributionInputWrap = makeEl("div", "appeal-contribution-input");
        contributionInputWrap.appendChild(makeEl("span", "", "$"));
        var contributionInput = document.createElement("input");
        contributionInput.type = "number";
        contributionInput.min = "50";
        contributionInput.max = String(Math.max(50, appealRemaining));
        contributionInput.step = "50";
        contributionInput.inputMode = "decimal";
        contributionInput.value = String(safeAppealContribution(appealContributionDraft));
        contributionInput.setAttribute("aria-label", "Appeal contribution in dollars");
        contributionInputWrap.appendChild(contributionInput);
        contributionField.appendChild(contributionInputWrap);
        contributionPanel.appendChild(contributionField);
        var contributionPresets = makeEl("div", "appeal-contribution-presets");
        [["$1,000", 1000], ["$4,000", 4000], ["Fill remaining", appealRemaining]].forEach(function (preset) {
          var presetButton = makeEl("button", "", preset[0]);
          presetButton.type = "button";
          presetButton.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            appealContributionDraft = safeAppealContribution(preset[1]);
            contributionInput.value = String(appealContributionDraft);
            if (card._syncAppealContribution) card._syncAppealContribution();
          });
          contributionPresets.appendChild(presetButton);
        });
        contributionPanel.appendChild(contributionPresets);
        var contributionImpact = makeEl("div", "appeal-contribution-impact");
        var contributionShare = makeEl("b");
        var contributionCopy = makeEl("span");
        contributionImpact.appendChild(contributionShare);
        contributionImpact.appendChild(contributionCopy);
        contributionPanel.appendChild(contributionImpact);
        contributionInput.addEventListener("input", function () {
          appealContributionDraft = safeAppealContribution(contributionInput.value);
          if (card._syncAppealContribution) card._syncAppealContribution();
          syncGuidedActionValidity();
        });
        card._syncAppealContribution = function () {
          var amount = safeAppealContribution(appealContributionDraft);
          var share = amount / appealGoal * 100;
          if (Number(contributionInput.value) !== amount) contributionInput.value = String(amount);
          contributionShare.textContent = share.toFixed(1) + "% funding share";
          contributionCopy.textContent = "Tagged split: " + appealMoney(amount * APPEAL_SERVICE_FEE / APPEAL_FUNDING_GOAL) + " service fee + " + appealMoney(amount * APPEAL_SECURITY_BOND / APPEAL_FUNDING_GOAL) + " security. Only the security can return.";
          var actionLabel = card.querySelector(".sim-app-action-label");
          var actionButton = card.querySelector(".sim-app-action");
          if (actionLabel) actionLabel.textContent = "Contribute " + appealMoney(amount) + " to appeal";
          if (actionButton) {
            tagWorkflowAction(actionButton, "Contribute " + appealMoney(amount) + " to appeal", "Lock this wallet's contribution directly in the DemoThemis appeal contract. The appeal starts only after all wallets together reach the full goal.", currentActionOwner());
            if (coachmarkEl) updateTargetCallout(coachmarkEl, actionButton);
          }
        };
      } else {
        var fundingRule = makeEl("div", "appeal-funding-rule");
        fundingRule.appendChild(makeEl("b", "", appealRemaining ? "Below goal: no jury starts" : "Goal funded: jury starts"));
        fundingRule.appendChild(makeEl("span", "", appealRemaining ? "Partial contributions remain individually attributable and refund automatically if the deadline arrives first." : "The service fee is paid once and every wallet retains only its proportional security principal."));
        contributionPanel.appendChild(fundingRule);
      }
      appealBody.appendChild(contributionPanel);
      appealShell.appendChild(appealBody);

      var appealOutcomes = makeEl("div", "appeal-outcome-rules");
      var successRule = makeEl("div", "is-success");
      successRule.appendChild(makeEl("span", "", "If the appeal succeeds"));
      successRule.appendChild(makeEl("b", "", "Security principal returns pro-rata"));
      var failureRule = makeEl("div", "is-failure");
      failureRule.appendChild(makeEl("span", "", "If the appeal fails"));
      failureRule.appendChild(makeEl("b", "", "Security alone forfeits pro-rata"));
      appealOutcomes.appendChild(successRule);
      appealOutcomes.appendChild(failureRule);
      appealShell.appendChild(appealOutcomes);

      if ((block.quoteRows || []).length) {
        var quoteDetails = document.createElement("details");
        quoteDetails.className = "appeal-quote-details";
        quoteDetails.appendChild(makeEl("summary", "", "Why the goal is " + appealMoney(appealGoal)));
        appendMiniTable(quoteDetails, block.quoteRows, "appeal goal calculation");
        quoteDetails.appendChild(makeEl("p", "", "The goal is the tagged service fee plus separate security bond. OmenMarketMaker cannot change either amount."));
        appealShell.appendChild(quoteDetails);
      }
      var appealCustody = makeEl("div", "appeal-custody-note");
      appealCustody.appendChild(makeEl("b", "", "Direct custody boundary"));
      appealCustody.appendChild(makeEl("span", "", "Funds go wallet → " + (block.destination || "DemoThemis appeal contract") + ". OmenMarketMaker only provides the interface; the $118,000 market escrow never moves."));
      appealShell.appendChild(appealCustody);
      card.appendChild(appealShell);
    } else if (type === "ballot") {
      var ballot = makeEl("div", "app-ballot");
      var ballotButtons = [];
      var confirmBallot = makeEl("button", "sim-app-action ballot-confirm-action");
      confirmBallot.type = "button";
      function syncBallotChoice() {
        ballotButtons.forEach(function (button) {
          button.setAttribute("aria-pressed", button.getAttribute("data-choice") === selectedBallotChoice ? "true" : "false");
        });
        confirmBallot.disabled = !selectedBallotChoice;
        var sealLabel = selectedBallotChoice === "INSUFFICIENT INFORMATION"
          ? "Seal insufficient-information ballot"
          : selectedBallotChoice
            ? "Seal " + selectedBallotChoice + " ballot"
            : "Choose an answer to seal";
        confirmBallot.replaceChildren(makeEl("span", "sim-app-action-label", sealLabel));
      }
      (block.options || []).forEach(function (option) {
        var buttonClass = option[1] === "good" ? "yes" : option[1] === "insufficient" ? "insufficient" : "no";
        var btn = makeEl("button", buttonClass, option[0]);
        btn.type = "button";
        btn.setAttribute("data-choice", option[0]);
        tagInfo(btn, optionTip(option[0], "encrypted ballot") + " The counted vote stays private until aggregate proof.");
        if (blockIsCurrentTarget(block)) {
          btn.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            selectedBallotChoice = option[0];
            syncBallotChoice();
            confirmBallot.focus();
          });
        }
        ballotButtons.push(btn);
        ballot.appendChild(btn);
      });
      if (blockIsCurrentTarget(block)) applyGuidedTarget(confirmBallot, "block", block.title || blockTypeLabel(block.type));
      syncBallotChoice();
      ballot.appendChild(confirmBallot);
      card.appendChild(ballot);
      if (block.note) card.appendChild(makeEl("div", "app-note", block.note));
    } else if (type === "jurorSettlement") {
      var settlement = makeEl("div", "juror-settlement");
      var settlementRoute = makeEl("div", "juror-settlement-route");
      var routeSource = makeEl("div", "juror-route-node");
      routeSource.appendChild(makeEl("span", "", "Payment source"));
      routeSource.appendChild(makeEl("b", "", block.source || "Locked panel quote"));
      var routeTrack = makeEl("div", "juror-route-track");
      routeTrack.setAttribute("aria-label", "Compensation moves directly from the locked court fee to the juror wallet");
      var routeDestination = makeEl("div", "juror-route-node");
      routeDestination.appendChild(makeEl("span", "", "Private destination"));
      routeDestination.appendChild(makeEl("b", "", block.destination || "Juror wallet"));
      settlementRoute.appendChild(routeSource);
      settlementRoute.appendChild(routeTrack);
      settlementRoute.appendChild(routeDestination);
      settlement.appendChild(settlementRoute);

      var settlementGrid = makeEl("div", "juror-settlement-grid");
      var walletPanel = makeEl("section", "juror-account-panel is-wallet");
      var walletHeading = makeEl("div", "juror-account-heading");
      walletHeading.appendChild(makeEl("span", "", "Juror wallet"));
      walletHeading.appendChild(makeEl("span", "juror-private-badge", "Private account"));
      walletPanel.appendChild(walletHeading);
      var walletBalance = makeEl("div", "juror-wallet-balance");
      walletBalance.appendChild(makeEl("span", "", "Available balance"));
      var walletBalanceValue = makeEl("b", "", "$" + Number(block.balanceBefore || 0).toFixed(2));
      walletBalance.appendChild(walletBalanceValue);
      walletPanel.appendChild(walletBalance);
      var feeLine = makeEl("div", "juror-credit-line");
      feeLine.appendChild(makeEl("span", "", "Case #1182 juror compensation"));
      feeLine.appendChild(makeEl("b", "", "+$" + Number(block.fee || 0).toFixed(2)));
      walletPanel.appendChild(feeLine);
      var reserveLine = makeEl("div", "juror-credit-line" + (Number(block.reserveDebit || 0) > 0 ? " is-debit" : ""));
      reserveLine.appendChild(makeEl("span", "", Number(block.reserveDebit || 0) > 0 ? "Private live-reserve debit" : "Live reserve released"));
      reserveLine.appendChild(makeEl("b", "", Number(block.reserveDebit || 0) > 0 ? "-$" + Number(block.reserveDebit).toFixed(2) : "$0 debit"));
      walletPanel.appendChild(reserveLine);
      var creditTotal = makeEl("div", "juror-credit-total");
      creditTotal.appendChild(makeEl("span", "", "Net wallet credit"));
      creditTotal.appendChild(makeEl("b", "", "+$" + Number(block.netCredit || 0).toFixed(2)));
      walletPanel.appendChild(creditTotal);

      var ratingPanel = makeEl("section", "juror-account-panel is-rating");
      var ratingHeading = makeEl("div", "juror-account-heading");
      ratingHeading.appendChild(makeEl("span", "", "Juror rating"));
      ratingHeading.appendChild(makeEl("span", "juror-private-badge", "Only you see this"));
      ratingPanel.appendChild(ratingHeading);
      var ratingReadout = makeEl("div", "juror-rating-readout");
      var ratingValue = makeEl("b", "", Number(block.ratingBefore || 0).toLocaleString("en-US"));
      var ratingDelta = Number(block.ratingDelta || 0);
      var ratingDeltaEl = makeEl("span", "juror-rating-delta" + (ratingDelta < 0 ? " is-down" : ""), (ratingDelta >= 0 ? "+" : "") + ratingDelta);
      ratingReadout.appendChild(ratingValue);
      ratingReadout.appendChild(ratingDeltaEl);
      ratingPanel.appendChild(ratingReadout);
      var ratingMeter = makeEl("div", "juror-rating-meter");
      var ratingMeterFill = makeEl("i");
      var ratingProgress = Math.max(12, Math.min(100, Number(block.ratingAfter || 0) / 2000 * 100));
      ratingMeter.style.setProperty("--rating-progress", ratingProgress.toFixed(1) + "%");
      ratingMeter.appendChild(ratingMeterFill);
      ratingPanel.appendChild(ratingMeter);
      var ratingFactors = makeEl("div", "juror-rating-factors");
      var ballotFactor = makeEl("div", "juror-rating-factor");
      ballotFactor.appendChild(makeEl("span", "", block.voteLabel || "Your sealed ballot"));
      ballotFactor.appendChild(makeEl("b", "", block.vote || "NO"));
      ratingFactors.appendChild(ballotFactor);
      var verdictFactor = makeEl("div", "juror-rating-factor");
      verdictFactor.appendChild(makeEl("span", "", "Final post-appeal result"));
      verdictFactor.appendChild(makeEl("b", "", block.finalVerdict || "NO 9-6"));
      ratingFactors.appendChild(verdictFactor);
      (block.factors || []).forEach(function (factor) {
        var factorRow = makeEl("div", "juror-rating-factor");
        factorRow.appendChild(makeEl("span", "", factor[0]));
        factorRow.appendChild(makeEl("b", "", factor[1]));
        ratingFactors.appendChild(factorRow);
      });
      ratingPanel.appendChild(ratingFactors);
      settlementGrid.appendChild(walletPanel);
      settlementGrid.appendChild(ratingPanel);
      settlement.appendChild(settlementGrid);
      settlement.appendChild(makeEl("div", "juror-settlement-note", block.note || "The exact wallet and rating update remain private to this juror."));
      card.appendChild(settlement);

      animateSettlementValue(walletBalanceValue, Number(block.balanceBefore || 0), Number(block.balanceAfter || 0), 420, 920, function (value) {
        return "$" + value.toFixed(2);
      });
      animateSettlementValue(ratingValue, Number(block.ratingBefore || 0), Number(block.ratingAfter || 0), 1180, 860, function (value) {
        return Math.round(value).toLocaleString("en-US");
      });
    } else if (type === "bars") {
      appendBars(card, block.bars, block.title || "meter");
    } else if (type === "proof") {
      var proofStamp = block.stamp || (block.verified === false ? "" : "Proof verified");
      if (proofStamp) card.appendChild(makeEl("span", "proof-stamp", proofStamp));
      card.appendChild(makeEl("div", "app-value", block.result));
      card.appendChild(makeEl("div", "app-note", block.note));
    } else if (type === "checkout") {
      var winnerRow = cleanTip(block.winnerRow || (block.winner || "").replace(/\s+sets\s+.*$/i, ""));
      (block.rows || []).forEach(function (row) {
        var line = makeEl("div", "checkout-row " + (winnerRow && cleanTip(row[0]) === winnerRow ? "winner" : ""));
        line.appendChild(makeEl("span", "", row[0]));
        line.appendChild(makeEl("b", "", row[1]));
        card.appendChild(line);
      });
      card.appendChild(makeEl("div", "app-note", block.winner));
    } else if (type === "closed") {
      card.appendChild(makeEl("div", "closed-stamp", block.value));
    } else {
      appendLiveRows(card, block.rows, block.title || "panel");
    }
    var actionControl = makeLiveActionControl(block);
    if (actionControl) card.appendChild(actionControl);
    if (card._syncMarketTrade) card._syncMarketTrade();
    if (card._syncAppealContribution) card._syncAppealContribution();
    return card;
  }

  function renderLivePage(page, item) {
    var chrome = pageChrome(page, item);
    var layout = makeEl("div", "live-page page-" + (page.template || "default"));
    var main = makeEl("div", "live-main");
    var blocks = page.blocks || [];
    var blockSpans = liveBlockSpanPlan(blocks);
    main.classList.add("live-layout-" + blocks.length);
    main.setAttribute("data-block-count", String(blocks.length));
    var head = makeEl("div", "live-head");
    var headMain = makeEl("div", "live-head-main");
    var headActions = makeEl("div", "live-head-actions");
    headMain.appendChild(makeEl("div", "app-eyebrow", page.section));
    headMain.appendChild(makeEl("h4", "", page.title));
    headMain.appendChild(makeEl("p", "", page.subtitle));
    headActions.appendChild(makeEl("div", "live-status " + liveStatusTone(page), page.status));
    head.appendChild(headMain);
    head.appendChild(headActions);
    main.appendChild(head);
    appendLiveKpis(main, page);
    blocks.forEach(function (block, index) {
      main.appendChild(renderLiveBlock(block, blockSpans[index]));
    });
    layout.appendChild(main);
    return layout;
  }

  function isSequencePage(page) {
    return Boolean(page && (page.view === "sequence" || page.surface === "protocol"));
  }

  function sequenceProfileForPage(page) {
    if (page && page.sequenceProfile === "omen") {
      return {
        key: "omen",
        icon: "route",
        title: "OmenMarketMaker solver execution",
        stateLabel: "Execution state",
        factsLabel: "Current execution facts",
        recordsLabel: "Execution records",
        traceLabel: "Solver execution sequence",
        ownerLabel: "Solver network",
        badges: [["", "Competitive bids"], ["receipts", "Fully backed"]],
        legend: [["", "Solver step"], ["receipt", "Receipt"], ["pending", "Queued state"]]
      };
    }
    return {
      key: "themis",
      icon: "waypoints",
      title: "DemoThemis on-chain sequence",
      stateLabel: "Network state",
      factsLabel: "Current protocol facts",
      recordsLabel: "Public protocol records",
      traceLabel: "On-chain event sequence",
      ownerLabel: "Protocol",
      badges: [["", "Automatic"], ["receipts", "Public receipts"]],
      legend: [["", "Network step"], ["receipt", "Public receipt"], ["pending", "Pending state"]]
    };
  }

  function renderProtocolRecord(block, index, span) {
    var type = block.type || "receipt";
    var record = makeEl("article", "live-card protocol-record " + blockClassName(type));
    record.style.setProperty("--protocol-record-span", String(span || 6));
    record.setAttribute("data-record-type", type);
    record.appendChild(makeEl("span", "protocol-record-index", String(index + 1).padStart(2, "0")));
    var title = makeEl("div", "live-card-title");
    var titleMain = makeEl("span", "block-title-main");
    titleMain.appendChild(makeBlockIcon(type));
    titleMain.appendChild(makeEl("b", "", block.title || blockTypeLabel(type)));
    title.appendChild(titleMain);
    record.appendChild(title);

    if (type === "beacon") {
      var beacon = makeEl("div", "beacon-readout");
      beacon.appendChild(makeEl("code", "", block.code));
      beacon.appendChild(makeEl("div", "app-note", block.note));
      record.appendChild(beacon);
    } else if (type === "seats") {
      var seats = makeEl("div", "app-seat-grid");
      for (var seatIndex = 0; seatIndex < (block.count || 0); seatIndex += 1) {
        var seat = makeEl("span", "app-seat" + (seatIndex < (block.on || 0) ? " on" : ""));
        seat.setAttribute("aria-label", "Seat " + (seatIndex + 1) + (seatIndex < (block.on || 0) ? " active" : " pending"));
        seats.appendChild(seat);
      }
      record.appendChild(seats);
    } else if (type === "faceChecks") {
      var checks = makeEl("div", "face-checks");
      (block.rows || []).forEach(function (row) {
        var check = makeEl("div", "face-check");
        check.appendChild(makeEl("span", "", row[0]));
        check.appendChild(makeEl("b", "", row[1]));
        checks.appendChild(check);
      });
      record.appendChild(checks);
    } else if (type === "route") {
      var route = makeEl("div", "app-route");
      (block.steps || []).forEach(function (step) {
        var routeStep = makeEl("div", "app-route-step");
        routeStep.appendChild(makeEl("i", "", step[0]));
        routeStep.appendChild(makeEl("span", "", step[1]));
        routeStep.appendChild(makeEl("span", "", step[2]));
        route.appendChild(routeStep);
      });
      record.appendChild(route);
    } else if (type === "proof") {
      var proofStamp = block.stamp || (block.verified === false ? "" : "Proof verified");
      if (proofStamp) record.appendChild(makeEl("span", "proof-stamp", proofStamp));
      record.appendChild(makeEl("div", "app-value", block.result));
      record.appendChild(makeEl("div", "app-note", block.note));
    } else if (type === "receipt") {
      record.appendChild(makeEl("div", "app-value", block.value));
      appendReceiptDetails(record, block.details);
      if (block.note) record.appendChild(makeEl("div", "app-note", block.note));
    } else if (type === "closed") {
      record.appendChild(makeEl("div", "closed-stamp", block.value));
    } else {
      (block.rows || []).forEach(function (row) {
        var recordRow = makeEl("div", "protocol-record-row");
        recordRow.appendChild(makeEl("span", "", row[0]));
        recordRow.appendChild(makeEl("b", "", row[1]));
        if (row[2]) recordRow.appendChild(makeEl("small", "", row[2]));
        record.appendChild(recordRow);
      });
    }
    return record;
  }

  function renderProtocolSequence(page, item) {
    var profile = sequenceProfileForPage(page);
    var sequence = makeEl("section", "protocol-sequence sim-surface-frame");
    var titleId = "protocolSequenceTitle";
    var introId = "protocolSequenceIntro";
    sequence.setAttribute("data-surface", page.surface || "protocol");
    sequence.setAttribute("data-surface-kind", "explainer");
    sequence.setAttribute("data-sequence-profile", profile.key);
    sequence.setAttribute("aria-labelledby", titleId);
    sequence.setAttribute("aria-describedby", introId);

    var header = makeEl("header", "protocol-sequence-header");
    var mark = makeEl("span", "protocol-sequence-mark protocol-brand-mark");
    mark.appendChild(makeProductWordmark(profile.key === "omen" ? "omen" : "demothemis", "protocol-brand-wordmark", "", true));
    header.appendChild(mark);
    var identity = makeEl("div", "protocol-sequence-identity");
    identity.appendChild(makeEl("span", "protocol-sequence-kicker", "System explainer"));
    identity.appendChild(makeEl("strong", "", profile.title));
    header.appendChild(identity);
    var badges = makeEl("div", "protocol-sequence-badges");
    profile.badges.forEach(function (badge) {
      badges.appendChild(makeEl("span", "protocol-sequence-badge " + badge[0], badge[1]));
    });
    header.appendChild(badges);
    sequence.appendChild(header);

    var scroll = makeEl("div", "protocol-sequence-scroll");
    var current = makeEl("div", "protocol-sequence-current");
    var currentCopy = makeEl("div", "protocol-sequence-current-copy");
    currentCopy.appendChild(makeEl("span", "", profile.stateLabel));
    var currentTitle = makeEl("h4", "", page.title);
    currentTitle.id = titleId;
    currentCopy.appendChild(currentTitle);
    var currentIntro = makeEl("p", "", page.subtitle);
    currentIntro.id = introId;
    currentCopy.appendChild(currentIntro);
    current.appendChild(currentCopy);
    current.appendChild(makeEl("div", "protocol-sequence-status", page.status));
    scroll.appendChild(current);

    var facts = makeEl("div", "protocol-sequence-facts");
    facts.setAttribute("aria-label", profile.factsLabel);
    (page.kpis || []).forEach(function (kpi) {
      var fact = makeEl("div", "protocol-sequence-fact");
      fact.appendChild(makeEl("span", "", kpi[0]));
      fact.appendChild(makeEl("b", "", kpi[1]));
      facts.appendChild(fact);
    });
    if ((page.kpis || []).length) scroll.appendChild(facts);

    var flow = currentFlow();
    var steps = page.sequenceSteps || flow.steps || [];
    var sequenceProgress = typeof page.sequenceProgress === "number" ? page.sequenceProgress : activeEventStep;
    var trace = makeEl("div", "protocol-trace");
    trace.style.setProperty("--protocol-step-count", String(Math.max(1, steps.length)));
    trace.setAttribute("role", "list");
    trace.setAttribute("aria-label", profile.traceLabel);
    steps.forEach(function (step, index) {
      var state = index < sequenceProgress || (!page.sequenceSteps && isEventComplete()) ? "done" : (index === sequenceProgress ? "current" : "pending");
      var stateLabel = state === "done" ? "Complete" : (state === "current" ? "Now" : "Queued");
      var ownerLabel = step.ownerLabel || (step.actionOwner === "user" ? "Application input" : profile.ownerLabel);
      var traceStep = makeEl("div", "protocol-trace-step is-" + state);
      traceStep.setAttribute("role", "listitem");
      if (state === "current") traceStep.setAttribute("aria-current", "step");
      traceStep.appendChild(makeEl("span", "protocol-trace-number", String(index + 1).padStart(2, "0")));
      var traceCopy = makeEl("div", "protocol-trace-copy");
      traceCopy.appendChild(makeEl("strong", "", stepActionLabel(step)));
      traceCopy.appendChild(makeEl("small", "", ownerLabel + " · " + stateLabel));
      traceStep.appendChild(traceCopy);
      trace.appendChild(traceStep);
    });
    if (steps.length) scroll.appendChild(trace);

    var blocks = page.blocks || [];
    var spans = liveBlockSpanPlan(blocks);
    var records = makeEl("div", "protocol-sequence-records");
    records.setAttribute("aria-label", profile.recordsLabel);
    blocks.forEach(function (block, index) {
      records.appendChild(renderProtocolRecord(block, index, spans[index]));
    });
    scroll.appendChild(records);

    var legend = makeEl("div", "protocol-sequence-legend");
    legend.appendChild(makeEl("strong", "", "Key"));
    profile.legend.forEach(function (entry) {
      var legendItem = makeEl("span", "protocol-legend-item " + entry[0]);
      legendItem.appendChild(makeEl("i", "protocol-legend-dot"));
      legendItem.appendChild(makeEl("span", "", entry[1]));
      legend.appendChild(legendItem);
    });
    scroll.appendChild(legend);
    sequence.appendChild(scroll);
    return sequence;
  }

  function prepareSimulatorTransition(restoreFocus) {
    if (restoreFocus) restoreSimulatorFocusOnRender = true;
    announceRunStatusOnRender = true;
  }

  function captureSimulatorFocus(root) {
    var active = document.activeElement;
    if (!root || !active || !root.contains(active)) return null;
    var role = "action";
    if (active.classList.contains("sim-browser-back") || active.classList.contains("tutorial-rewind")) role = "back";
    if (active.classList.contains("tutorial-advance")) role = "protocol";
    return { id: active.id || "", role: role };
  }

  function restoreSimulatorFocus(root, snapshot) {
    if (!root) return;
    var token = ++simulatorFocusToken;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (token !== simulatorFocusToken) return;
        var target = snapshot && snapshot.id ? document.getElementById(snapshot.id) : null;
        if (target && !root.contains(target)) target = null;
        if (!target && snapshot && snapshot.role === "back") target = root.querySelector(".sim-browser-back:not([disabled]), .tutorial-rewind");
        if (!target && snapshot && snapshot.role === "protocol") target = root.querySelector(".tutorial-advance");
        if (!target && isEventComplete()) target = next;
        if (!target) target = root.querySelector(".guided-target");
        if (!target || typeof target.focus !== "function") return;
        try {
          target.focus({ preventScroll: true });
        } catch (error) {
          target.focus();
        }
      });
    });
  }

  function currentRunStatusMessage() {
    var eventNumber = String(stage + 1).padStart(2, "0");
    var label = (STEP_GUIDES[stage] && STEP_GUIDES[stage].label) || STAGES[stage].title;
    var steps = (currentFlow().steps || []);
    var completedStep = activeEventStep > 0 ? steps[Math.min(activeEventStep - 1, steps.length - 1)] : null;
    var message;
    if (isEventComplete()) {
      message = "Event " + eventNumber + " complete. " + (completedStep && completedStep.result ? completedStep.result : label + " complete.");
    } else if (completedStep && completedStep.result) {
      message = completedStep.result;
    } else {
      message = "Event " + eventNumber + ": " + label + ".";
    }
    var notice = currentStepConfirmation();
    if (notice) message += " " + notice.title + ". " + notice.body + ". " + notice.detail + ".";
    return message;
  }

  function announceRunStatus(message) {
    if (!runAnnouncement) return;
    if (runAnnouncementTimeout) clearTimeout(runAnnouncementTimeout);
    runAnnouncement.textContent = "";
    runAnnouncementTimeout = setTimeout(function () {
      runAnnouncement.textContent = cleanTip(message);
      runAnnouncementTimeout = null;
    }, 24);
  }

  function renderProductDemo(item, focus) {
    var root = document.getElementById("productDemo");
    if (!root) return;
    var suppressFocusRestore = suppressSimulatorFocusRestoreOnce;
    suppressSimulatorFocusRestoreOnce = false;
    var focusSnapshot = suppressFocusRestore ? null : captureSimulatorFocus(root);
    var shouldRestoreFocus = !suppressFocusRestore && (Boolean(focusSnapshot) || restoreSimulatorFocusOnRender);
    var shouldAnnounceStatus = announceRunStatusOnRender;
    restoreSimulatorFocusOnRender = false;
    announceRunStatusOnRender = false;
    var basePage = APP_PAGES[stage] || {
      template: "default",
      product: focus.lane || "OmenMarketMaker",
      tabs: ["Now"],
      section: item.title,
      title: focus.title,
      subtitle: focus.change,
      status: item.sub,
      kpis: [["Money", money(item.pot)], ["Court", item.court], ["User holds", item.claims]],
      blocks: [{ type: "receipt", wide: true, title: item.title, value: focus.change, note: focus.why }]
    };
    var page = resolvedEventPage(basePage);
    var guide = getStepGuide(item, focus);
    var activeBrand = activeBrandForPage(page);
    var shellBrand = shellBrandForStage(stage);

    root.replaceChildren();
    root.className = "product-demo " + (focus.tone || "market") + " " + (page.template || "default") + " surface-" + page.surface + (isSequencePage(page) ? " view-sequence" : " view-application");
    root.setAttribute("data-surface", page.surface);
    root.setAttribute("data-active-brand", activeBrand);
    root.setAttribute("data-shell-brand", shellBrand);
    root.setAttribute("data-action-owner", currentActionOwner());
    if (productModePanel) productModePanel.setAttribute("data-active-brand", shellBrand);
    var focusScene = document.getElementById("focusScene");
    if (focusScene) focusScene.setAttribute("data-active-brand", shellBrand);
    updateSimulatorSizeState();

    var guideEl = renderStepGuide(item, guide, page);
    root.appendChild(guideEl);
    var guideDock = guideEl.querySelector(".tutorial-dock");

    if (isSequencePage(page)) {
      var sequence = renderProtocolSequence(page, item);
      root.appendChild(sequence);
      placeNextEventControl(page, null, null, guideDock);
    } else {
      var appBoundary = appBoundaryForPage(page) || APP_BOUNDARIES.omen;
      var appTheme = appBoundary.appTheme;
      var appBrand = appBoundary.appBrand || page.product;
      var frameTitle = page.surface === "omen" && stage === 7 ? APP_BOUNDARIES.handoff.frameTitle : appBoundary.frameTitle;
      var chrome = pageChrome(page, item);
      var preview = makeEl("section", "sim-live-preview sim-surface-frame");
      preview.setAttribute("data-surface", page.surface);
      preview.setAttribute("data-surface-kind", "application");
      preview.setAttribute("aria-label", appBrand + " application view, Event " + String(stage + 1).padStart(2, "0") + ": " + guide.label);
      var browserBar = makeEl("div", "sim-browser-bar");
      var browserBack = makeEl("button", "sim-browser-back");
      browserBack.type = "button";
      var canGoBack = canRewindRunState();
      var backAcrossEvent = activeEventStep === 0 && stage > 0;
      browserBack.disabled = !canGoBack;
      browserBack.setAttribute("aria-label", canGoBack ? (backAcrossEvent ? "Return to the completed state of the previous event" : "Go back one action") : "No previous state");
      if (canGoBack) tagInfo(browserBack, backAcrossEvent ? "Return to the completed state of the previous event." : "Go back to the previous screen state.");
      browserBack.title = canGoBack ? (backAcrossEvent ? "Previous event" : "Previous action") : "This is the first action in the run";
      browserBack.appendChild(makeEl("span", "sim-browser-back-icon"));
      browserBack.appendChild(makeEl("span", "sim-browser-back-label", "Back"));
      browserBack.addEventListener("click", rewindCurrentEventStep);
      browserBar.appendChild(browserBack);
      browserBar.appendChild(makeEl("div", "sim-url", simulatedAppUrl(page, appBoundary)));
      var appViewport = makeEl("div", "sim-app-viewport sim-surface-scroll");
      appViewport.setAttribute("data-app-theme", appTheme);
      appViewport.setAttribute("data-surface", page.surface);
      appViewport.setAttribute("data-action-owner", currentActionOwner());
      var appWindow = makeEl("div", "app-window " + (focus.tone || "market"));
      var nav = makeEl("div", "app-nav");
      var brand = makeEl("div", "app-brand");
      var tabs = makeEl("div", "app-tabs");
      var navTools = makeEl("div", "app-nav-tools");
      brand.appendChild(makeProductWordmark(appTheme === "omen" ? "omen" : "demothemis", "app-brand-wordmark", appBrand, true));
      var activeTab = page.activeTab || (page.tabs && page.tabs[0]);
      tabs.setAttribute("aria-label", "Current app section");
      if (activeTab) {
        var activeSection = makeEl("span", "on", activeTab);
        activeSection.setAttribute("aria-current", "page");
        tabs.appendChild(activeSection);
      }
      var contextChip = makeEl("span", "app-nav-chip", chrome.context);
      navTools.appendChild(contextChip);
      navTools.appendChild(makeEl("span", "app-nav-chip", chrome.user));
      nav.appendChild(brand);
      nav.appendChild(tabs);
      nav.appendChild(navTools);
      appWindow.appendChild(nav);
      appWindow.appendChild(renderLivePage(page, item));
      placeNextEventControl(page, browserBar, appWindow, guideDock);
      appViewport.appendChild(appWindow);
      preview.appendChild(browserBar);
      preview.appendChild(appViewport);
      renderStepConfirmation(preview, appTheme);
      if (frameTitle) {
        var demandFrame = makeEl("div", "sim-demand-frame");
        var demandFrameTab = makeEl("div", "sim-demand-frame-tab", frameTitle);
        demandFrame.setAttribute("role", "group");
        demandFrameTab.id = "simDemandFrameTitle";
        demandFrame.setAttribute("aria-labelledby", demandFrameTab.id);
        demandFrame.appendChild(demandFrameTab);
        demandFrame.appendChild(preview);
        root.appendChild(demandFrame);
      } else {
        root.appendChild(preview);
      }
    }
    if (shouldRestoreFocus) restoreSimulatorFocus(root, focusSnapshot);
    if (shouldAnnounceStatus) announceRunStatus(currentRunStatusMessage());
    scheduleAutomaticStep();
    queueCoachmarkPosition();
  }

  function renderStageArt(item, focus) {
    renderProductDemo(item, focus);
    updateSimulatorSizeState();
    lastArtLayout = currentArtLayout();
  }

  function renderStageArtForCurrentLayout(force) {
    var layout = currentArtLayout();
    if (!force && layout === lastArtLayout) return;
    var item = STAGES[stage];
    var focus = FOCUS_STEPS[stage];
    if (item && focus) renderStageArt(item, focus);
  }

  function queueStageArtResize() {
    if (artResizeFrame) cancelAnimationFrame(artResizeFrame);
    artResizeFrame = requestAnimationFrame(function () {
      artResizeFrame = 0;
      updateSimulatorSizeState();
      renderStageArtForCurrentLayout(false);
      refitSimulatorFrame();
    });
  }

  function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function viewportSize() {
    var vv = window.visualViewport;
    return {
      width: vv && vv.width ? vv.width : window.innerWidth,
      height: vv && vv.height ? vv.height : window.innerHeight,
      offsetLeft: vv && vv.offsetLeft ? vv.offsetLeft : 0,
      offsetTop: vv && vv.offsetTop ? vv.offsetTop : 0
    };
  }

  function coachmarkRect(left, top, width, height) {
    return { left: left, top: top, right: left + width, bottom: top + height, width: width, height: height };
  }

  function coachmarkRectIntersection(a, b) {
    var left = Math.max(a.left, b.left);
    var top = Math.max(a.top, b.top);
    var right = Math.min(a.right, b.right);
    var bottom = Math.min(a.bottom, b.bottom);
    return right > left && bottom > top ? coachmarkRect(left, top, right - left, bottom - top) : null;
  }

  function coachmarkOverlapArea(a, b) {
    var overlap = coachmarkRectIntersection(a, b);
    return overlap ? overlap.width * overlap.height : 0;
  }

  function coachmarkRectContains(outer, inner, tolerance) {
    var slack = tolerance == null ? .5 : tolerance;
    return inner.left >= outer.left - slack && inner.right <= outer.right + slack && inner.top >= outer.top - slack && inner.bottom <= outer.bottom + slack;
  }

  function coachmarkRectDistance(a, b) {
    var dx = Math.max(a.left - b.right, b.left - a.right, 0);
    var dy = Math.max(a.top - b.bottom, b.top - a.bottom, 0);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function coachmarkPlacementForRect(rect, targetRect) {
    var options = [];
    if (rect.left >= targetRect.right - .5) options.push({ placement: "right", gap: rect.left - targetRect.right, rank: 0 });
    if (rect.right <= targetRect.left + .5) options.push({ placement: "left", gap: targetRect.left - rect.right, rank: 1 });
    if (rect.top >= targetRect.bottom - .5) options.push({ placement: "bottom", gap: rect.top - targetRect.bottom, rank: 2 });
    if (rect.bottom <= targetRect.top + .5) options.push({ placement: "top", gap: targetRect.top - rect.bottom, rank: 3 });
    options.sort(function (a, b) { return a.gap - b.gap || a.rank - b.rank; });
    return options.length ? options[0].placement : null;
  }

  function coachmarkSafeInset(name) {
    var value = parseFloat(getComputedStyle(document.body).getPropertyValue("--coach-safe-" + name));
    return isFinite(value) ? value : 0;
  }

  function coachmarkBoundaryForTarget() {
    var vp = viewportSize();
    var margin = 10;
    var left = vp.offsetLeft + margin + coachmarkSafeInset("left");
    var right = vp.offsetLeft + vp.width - margin - coachmarkSafeInset("right");
    var top = Math.max(vp.offsetTop + margin + coachmarkSafeInset("top"), stickySafeTop(vp.offsetTop, vp.height));
    var bottom = vp.offsetTop + vp.height - margin - coachmarkSafeInset("bottom");
    return coachmarkRect(left, top, Math.max(1, right - left), Math.max(1, bottom - top));
  }

  function coachmarkSearchZones(target, boundary) {
    var zones = [];
    function addZone(name, rank, element, inset) {
      if (!element) return;
      var clipped = coachmarkRectIntersection(element.getBoundingClientRect(), boundary);
      if (!clipped) return;
      var pad = Math.max(0, Math.min(inset || 0, clipped.width / 4, clipped.height / 4));
      var rect = coachmarkRect(clipped.left + pad, clipped.top + pad, Math.max(1, clipped.width - pad * 2), Math.max(1, clipped.height - pad * 2));
      var duplicate = zones.some(function (zone) {
        return Math.abs(zone.rect.left - rect.left) < 1 && Math.abs(zone.rect.top - rect.top) < 1 && Math.abs(zone.rect.right - rect.right) < 1 && Math.abs(zone.rect.bottom - rect.bottom) < 1;
      });
      if (!duplicate) zones.push({ name: name, rank: rank, rect: rect });
    }
    addZone("card", 0, target.closest(".live-card, .app-panel, .protocol-record, .tutorial-dock"), 2);
    addZone("surface", 1, target.closest(".sim-surface-frame"), 2);
    zones.push({ name: "viewport", rank: 2, rect: boundary });
    return zones;
  }

  function coachmarkZoneRank(rect, zones) {
    var rank = 2;
    (zones || []).forEach(function (zone) {
      if (coachmarkRectContains(zone.rect, rect, .5)) rank = Math.min(rank, zone.rank);
    });
    return rank;
  }

  function coachmarkClippedTargetRect(target, boundary) {
    var source = target.getBoundingClientRect();
    var visible = coachmarkRectIntersection(source, boundary);
    var node = target.parentElement;
    while (visible && node && node !== document.body) {
      var style = getComputedStyle(node);
      var clipsX = /(auto|scroll|hidden|clip)/.test(style.overflowX);
      var clipsY = /(auto|scroll|hidden|clip)/.test(style.overflowY);
      if (clipsX || clipsY) {
        var clip = node.getBoundingClientRect();
        var clipRect = {
          left: clipsX ? clip.left : boundary.left,
          right: clipsX ? clip.right : boundary.right,
          top: clipsY ? clip.top : boundary.top,
          bottom: clipsY ? clip.bottom : boundary.bottom
        };
        clipRect.width = clipRect.right - clipRect.left;
        clipRect.height = clipRect.bottom - clipRect.top;
        visible = coachmarkRectIntersection(visible, clipRect);
      }
      node = node.parentElement;
    }
    return visible;
  }

  function coachmarkTextScope(target) {
    return document.body;
  }

  function coachmarkClipForElement(element, boundary, cache) {
    if (cache && cache.has(element)) return cache.get(element);
    var clip = boundary;
    var node = element;
    while (clip && node && node !== document.body) {
      var style = getComputedStyle(node);
      var clipsX = /(auto|scroll|hidden|clip)/.test(style.overflowX);
      var clipsY = /(auto|scroll|hidden|clip)/.test(style.overflowY);
      if (clipsX || clipsY) {
        var rect = node.getBoundingClientRect();
        var next = {
          left: clipsX ? rect.left : clip.left,
          right: clipsX ? rect.right : clip.right,
          top: clipsY ? rect.top : clip.top,
          bottom: clipsY ? rect.bottom : clip.bottom
        };
        next.width = next.right - next.left;
        next.height = next.bottom - next.top;
        clip = coachmarkRectIntersection(clip, next);
      }
      node = node.parentElement;
    }
    if (cache) cache.set(element, clip);
    return clip;
  }

  function collectCoachmarkTextRects(target, boundary, targetKey) {
    var cacheKey = [coachmarkGeometryVersion, targetKey, Math.round(boundary.left), Math.round(boundary.top), Math.round(boundary.width), Math.round(boundary.height)].join("|");
    if (coachmarkObstacleCache && coachmarkObstacleCache.key === cacheKey) {
      return { rects: coachmarkObstacleCache.rects, cacheHit: true, complete: coachmarkObstacleCache.complete !== false };
    }
    var scope = coachmarkTextScope(target);
    var clipCache = typeof WeakMap === "function" ? new WeakMap() : null;
    var rects = [];
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var text = (node.nodeValue || "").replace(/\s+/g, " ").trim();
        var parent = node.parentElement;
        if (!text || !parent || target.contains(parent) || parent.closest(".target-callout, .coachmark-connector, .sr-only")) return NodeFilter.FILTER_REJECT;
        var tag = parent.tagName;
        if (/^(SCRIPT|STYLE|NOSCRIPT|SVG|PATH)$/i.test(tag)) return NodeFilter.FILTER_REJECT;
        var style = getComputedStyle(parent);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return NodeFilter.FILTER_REJECT;
        if (!coachmarkRectIntersection(parent.getBoundingClientRect(), boundary)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var textNode;
    var complete = true;
    textLoop: while ((textNode = walker.nextNode())) {
      if (rects.length >= 1200) {
        complete = false;
        break;
      }
      var range = document.createRange();
      range.selectNodeContents(textNode);
      var lineRects = range.getClientRects();
      var elementClip = coachmarkClipForElement(textNode.parentElement, boundary, clipCache);
      for (var i = 0; elementClip && i < lineRects.length; i += 1) {
        if (rects.length >= 1200) {
          complete = false;
          break textLoop;
        }
        var line = lineRects[i];
        if (line.width < .5 || line.height < .5) continue;
        var clipped = coachmarkRectIntersection(line, elementClip);
        if (clipped && clipped.width > .5 && clipped.height > .5) rects.push(clipped);
      }
      if (range.detach) range.detach();
    }
    if (complete) {
      var controls = scope.querySelectorAll("input, textarea, select");
      for (var controlIndex = 0; controlIndex < controls.length; controlIndex += 1) {
        if (rects.length >= 1200) {
          complete = false;
          break;
        }
        var control = controls[controlIndex];
        if (target.contains(control) || control.closest(".target-callout, .coachmark-connector, .sr-only")) continue;
        var controlStyle = getComputedStyle(control);
        if (controlStyle.display === "none" || controlStyle.visibility === "hidden" || Number(controlStyle.opacity) === 0) continue;
        var controlType = (control.getAttribute("type") || "text").toLowerCase();
        if (control.tagName === "INPUT" && /^(hidden|checkbox|radio|range|color|image)$/.test(controlType)) continue;
        var displayedValue = "";
        if (control.tagName === "SELECT") {
          displayedValue = Array.prototype.filter.call(control.options || [], function (option) { return option.selected; }).map(function (option) { return option.textContent || ""; }).join(" ").trim();
        } else {
          displayedValue = String(control.value || control.getAttribute("placeholder") || "").trim();
          if (!displayedValue && /^(date|datetime-local|month|time|week|file|submit|reset|button)$/.test(controlType)) displayedValue = "native control text";
        }
        if (!displayedValue) continue;
        var controlRect = control.getBoundingClientRect();
        var contentRect = {
          left: controlRect.left + (parseFloat(controlStyle.borderLeftWidth) || 0) + (parseFloat(controlStyle.paddingLeft) || 0),
          right: controlRect.right - (parseFloat(controlStyle.borderRightWidth) || 0) - (parseFloat(controlStyle.paddingRight) || 0),
          top: controlRect.top + (parseFloat(controlStyle.borderTopWidth) || 0) + (parseFloat(controlStyle.paddingTop) || 0),
          bottom: controlRect.bottom - (parseFloat(controlStyle.borderBottomWidth) || 0) - (parseFloat(controlStyle.paddingBottom) || 0)
        };
        contentRect.width = contentRect.right - contentRect.left;
        contentRect.height = contentRect.bottom - contentRect.top;
        var controlClip = coachmarkClipForElement(control, boundary, clipCache);
        var visibleContent = controlClip && coachmarkRectIntersection(contentRect, controlClip);
        if (visibleContent && visibleContent.width > .5 && visibleContent.height > .5) rects.push(visibleContent);
      }
    }
    if (complete) {
      var floatingNotices = scope.querySelectorAll(".sim-result-toast");
      for (var noticeIndex = 0; noticeIndex < floatingNotices.length; noticeIndex += 1) {
        if (rects.length >= 1200) {
          complete = false;
          break;
        }
        var floatingNotice = floatingNotices[noticeIndex];
        var noticeStyle = getComputedStyle(floatingNotice);
        if (noticeStyle.display === "none" || noticeStyle.visibility === "hidden" || Number(noticeStyle.opacity) === 0) continue;
        var noticeRect = floatingNotice.getBoundingClientRect();
        var noticeGap = 10;
        var paddedNotice = coachmarkRect(noticeRect.left - noticeGap, noticeRect.top - noticeGap, noticeRect.width + noticeGap * 2, noticeRect.height + noticeGap * 2);
        var visibleNotice = coachmarkRectIntersection(paddedNotice, boundary);
        if (visibleNotice && visibleNotice.width > .5 && visibleNotice.height > .5) rects.push(visibleNotice);
      }
    }
    coachmarkObstacleCache = { key: cacheKey, rects: rects, complete: complete };
    return { rects: rects, cacheHit: false, complete: complete };
  }

  function measureCoachmarkWidths(coach, boundary) {
    var usable = Math.max(120, Math.floor(boundary.width));
    var proposed = [288, 240, 208, 176, 160, 148, 136, 120, 336, usable];
    var widths = [];
    proposed.forEach(function (value) {
      var width = Math.max(120, Math.min(usable, value));
      if (widths.indexOf(width) < 0) widths.push(width);
    });
    coach.classList.remove("is-inline");
    coach.classList.add("is-measuring");
    if (coach.parentNode !== document.body) document.body.appendChild(coach);
    coach.style.setProperty("--coach-max-height", "none");
    var contentKey = coach.textContent + "|" + Math.round(boundary.width);
    var measurements = widths.map(function (width) {
      var key = contentKey + "|" + width;
      var cached = coachmarkMeasureCache[key];
      coach.style.setProperty("--coach-width", width + "px");
      if (cached) return { width: width, height: cached.height };
      var height = coach.getBoundingClientRect().height;
      coachmarkMeasureCache[key] = { height: height };
      return { width: width, height: height };
    });
    coach.classList.remove("is-measuring");
    return measurements;
  }

  function coachmarkConnectorGeometry(candidate, targetRect) {
    var bubble;
    var target;
    var segments;
    if (candidate.placement === "top" || candidate.placement === "bottom") {
      var anchorX = clampNumber(targetRect.left + targetRect.width / 2, candidate.rect.left + 14, candidate.rect.right - 14);
      bubble = { x: anchorX, y: candidate.placement === "top" ? candidate.rect.bottom : candidate.rect.top };
      target = { x: targetRect.left + targetRect.width / 2, y: candidate.placement === "top" ? targetRect.top : targetRect.bottom };
      var midY = (bubble.y + target.y) / 2;
      segments = [[bubble, { x: bubble.x, y: midY }], [{ x: bubble.x, y: midY }, { x: target.x, y: midY }], [{ x: target.x, y: midY }, target]];
      candidate.path = "M " + bubble.x + " " + bubble.y + " L " + bubble.x + " " + midY + " L " + target.x + " " + midY + " L " + target.x + " " + target.y;
    } else {
      var anchorY = clampNumber(targetRect.top + targetRect.height / 2, candidate.rect.top + 14, candidate.rect.bottom - 14);
      bubble = { x: candidate.placement === "left" ? candidate.rect.right : candidate.rect.left, y: anchorY };
      target = { x: candidate.placement === "left" ? targetRect.left : targetRect.right, y: targetRect.top + targetRect.height / 2 };
      var midX = (bubble.x + target.x) / 2;
      segments = [[bubble, { x: midX, y: bubble.y }], [{ x: midX, y: bubble.y }, { x: midX, y: target.y }], [{ x: midX, y: target.y }, target]];
      candidate.path = "M " + bubble.x + " " + bubble.y + " L " + midX + " " + bubble.y + " L " + midX + " " + target.y + " L " + target.x + " " + target.y;
    }
    candidate.connectorStart = bubble;
    candidate.connectorEnd = target;
    candidate.connectorSegments = segments;
  }

  function coachmarkConnectorPolyline(points, boundary, textRects) {
    var compact = [];
    points.forEach(function (point) {
      if (!point) return;
      var next = { x: point.x, y: point.y };
      var last = compact[compact.length - 1];
      if (last && Math.abs(last.x - next.x) < .5 && Math.abs(last.y - next.y) < .5) return;
      if (compact.length > 1) {
        var before = compact[compact.length - 2];
        var sameX = Math.abs(before.x - last.x) < .5 && Math.abs(last.x - next.x) < .5;
        var sameY = Math.abs(before.y - last.y) < .5 && Math.abs(last.y - next.y) < .5;
        if (sameX || sameY) compact[compact.length - 1] = next;
        else compact.push(next);
      } else {
        compact.push(next);
      }
    });
    if (compact.length < 2) return null;
    var inside = compact.every(function (point) {
      return point.x >= boundary.left - .5 && point.x <= boundary.right + .5 && point.y >= boundary.top - .5 && point.y <= boundary.bottom + .5;
    });
    if (!inside) return null;
    var segments = [];
    for (var i = 1; i < compact.length; i += 1) {
      var segment = [compact[i - 1], compact[i]];
      var orthogonal = Math.abs(segment[0].x - segment[1].x) < .5 || Math.abs(segment[0].y - segment[1].y) < .5;
      if (!orthogonal || textRects.some(function (rect) { return coachmarkSegmentHitsRect(segment, rect); })) return null;
      segments.push(segment);
    }
    return {
      points: compact,
      segments: segments,
      path: compact.map(function (point, index) { return (index ? "L " : "M ") + point.x + " " + point.y; }).join(" ")
    };
  }

  function routeCoachmarkConnector(candidate, targetRect, boundary, textRects) {
    if (!candidate || !candidate.valid || !candidate.zeroTextOverlap || !targetRect || !boundary || !Array.isArray(textRects)) return false;
    candidate.connectorRouteTried = true;
    coachmarkConnectorGeometry(candidate, targetRect);
    if (candidate.connectorTextHits === 0 && coachmarkConnectorIsUsable(candidate)) return true;
    var start = candidate.connectorStart;
    var end = candidate.connectorEnd;
    var verticalFirst = candidate.placement === "top" || candidate.placement === "bottom";
    var minimumLane = verticalFirst ? boundary.top : boundary.left;
    var maximumLane = verticalFirst ? boundary.bottom : boundary.right;
    var preferredLane = verticalFirst ? (start.y + end.y) / 2 : (start.x + end.x) / 2;
    var lanes = [];
    function addLane(value) {
      var lane = clampNumber(value, minimumLane, maximumLane);
      if (lanes.some(function (existing) { return Math.abs(existing - lane) < .5; })) return;
      lanes.push(lane);
    }
    addLane(preferredLane);
    addLane(minimumLane + 8);
    addLane(maximumLane - 8);
    addLane(verticalFirst ? start.y : start.x);
    addLane(verticalFirst ? end.y : end.x);
    textRects.forEach(function (rect) {
      addLane((verticalFirst ? rect.top : rect.left) - 8);
      addLane((verticalFirst ? rect.bottom : rect.right) + 8);
    });
    lanes.sort(function (a, b) {
      var startAxis = verticalFirst ? start.y : start.x;
      var endAxis = verticalFirst ? end.y : end.x;
      return (Math.abs(startAxis - a) + Math.abs(endAxis - a)) - (Math.abs(startAxis - b) + Math.abs(endAxis - b));
    });
    for (var i = 0; i < lanes.length; i += 1) {
      var lane = lanes[i];
      var points = verticalFirst
        ? [start, { x: start.x, y: lane }, { x: end.x, y: lane }, end]
        : [start, { x: lane, y: start.y }, { x: lane, y: end.y }, end];
      var route = coachmarkConnectorPolyline(points, boundary, textRects);
      if (!route) continue;
      candidate.path = route.path;
      candidate.connectorSegments = route.segments;
      candidate.connectorEnd = end;
      candidate.connectorTextHits = 0;
      candidate.connectorRouted = true;
      if (candidate.score) candidate.score[4] = 0;
      if (coachmarkConnectorIsUsable(candidate)) return true;
    }

    var axisStart = verticalFirst ? start.y : start.x;
    var axisEnd = verticalFirst ? end.y : end.x;
    var crossStart = verticalFirst ? start.x : start.y;
    var crossEnd = verticalFirst ? end.x : end.y;
    var direction = axisEnd >= axisStart ? 1 : -1;
    var axisGap = Math.abs(axisEnd - axisStart);
    var escapeDistances = [Math.max(2, Math.min(8, axisGap / 3)), Math.max(3, Math.min(16, axisGap * .42))];
    var startLanes = [];
    var endLanes = [];
    escapeDistances.forEach(function (distance) {
      var first = clampNumber(axisStart + direction * distance, minimumLane, maximumLane);
      var last = clampNumber(axisEnd - direction * distance, minimumLane, maximumLane);
      if (!startLanes.some(function (value) { return Math.abs(value - first) < .5; })) startLanes.push(first);
      if (!endLanes.some(function (value) { return Math.abs(value - last) < .5; })) endLanes.push(last);
    });
    var crossMinimum = verticalFirst ? boundary.left : boundary.top;
    var crossMaximum = verticalFirst ? boundary.right : boundary.bottom;
    var crossLanes = [];
    function addCrossLane(value) {
      var lane = clampNumber(value, crossMinimum, crossMaximum);
      if (!crossLanes.some(function (existing) { return Math.abs(existing - lane) < .5; })) crossLanes.push(lane);
    }
    addCrossLane(crossMinimum + 8);
    addCrossLane(crossMaximum - 8);
    addCrossLane(crossStart);
    addCrossLane(crossEnd);
    textRects.forEach(function (rect) {
      addCrossLane((verticalFirst ? rect.left : rect.top) - 8);
      addCrossLane((verticalFirst ? rect.right : rect.bottom) + 8);
    });
    crossLanes.sort(function (a, b) {
      return (Math.abs(crossStart - a) + Math.abs(crossEnd - a)) - (Math.abs(crossStart - b) + Math.abs(crossEnd - b));
    });
    for (var startIndex = 0; startIndex < startLanes.length; startIndex += 1) {
      for (var endIndex = 0; endIndex < endLanes.length; endIndex += 1) {
        for (var crossIndex = 0; crossIndex < crossLanes.length; crossIndex += 1) {
          var startLane = startLanes[startIndex];
          var endLane = endLanes[endIndex];
          var crossLane = crossLanes[crossIndex];
          var detourPoints = verticalFirst
            ? [start, { x: start.x, y: startLane }, { x: crossLane, y: startLane }, { x: crossLane, y: endLane }, { x: end.x, y: endLane }, end]
            : [start, { x: startLane, y: start.y }, { x: startLane, y: crossLane }, { x: endLane, y: crossLane }, { x: endLane, y: end.y }, end];
          var detour = coachmarkConnectorPolyline(detourPoints, boundary, textRects);
          if (!detour) continue;
          candidate.path = detour.path;
          candidate.connectorSegments = detour.segments;
          candidate.connectorEnd = end;
          candidate.connectorTextHits = 0;
          candidate.connectorRouted = true;
          if (candidate.score) candidate.score[4] = 0;
          if (coachmarkConnectorIsUsable(candidate)) return true;
        }
      }
    }
    return false;
  }

  function coachmarkSegmentHitsRect(segment, rect) {
    var a = segment[0];
    var b = segment[1];
    var visualRadius = 6;
    var left = rect.left - visualRadius;
    var right = rect.right + visualRadius;
    var top = rect.top - visualRadius;
    var bottom = rect.bottom + visualRadius;
    var segmentLeft = Math.min(a.x, b.x);
    var segmentRight = Math.max(a.x, b.x);
    var segmentTop = Math.min(a.y, b.y);
    var segmentBottom = Math.max(a.y, b.y);
    if (Math.abs(a.x - b.x) < .5) return a.x >= left && a.x <= right && segmentBottom >= top && segmentTop <= bottom;
    if (Math.abs(a.y - b.y) < .5) return a.y >= top && a.y <= bottom && segmentRight >= left && segmentLeft <= right;
    return segmentRight >= left && segmentLeft <= right && segmentBottom >= top && segmentTop <= bottom;
  }

  function scoreCoachmarkCandidate(candidate, targetRect, boundary, textRects, zones) {
    var inside = candidate.rect.left >= boundary.left - .5 && candidate.rect.right <= boundary.right + .5 && candidate.rect.top >= boundary.top - .5 && candidate.rect.bottom <= boundary.bottom + .5;
    candidate.valid = inside && coachmarkOverlapArea(candidate.rect, targetRect) < .5;
    candidate.textHits = 0;
    candidate.textArea = 0;
    candidate.connectorTextHits = 0;
    if (!candidate.valid) return candidate;
    coachmarkConnectorGeometry(candidate, targetRect);
    textRects.forEach(function (rect) {
      var area = coachmarkOverlapArea(candidate.rect, rect);
      if (area > .5) {
        candidate.textHits += 1;
        candidate.textArea += area;
      }
      if (candidate.connectorSegments.some(function (segment) { return coachmarkSegmentHitsRect(segment, rect); })) candidate.connectorTextHits += 1;
    });
    candidate.localRank = candidate.localRank == null ? coachmarkZoneRank(candidate.rect, zones) : candidate.localRank;
    candidate.sourceRank = candidate.source === "adjacent" ? 0 : 1;
    candidate.placementRank = ({ right: 0, left: 1, bottom: 2, top: 3 })[candidate.placement];
    candidate.zeroTextOverlap = candidate.textHits === 0;
    candidate.score = [candidate.textHits, candidate.textArea, candidate.localRank, candidate.sourceRank, candidate.connectorTextHits, candidate.distance, candidate.placementRank, Math.abs(candidate.width - 288)];
    return candidate;
  }

  function buildCoachmarkCandidates(measurements, targetRect, boundary, textRects, zones) {
    var candidates = [];
    var gap = 12;
    var aligns = ["start", "center", "end"];
    measurements.forEach(function (measurement) {
      ["top", "bottom", "left", "right"].forEach(function (placement) {
        aligns.forEach(function (align) {
          var left;
          var top;
          if (placement === "top" || placement === "bottom") {
            left = align === "start" ? targetRect.left : align === "end" ? targetRect.right - measurement.width : targetRect.left + targetRect.width / 2 - measurement.width / 2;
            left = clampNumber(left, boundary.left, boundary.right - measurement.width);
            top = placement === "top" ? targetRect.top - gap - measurement.height : targetRect.bottom + gap;
          } else {
            left = placement === "left" ? targetRect.left - gap - measurement.width : targetRect.right + gap;
            top = align === "start" ? targetRect.top : align === "end" ? targetRect.bottom - measurement.height : targetRect.top + targetRect.height / 2 - measurement.height / 2;
            top = clampNumber(top, boundary.top, boundary.bottom - measurement.height);
          }
          var candidate = {
            placement: placement,
            align: align,
            source: "adjacent",
            width: measurement.width,
            height: measurement.height,
            rect: coachmarkRect(left, top, measurement.width, measurement.height),
            distance: 0
          };
          candidate.distance = coachmarkRectDistance(candidate.rect, targetRect);
          candidates.push(scoreCoachmarkCandidate(candidate, targetRect, boundary, textRects, zones));
        });
      });
    });
    return candidates;
  }

  function coachmarkForbiddenTopLeft(rect, width, height, clearance) {
    return {
      left: rect.left - width - clearance,
      right: rect.right + clearance,
      top: rect.top - height - clearance,
      bottom: rect.bottom + clearance
    };
  }

  function coachmarkUniquePositions(values, min, max) {
    var seen = {};
    var positions = [];
    values.forEach(function (value) {
      if (!isFinite(value)) return;
      var clamped = clampNumber(value, min, max);
      var key = (Math.round(clamped * 2) / 2).toFixed(1);
      if (seen[key]) return;
      seen[key] = true;
      positions.push(clamped);
    });
    positions.sort(function (a, b) { return a - b; });
    return positions;
  }

  function buildCoachmarkVacancyCandidates(measurements, targetRect, boundary, textRects, zones) {
    var candidates = [];
    var accepted = {};
    var sweepWork = 0;
    var sweepBudget = 500000;
    var searchStopped = false;
    measurements.forEach(function (measurement) {
      (zones || []).forEach(function (zone) {
        if (searchStopped) return;
        var domain = zone.rect;
        var minX = domain.left;
        var maxX = domain.right - measurement.width;
        var minY = domain.top;
        var maxY = domain.bottom - measurement.height;
        if (maxX < minX || maxY < minY) return;
        var forbidden = textRects.map(function (rect) { return coachmarkForbiddenTopLeft(rect, measurement.width, measurement.height, 2); }).filter(function (rect) {
          return rect.right >= minX && rect.left <= maxX && rect.bottom >= minY && rect.top <= maxY;
        });
        forbidden.push(coachmarkForbiddenTopLeft(targetRect, measurement.width, measurement.height, 8));
        var xValues = [minX, maxX, targetRect.left, targetRect.right - measurement.width, targetRect.right + 8, targetRect.left - measurement.width - 8, targetRect.left + targetRect.width / 2 - measurement.width / 2];
        forbidden.forEach(function (rect) {
          if (rect.right >= minX && rect.left <= maxX) xValues.push(rect.left, rect.right);
        });
        var zoneCandidates = [];
        var zoneSeen = {};
        coachmarkUniquePositions(xValues, minX, maxX).forEach(function (left) {
          if (searchStopped) return;
          sweepWork += forbidden.length;
          if (sweepWork > sweepBudget) {
            searchStopped = true;
            return;
          }
          var intervals = forbidden.filter(function (rect) {
            return left > rect.left + .01 && left < rect.right - .01 && rect.bottom >= minY && rect.top <= maxY;
          }).map(function (rect) {
            return { top: Math.max(minY, rect.top), bottom: Math.min(maxY, rect.bottom) };
          }).sort(function (a, b) { return a.top - b.top || a.bottom - b.bottom; });
          var gaps = [];
          var cursor = minY;
          intervals.forEach(function (interval) {
            if (interval.top >= cursor) gaps.push({ top: cursor, bottom: interval.top });
            cursor = Math.max(cursor, interval.bottom);
          });
          if (cursor <= maxY) gaps.push({ top: cursor, bottom: maxY });
          gaps.forEach(function (gap) {
            var desired = [gap.top, gap.bottom, targetRect.top, targetRect.bottom - measurement.height, targetRect.top + targetRect.height / 2 - measurement.height / 2];
            coachmarkUniquePositions(desired, gap.top, gap.bottom).forEach(function (top) {
              var rect = coachmarkRect(left, top, measurement.width, measurement.height);
              if (!coachmarkRectContains(domain, rect, .5) || coachmarkOverlapArea(rect, targetRect) >= .5) return;
              var placement = coachmarkPlacementForRect(rect, targetRect);
              if (!placement) return;
              var localKey = [Math.round(left * 2), Math.round(top * 2), measurement.width].join("|");
              if (accepted[localKey] || zoneSeen[localKey]) return;
              zoneSeen[localKey] = true;
              zoneCandidates.push({
                placement: placement,
                align: "free",
                source: "vacancy",
                width: measurement.width,
                height: measurement.height,
                rect: rect,
                distance: coachmarkRectDistance(rect, targetRect),
                localRank: zone.rank,
                vacancyKey: localKey
              });
            });
          });
        });
        zoneCandidates.sort(function (a, b) {
          return a.distance - b.distance || ({ right: 0, left: 1, bottom: 2, top: 3 })[a.placement] - ({ right: 0, left: 1, bottom: 2, top: 3 })[b.placement] || Math.abs(a.width - 288) - Math.abs(b.width - 288);
        });
        zoneCandidates.slice(0, 32).forEach(function (candidate) {
          if (accepted[candidate.vacancyKey]) return;
          accepted[candidate.vacancyKey] = true;
          candidates.push(scoreCoachmarkCandidate(candidate, targetRect, boundary, textRects, zones));
        });
      });
    });
    candidates.sort(compareCoachmarkScores);
    return candidates.slice(0, 192);
  }

  function compareCoachmarkScores(a, b) {
    for (var i = 0; i < a.score.length; i += 1) {
      if (a.score[i] !== b.score[i]) return a.score[i] - b.score[i];
    }
    return 0;
  }

  function chooseCoachmarkCandidate(candidates, targetKey, targetRect, boundary, textRects) {
    var bubbleClear = candidates.filter(function (candidate) { return candidate.valid && candidate.zeroTextOverlap; });
    var clearPaths = bubbleClear.filter(function (candidate) { return candidate.connectorTextHits === 0 && coachmarkConnectorIsUsable(candidate); });
    if (!clearPaths.length && targetRect && boundary && Array.isArray(textRects)) {
      bubbleClear.slice().sort(compareCoachmarkScores).slice(0, 24).some(function (candidate) {
        if (!candidate.connectorRouteTried) routeCoachmarkConnector(candidate, targetRect, boundary, textRects);
        return candidate.connectorTextHits === 0 && coachmarkConnectorIsUsable(candidate);
      });
      clearPaths = bubbleClear.filter(function (candidate) { return candidate.connectorTextHits === 0 && coachmarkConnectorIsUsable(candidate); });
    }
    if (!clearPaths.length) return null;
    clearPaths.sort(compareCoachmarkScores);
    var best = clearPaths[0];
    if (coachmarkLastPlacement && coachmarkLastPlacement.targetKey === targetKey && coachmarkLastPlacement.mode === "floating") {
      var previous = clearPaths.find(function (candidate) {
        var sameShape = candidate.placement === coachmarkLastPlacement.placement && candidate.align === coachmarkLastPlacement.align && candidate.width === coachmarkLastPlacement.width;
        if (!sameShape || candidate.align !== "free") return sameShape;
        return Math.abs(candidate.rect.left - coachmarkLastPlacement.left) < 1 && Math.abs(candidate.rect.top - coachmarkLastPlacement.top) < 1;
      });
      if (previous && previous.localRank <= best.localRank && previous.sourceRank <= best.sourceRank && previous.connectorTextHits <= best.connectorTextHits && previous.distance <= best.distance + 24) best = previous;
    }
    return best;
  }

  function coachmarkConnectorLength(candidate) {
    if (!candidate || !Array.isArray(candidate.connectorSegments) || !candidate.connectorSegments.length) return 0;
    var total = 0;
    for (var index = 0; index < candidate.connectorSegments.length; index += 1) {
      var segment = candidate.connectorSegments[index];
      var start = segment && segment[0];
      var end = segment && segment[1];
      if (!start || !end || !isFinite(start.x) || !isFinite(start.y) || !isFinite(end.x) || !isFinite(end.y)) return 0;
      total += Math.hypot(end.x - start.x, end.y - start.y);
    }
    return total;
  }

  function coachmarkConnectorIsUsable(candidate) {
    if (!candidate || typeof candidate.path !== "string" || !candidate.path.trim()) return false;
    if (!candidate.connectorStart || !candidate.connectorEnd) return false;
    if (![candidate.connectorStart.x, candidate.connectorStart.y, candidate.connectorEnd.x, candidate.connectorEnd.y].every(isFinite)) return false;
    if (coachmarkConnectorLength(candidate) < 12) return false;
    var first = candidate.connectorSegments[0][0];
    var lastSegment = candidate.connectorSegments[candidate.connectorSegments.length - 1];
    var last = lastSegment[1];
    var startDelta = Math.hypot(first.x - candidate.connectorStart.x, first.y - candidate.connectorStart.y);
    var endDelta = Math.hypot(last.x - candidate.connectorEnd.x, last.y - candidate.connectorEnd.y);
    return startDelta <= 1 && endDelta <= 1;
  }

  function renderCoachmarkConnector(candidate) {
    if (!coachmarkConnectorIsUsable(candidate)) {
      hideCoachmarkConnector();
      return false;
    }
    var svg = ensureCoachmarkConnector();
    var path = svg.querySelector("[data-coachmark-path]");
    var endpoint = svg.querySelector("[data-coachmark-endpoint]");
    path.setAttribute("d", candidate.path);
    endpoint.setAttribute("cx", candidate.connectorEnd.x);
    endpoint.setAttribute("cy", candidate.connectorEnd.y);
    endpoint.removeAttribute("hidden");
    svg.hidden = false;
    return true;
  }

  function coachmarkInlineHost(target) {
    var actionHost = target.closest(".live-action-row, .live-page-continuation, .app-action-bar, .fake-actions, .tutorial-dock");
    if (actionHost) return { parent: actionHost, before: null };
    var card = target.closest(".live-card, .app-panel, .protocol-record");
    if (card) return { parent: card, before: null };
    var surface = target.closest(".sim-surface-frame");
    var surfaceScroll = surface && surface.querySelector(".sim-surface-scroll, .protocol-sequence-scroll");
    if (surfaceScroll && surfaceScroll.parentNode) return { parent: surfaceScroll.parentNode, before: surfaceScroll };
    var parent = target.parentElement;
    if (!parent) return { parent: document.getElementById("productDemo") || document.body, before: null };
    if (/^(P|SPAN|LABEL)$/i.test(parent.tagName)) parent = target.closest(".app-panel, .live-card, .protocol-card, .sequence-card") || parent.parentElement || parent;
    return { parent: parent, before: target.parentElement === parent ? target.nextSibling : null };
  }

  function renderCoachmarkInline(coach, target, targetKey, audit) {
    removeCoachmarkConnector();
    coachmarkSuppressObservationUntil = performance.now() + 300;
    var mount = coachmarkInlineHost(target);
    clearCoachmarkInlineSlots();
    var slot = makeEl("div", "coachmark-inline-slot");
    slot.setAttribute("data-coachmark-fallback", "");
    coach.classList.remove("is-measuring");
    coach.classList.add("is-inline");
    coach.dataset.placement = "inline";
    coach.dataset.align = "flow";
    coach.style.removeProperty("--coach-left");
    coach.style.removeProperty("--coach-top");
    coach.style.removeProperty("--coach-width");
    coach.style.removeProperty("--coach-max-height");
    if (mount.parent.matches(".sim-live-preview, .protocol-sequence")) mount.parent.classList.add("has-inline-coachmark");
    mount.parent.insertBefore(slot, mount.before || null);
    slot.appendChild(coach);
    if (mount.parent.matches(".sim-live-preview")) {
      var inlineAppViewport = mount.parent.querySelector(".sim-app-viewport");
      if (inlineAppViewport) mount.parent.style.setProperty("--sim-toast-safe-top", Math.max(0, inlineAppViewport.offsetTop + 6) + "px");
    }
    coachmarkLastPlacement = { targetKey: targetKey, mode: "inline", placement: "inline", align: "flow", width: Math.round(coach.getBoundingClientRect().width) };
    audit.mode = "inline";
    audit.placement = "inline";
    audit.align = "flow";
    audit.connectorVisible = false;
  }

  function recordCoachmarkAudit(coach, audit) {
    audit.durationMs = Math.round((performance.now() - audit.startedAt) * 100) / 100;
    delete audit.startedAt;
    var target = activeCoachmarkTarget();
    var calloutRect = coach.getBoundingClientRect();
    var targetRect = target ? target.getBoundingClientRect() : null;
    audit.callout = { left: calloutRect.left, top: calloutRect.top, right: calloutRect.right, bottom: calloutRect.bottom };
    audit.target = targetRect ? { left: targetRect.left, top: targetRect.top, right: targetRect.right, bottom: targetRect.bottom } : null;
    coach.dataset.coachmarkMode = audit.mode;
    coach.dataset.textOverlaps = String(audit.textOverlaps || 0);
    coach.dataset.connectorTextOverlaps = String(audit.connectorTextOverlaps || 0);
    coach.dataset.connectorRouted = audit.connectorRouted ? "true" : "false";
    coach.dataset.connectorVisible = audit.connectorVisible ? "true" : "false";
    coach.dataset.candidateCount = String(audit.candidateCount || 0);
    coach.dataset.vacancyCandidateCount = String(audit.vacancyCandidateCount || 0);
    coach.dataset.zeroTextCandidateCount = String(audit.zeroTextCandidateCount || 0);
    coach.dataset.clearConnectorCandidateCount = String(audit.clearConnectorCandidateCount || 0);
    coach.dataset.solveMs = String(audit.durationMs);
    if (!coachmarkAuditEnabled) return;
    coachmarkAuditHistory.push(audit);
    if (coachmarkAuditHistory.length > 80) coachmarkAuditHistory.shift();
  }

  function invalidateCoachmarkGeometry(reason, clearPlacement) {
    coachmarkGeometryVersion += 1;
    coachmarkObstacleCache = null;
    coachmarkInvalidationReason = reason || "layout";
    if (clearPlacement) coachmarkLastPlacement = null;
  }

  function positionCoachmarkNow() {
    var target = activeCoachmarkTarget();
    if (!target) {
      observeCoachmarkTarget(null);
      clearCoachmark();
      return;
    }
    observeCoachmarkTarget(target);
    var targetKey = coachmarkKeyForTarget(target);
    if (coachmarkTargetKey && coachmarkTargetKey !== targetKey) {
      coachmarkTargetKey = "";
      coachmarkLastPlacement = null;
      coachmarkObstacleCache = null;
    }
    var startedAt = performance.now();
    var coach = ensureCoachmark(target);
    if (coach.classList.contains("is-inline")) {
      coachmarkSuppressObservationUntil = performance.now() + 80;
      coach.classList.remove("is-inline");
      document.body.appendChild(coach);
    }
    var boundary = coachmarkBoundaryForTarget(target);
    var targetRect = coachmarkClippedTargetRect(target, boundary);
    if (!targetRect || targetRect.width < 1 || targetRect.height < 1) {
      coach.hidden = true;
      coach.style.opacity = "0";
      coach.style.visibility = "hidden";
      coach.style.pointerEvents = "none";
      hideCoachmarkConnector();
      return;
    }
    coach.hidden = false;
    coach.style.removeProperty("opacity");
    coach.style.removeProperty("visibility");
    coach.style.removeProperty("pointer-events");
    var obstacleResult = collectCoachmarkTextRects(target, boundary, targetKey);
    var measurements = measureCoachmarkWidths(coach, boundary);
    targetRect = coachmarkClippedTargetRect(target, boundary);
    var searchZones = coachmarkSearchZones(target, boundary);
    var candidates = buildCoachmarkCandidates(measurements, targetRect, boundary, obstacleResult.rects, searchZones);
    var chosen = obstacleResult.complete === false ? null : chooseCoachmarkCandidate(candidates, targetKey, targetRect, boundary, obstacleResult.rects);
    var vacancyCandidates = [];
    if (obstacleResult.complete !== false && (!chosen || chosen.localRank > 1)) {
      vacancyCandidates = buildCoachmarkVacancyCandidates(measurements, targetRect, boundary, obstacleResult.rects, searchZones);
      candidates = candidates.concat(vacancyCandidates);
      chosen = chooseCoachmarkCandidate(candidates, targetKey, targetRect, boundary, obstacleResult.rects);
    }
    var audit = {
      startedAt: startedAt,
      stage: stage,
      step: activeEventStep,
      targetKey: targetKey,
      reason: coachmarkInvalidationReason,
      cacheHit: obstacleResult.cacheHit,
      textMapComplete: obstacleResult.complete !== false,
      textRectCount: obstacleResult.rects.length,
      candidateCount: candidates.length,
      vacancyCandidateCount: vacancyCandidates.length,
      zeroTextCandidateCount: candidates.filter(function (candidate) { return candidate.valid && candidate.zeroTextOverlap; }).length,
      clearConnectorCandidateCount: candidates.filter(function (candidate) { return candidate.valid && candidate.zeroTextOverlap && candidate.connectorTextHits === 0; }).length
    };
    if (!chosen) {
      renderCoachmarkInline(coach, target, targetKey, audit);
      recordCoachmarkAudit(coach, audit);
      coachmarkTargetKey = targetKey;
      coachmarkInvalidationReason = "positioned";
      return;
    }
    coachmarkSuppressObservationUntil = performance.now() + 60;
    if (coach.parentNode !== document.body) document.body.appendChild(coach);
    coach.classList.remove("is-inline", "is-measuring");
    coach.dataset.placement = chosen.placement;
    coach.dataset.align = chosen.align;
    coach.style.setProperty("--coach-width", chosen.width + "px");
    coach.style.setProperty("--coach-left", chosen.rect.left + "px");
    coach.style.setProperty("--coach-top", chosen.rect.top + "px");
    coach.style.setProperty("--coach-max-height", boundary.height + "px");
    var connectorVisible = renderCoachmarkConnector(chosen);
    coachmarkLastPlacement = { targetKey: targetKey, mode: "floating", placement: chosen.placement, align: chosen.align, width: chosen.width, left: chosen.rect.left, top: chosen.rect.top };
    audit.mode = "floating";
    audit.placement = chosen.placement;
    audit.align = chosen.align;
    audit.width = chosen.width;
    audit.height = Math.round(chosen.height);
    audit.textOverlaps = chosen.textHits;
    audit.connectorTextOverlaps = chosen.connectorTextHits;
    audit.connectorRouted = !!chosen.connectorRouted;
    audit.connectorVisible = connectorVisible;
    recordCoachmarkAudit(coach, audit);
    coachmarkTargetKey = targetKey;
    coachmarkInvalidationReason = "positioned";
  }

  function queueCoachmarkPosition() {
    if (coachmarkFrame) cancelAnimationFrame(coachmarkFrame);
    if (coachmarkFallbackTimeout) clearTimeout(coachmarkFallbackTimeout);
    coachmarkFrame = requestAnimationFrame(function () {
      coachmarkFrame = 0;
      if (coachmarkFallbackTimeout) clearTimeout(coachmarkFallbackTimeout);
      coachmarkFallbackTimeout = null;
      positionCoachmarkNow();
    });
    coachmarkFallbackTimeout = setTimeout(function () {
      coachmarkFallbackTimeout = null;
      if (coachmarkFrame) cancelAnimationFrame(coachmarkFrame);
      coachmarkFrame = 0;
      positionCoachmarkNow();
    }, 120);
  }

  function observeCoachmarkTarget(target) {
    if (!("ResizeObserver" in window) || coachmarkObservedTarget === target) return;
    if (!coachmarkTargetObserver) {
      coachmarkTargetObserver = new ResizeObserver(function () {
        if (performance.now() < coachmarkSuppressObservationUntil) return;
        invalidateCoachmarkGeometry("target-resize", false);
        queueCoachmarkPosition();
      });
    }
    coachmarkTargetObserver.disconnect();
    coachmarkObservedTarget = target || null;
    if (target) coachmarkTargetObserver.observe(target);
  }

  function installCoachmarkObservers() {
    var root = document.getElementById("productDemo");
    ["input", "change"].forEach(function (eventName) {
      document.addEventListener(eventName, function (event) {
        var control = event.target;
        if (!coachmarkEl || !root || !control || !root.contains(control) || !control.matches("input, textarea, select")) return;
        invalidateCoachmarkGeometry("form-text", false);
        queueCoachmarkPosition();
      }, { capture: true, passive: true });
    });
    document.addEventListener("scroll", function (event) {
      var scroller = event.target && event.target.closest ? event.target.closest(".sim-surface-scroll, .protocol-sequence-scroll") : null;
      if (!scroller || !root || !root.contains(scroller)) return;
      invalidateCoachmarkGeometry("surface-scroll", false);
      queueCoachmarkPosition();
    }, { capture: true, passive: true });
    if (root && "MutationObserver" in window) {
      coachmarkMutationObserver = new MutationObserver(function () {
        if (performance.now() < coachmarkSuppressObservationUntil) return;
        invalidateCoachmarkGeometry("surface-content", true);
        queueCoachmarkPosition();
      });
      coachmarkMutationObserver.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "style", "hidden"] });
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        coachmarkMeasureCache = {};
        invalidateCoachmarkGeometry("fonts-ready", true);
        queueCoachmarkPosition();
      });
      if (document.fonts.addEventListener) {
        document.fonts.addEventListener("loadingdone", function () {
          coachmarkMeasureCache = {};
          invalidateCoachmarkGeometry("fonts-loaded", true);
          queueCoachmarkPosition();
        });
      }
    }
  }

  function installCoachmarkAuditHook() {
    window.__coachmarkAudit = {
      ready: true,
      version: 1,
      snapshot: function () {
        var coach = document.getElementById("guidedCoachmark");
        var target = activeCoachmarkTarget();
        return {
          enabled: coachmarkAuditEnabled,
          latest: coachmarkAuditHistory.length ? coachmarkAuditHistory[coachmarkAuditHistory.length - 1] : null,
          coachRect: coach ? coach.getBoundingClientRect().toJSON ? coach.getBoundingClientRect().toJSON() : coach && coach.getBoundingClientRect() : null,
          targetRect: target ? target.getBoundingClientRect().toJSON ? target.getBoundingClientRect().toJSON() : target && target.getBoundingClientRect() : null,
          mode: coach ? coach.dataset.coachmarkMode : "none",
          placement: coach ? coach.dataset.placement : "none",
          geometryVersion: coachmarkGeometryVersion
        };
      },
      history: function () { return coachmarkAuditHistory.slice(); },
      invalidate: function () {
        coachmarkMeasureCache = {};
        invalidateCoachmarkGeometry("audit", true);
        queueCoachmarkPosition();
      },
      reposition: function () { queueCoachmarkPosition(); },
      recompute: function () {
        coachmarkMeasureCache = {};
        invalidateCoachmarkGeometry("audit", true);
        positionCoachmarkNow();
        return this.snapshot();
      }
    };
  }

  function stickySafeTop(viewportTop, viewportHeight) {
    var visibleTop = typeof viewportTop === "number" ? viewportTop : 0;
    var visibleHeight = typeof viewportHeight === "number" ? viewportHeight : window.innerHeight;
    var fallback = visibleTop + 10;
    var nav = document.querySelector(".sitenav");
    if (!nav) return fallback;
    var rect = nav.getBoundingClientRect();
    if (rect.bottom <= visibleTop || rect.top > visibleTop + 4) return fallback;
    return Math.min(visibleTop + visibleHeight * .34, Math.max(fallback, rect.bottom + 10));
  }

  function visibleViewportBounds() {
    var viewport = window.visualViewport;
    var top = viewport ? viewport.offsetTop : 0;
    var height = viewport ? viewport.height : window.innerHeight;
    var bottom = top + height;
    var safeTop = Math.max(top + 10, stickySafeTop(top, height));
    var safeBottom = bottom - 10;
    if (safeBottom - safeTop < 96) {
      safeTop = top + 4;
      safeBottom = bottom - 4;
    }
    return { top: safeTop, bottom: safeBottom, height: Math.max(1, safeBottom - safeTop) };
  }

  function computeFrameScrollTop(currentScrollY, frameTop, frameBottom, safeTop, safeBottom, maxScrollY) {
    var frameHeight = Math.max(0, frameBottom - frameTop);
    var usableHeight = Math.max(1, safeBottom - safeTop);
    var current = Math.max(0, currentScrollY);
    var pageMax = Math.max(0, maxScrollY);
    if (frameTop >= safeTop && frameBottom <= safeBottom) return Math.min(pageMax, current);
    var desiredFrameTop = safeTop + Math.max(0, (usableHeight - frameHeight) / 2);
    var desired = current + frameTop - desiredFrameTop;
    return Math.max(0, Math.min(pageMax, desired));
  }

  function simulatorFrameForPreview(preview) {
    var demandFrame = preview && preview.closest(".sim-demand-frame");
    return demandFrame || preview;
  }

  function frameIsFullyVisible(frame, bounds) {
    if (!frame) return false;
    var rect = frame.getBoundingClientRect();
    return rect.top >= bounds.top - 1 && rect.bottom <= bounds.bottom + 1;
  }

  function fitSimulatorFrameToViewport(preview, bounds) {
    if (!preview) return null;
    var frame = simulatorFrameForPreview(preview);
    var previewRect = preview.getBoundingClientRect();
    var frameRect = frame.getBoundingClientRect();
    var frameOverhead = Math.max(0, frameRect.height - previewRect.height);
    var maxPreviewHeight = Math.max(96, Math.floor(bounds.height - frameOverhead));
    var maxPreviewValue = maxPreviewHeight + "px";
    if (preview.style.getPropertyValue("--sim-preview-max-height") !== maxPreviewValue) {
      preview.style.setProperty("--sim-preview-max-height", maxPreviewValue);
    }
    return frame;
  }

  function refitSimulatorFrame() {
    var surfaceFrame = document.querySelector(".sim-surface-frame");
    if (!surfaceFrame) return null;
    return fitSimulatorFrameToViewport(surfaceFrame, visibleViewportBounds());
  }

  function revealTargetWithinSurface(target, surfaceFrame) {
    if (!target || !surfaceFrame || !surfaceFrame.contains(target)) return;
    var scrollSurface = target.closest(".sim-surface-scroll, .protocol-sequence-scroll");
    if (!scrollSurface || scrollSurface.scrollHeight <= scrollSurface.clientHeight + 1) return;
    var viewportRect = scrollSurface.getBoundingClientRect();
    var targetRect = target.getBoundingClientRect();
    var inset = Math.min(14, Math.max(4, viewportRect.height * .06));
    if (targetRect.height >= viewportRect.height - inset * 2 || targetRect.top < viewportRect.top + inset) {
      scrollSurface.scrollTop += targetRect.top - viewportRect.top - inset;
    } else if (targetRect.bottom > viewportRect.bottom - inset) {
      scrollSurface.scrollTop += targetRect.bottom - viewportRect.bottom + inset;
    }
  }

  function focusSimulatorTarget(target) {
    if (!target) return;
    var surfaceFrame = document.querySelector(".sim-surface-frame");
    if (!surfaceFrame) return;

    var bounds = visibleViewportBounds();
    var frame = fitSimulatorFrameToViewport(surfaceFrame, bounds);
    var targetInsideFrame = surfaceFrame.contains(target);

    if (targetInsideFrame) {
      revealTargetWithinSurface(target, surfaceFrame);
      var frameRect = frame.getBoundingClientRect();
      var currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
      var maxScrollY = Math.max(0, document.documentElement.scrollHeight - document.documentElement.clientHeight);
      var desiredFrameScroll = computeFrameScrollTop(currentScrollY, frameRect.top, frameRect.bottom, bounds.top, bounds.bottom, maxScrollY);
      if (!frameIsFullyVisible(frame, bounds) || Math.abs(currentScrollY - desiredFrameScroll) > 1.5) scrollToY(desiredFrameScroll);
      else queueCoachmarkPosition();
      return;
    }

    var currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
    var maxScrollY = Math.max(0, document.documentElement.scrollHeight - document.documentElement.clientHeight);
    var targetRect = target.getBoundingClientRect();
    if (targetRect.top >= bounds.top + 5 && targetRect.bottom <= bounds.bottom - 5) {
      queueCoachmarkPosition();
      return;
    }
    var desiredTargetTop = bounds.top + Math.max(0, (bounds.height - Math.min(targetRect.height, bounds.height)) / 2);
    var desiredTargetScroll = currentScrollY + targetRect.top - desiredTargetTop;
    scrollToY(Math.max(0, Math.min(maxScrollY, desiredTargetScroll)));
  }

  function scrollToY(desiredScrollTop) {
    var currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var useAutoScroll = reduceMotion || window.innerWidth <= 520;
    if (Math.abs(currentScrollY - desiredScrollTop) <= 1.5) {
      queueCoachmarkPosition();
      return;
    }
    window.scrollTo({
      top: Math.max(0, desiredScrollTop),
      behavior: useAutoScroll ? "auto" : "smooth"
    });
    if (!useAutoScroll) {
      var scrollCount = 0;
      var scrollHandler = function () {
        queueCoachmarkPosition();
        scrollCount++;
        if (scrollCount > 50) window.removeEventListener("scroll", scrollHandler);
      };
      window.addEventListener("scroll", scrollHandler);
      setTimeout(function () {
        window.removeEventListener("scroll", scrollHandler);
        queueCoachmarkPosition();
      }, 800);
    } else {
      setTimeout(queueCoachmarkPosition, 100);
    }
  }

  function focusCompletedEventState(root) {
    var button = root.querySelector("#runNext") || root.querySelector(".sim-surface-frame");
    if (!button) return false;
    focusSimulatorTarget(button);
    return true;
  }

  function scrollToChangedAppArea(onlyWhenSectionVisible) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (onlyWhenSectionVisible) {
          var section = document.getElementById("system-run");
          if (!section) return;
          var sectionRect = section.getBoundingClientRect();
          var bounds = visibleViewportBounds();
          if (sectionRect.bottom <= bounds.top || sectionRect.top >= bounds.bottom) return;
        }
        var root = document.getElementById("productDemo");
        if (!root) return;
        var target;
        if (isEventComplete()) {
          if (focusCompletedEventState(root)) return;
        }
        if (!target) {
          target = root.querySelector(".guided-target, .sim-surface-frame .hot, .sim-surface-frame .is-hot") || root.querySelector(".sim-surface-frame");
        }
        focusSimulatorTarget(target);
      });
    });
  }

  function revealGuidedTargetIfNeeded() {
    if (!allowAutoRevealTarget) return;
    allowAutoRevealTarget = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var section = document.getElementById("system-run");
        var target = activeCoachmarkTarget();
        if (!section || !target) return;
        var sectionRect = section.getBoundingClientRect();
        var bounds = visibleViewportBounds();
        var sectionIsCurrent = location.hash === "#system-run" || (sectionRect.top < bounds.bottom && sectionRect.bottom > bounds.top);
        if (!sectionIsCurrent) return;
        focusSimulatorTarget(target);
      });
    });
  }

  function allowNextGuidedReveal() {
    allowAutoRevealTarget = true;
  }

  function advanceEventStep(options) {
    var automatic = Boolean(options && options.automatic);
    var validation = currentStepValidation();
    if (!validation.valid) {
      syncGuidedActionValidity();
      return;
    }
    var total = eventStepCount();
    if (activeEventStep >= total) return;
    var completedStep = currentTutorialStep();
    cancelAutomaticStep();
    queueStepConfirmation(completedStep, activeEventStep + 1);
    activeAction = activeEventStep;
    activeEventStep += 1;
    if (isEventComplete()) completedStages[stage] = true;
    saveProductProgress();
    suppressSimulatorFocusRestoreOnce = automatic;
    prepareSimulatorTransition(!automatic);
    var item = STAGES[stage];
    var focus = FOCUS_STEPS[stage];
    renderStageArt(item, focus);
    renderControls();
    syncSystemMachineStage();
    if (!automatic) {
      scrollToChangedAppArea();
      window.setTimeout(revealGuidedTargetIfNeeded, 640);
      window.setTimeout(revealGuidedTargetIfNeeded, 1180);
    }
  }

  function rewindCurrentEventStep() {
    var previous = previousRunState(stage, activeEventStep);
    if (!previous) return false;
    cancelAutomaticStep();
    clearStepConfirmation();
    var crossedEvent = previous.stage !== stage;
    var wasComplete = isEventComplete();
    if (crossedEvent) {
      saveProductProgress();
      stage = previous.stage;
      if (stage < runStartStage) {
        runStartStage = PRODUCT_MODES[productModeForStage(stage)].start;
      }
      maxReachedByMode[productModeForStage(stage)] = Math.max(maxReachedByMode[productModeForStage(stage)], stage);
      activeEventStep = previous.step;
      activeAction = activeEventStep > 0 ? activeEventStep - 1 : -1;
      completedStages[stage] = true;
      openStageGroup = -1;
      setEventNavigatorOpen(false);
    } else {
      activeEventStep = previous.step;
      activeAction = activeEventStep > 0 ? activeEventStep - 1 : -1;
      if (wasComplete) delete completedStages[stage];
    }
    allowNextGuidedReveal();
    prepareSimulatorTransition(!crossedEvent);
    render();
    scrollToChangedAppArea();
    return true;
  }

  function goToNextEvent() {
    if (stage >= STAGES.length - 1 || !isEventComplete()) return false;
    completedStages[stage] = true;
    stage += 1;
    var nextMode = productModeForStage(stage);
    maxReachedByMode[nextMode] = Math.max(maxReachedByMode[nextMode], stage);
    resetEventFlow(false);
    openStageGroup = -1;
    setEventNavigatorOpen(false);
    allowNextGuidedReveal();
    prepareSimulatorTransition(false);
    render();
    return true;
  }

  function restartRunFromContinuation() {
    selectedRunMode = "omen";
    stage = 0;
    runStartStage = 0;
    selectedBallotChoice = "";
    liveTradeSide = "YES";
    appealContributionDraft = 4000;
    completedStages = {};
    maxReachedByMode = { omen: 0, themis: 6 };
    productProgress = {
      omen: { stage: 0, step: 0, action: -1 },
      themis: { stage: 6, step: 0, action: -1 }
    };
    marketLiquidityDraft = { yes: .1, no: 0 };
    liveFieldDrafts = {};
    resetEventFlow(false);
    openStageGroup = -1;
    setEventNavigatorOpen(false);
    allowNextGuidedReveal();
    prepareSimulatorTransition(true);
    render();
    return true;
  }

  function stageGroupIndexForStage(stageIndex) {
    for (var i = 0; i < STAGE_GROUPS.length; i += 1) {
      if (stageIndex >= STAGE_GROUPS[i].start && stageIndex <= STAGE_GROUPS[i].end) return i;
    }
    return -1;
  }

  function stageGroupCount(group) {
    return Math.max(0, Math.min(STAGES.length - 1, group.end) - Math.max(0, group.start) + 1);
  }

  function stageGroupRangeLabel(group) {
    var groupStart = Math.max(0, group.start);
    var groupEnd = Math.min(STAGES.length - 1, group.end);
    var first = String(groupStart + 1).padStart(2, "0");
    var last = String(groupEnd + 1).padStart(2, "0");
    return groupStart === groupEnd ? first : first + "-" + last;
  }

  function stageGroupProgressLabel(group, groupActive) {
    if (groupActive) {
      return (stage - Math.max(0, group.start) + 1) + " / " + stageGroupCount(group);
    }
    return stageGroupRangeLabel(group);
  }

  function setEventNavigatorOpen(open) {
    eventNavigatorOpen = !!open;
    if (!eventNavigatorOpen) openStageGroup = -1;
    if (rail) rail.hidden = !eventNavigatorOpen;
    if (eventNavigatorToggle) {
      eventNavigatorToggle.classList.toggle("is-open", eventNavigatorOpen);
      eventNavigatorToggle.setAttribute("aria-expanded", eventNavigatorOpen ? "true" : "false");
      eventNavigatorToggle.setAttribute("aria-label", (eventNavigatorOpen ? "Close" : "Open") + " all event groups");
    }
    renderRail();
  }

  function closeEventNavigator() {
    if (!eventNavigatorOpen) return false;
    setEventNavigatorOpen(false);
    return true;
  }

  function collapseLooseStageGroups() {
    if (openStageGroup < 0) return;
    openStageGroup = -1;
    renderRail();
  }

  function refreshCoachmarkAfterRailChange() {
    if (!coachmarkEl) return;
    invalidateCoachmarkGeometry("event-navigator", true);
    queueCoachmarkPosition();
  }

  function visitEventFromNavigator(nextStage) {
    var nextMode = productModeForStage(nextStage);
    if (nextStage < runStartStage || (nextStage > maxReachedByMode[nextMode] && !completedStages[nextStage])) return false;
    saveProductProgress();
    stage = nextStage;
    resetEventFlow(false);
    openStageGroup = -1;
    setEventNavigatorOpen(false);
    allowNextGuidedReveal();
    prepareSimulatorTransition(true);
    render();
    return true;
  }

  function renderRail() {
    rail.replaceChildren();
    var selectedGroup = stageGroupIndexForStage(stage);
    if (openStageGroup === selectedGroup) openStageGroup = -1;
    var drawerGroupIndex = openStageGroup >= 0 ? openStageGroup : selectedGroup;
    var visibleGroups = STAGE_GROUPS.map(function (group, groupIndex) {
      return { group: group, index: groupIndex };
    });
    visibleGroups.forEach(function (entry, visibleIndex) {
      var group = entry.group;
      var groupIndex = entry.index;
      var groupEl = makeEl("div", "stage-group");
      var groupStart = Math.max(0, group.start);
      var groupEnd = Math.min(STAGES.length - 1, group.end);
      var groupActive = groupIndex === selectedGroup;
      var groupExpanded = groupIndex === drawerGroupIndex;
      groupEl.setAttribute("data-stage-mode", group.mode);
      if (groupActive) groupEl.classList.add("active");
      if (groupExpanded) groupEl.classList.add("open");
      if (!groupExpanded) groupEl.classList.add("collapsed");
      if (stage > groupEnd) groupEl.classList.add("complete");
      if (stage < groupStart) groupEl.classList.add("upcoming");
      if (visibleIndex === visibleGroups.length - 1) groupEl.classList.add("last-product-group");

      var toggle = makeEl("button", "stage-group-toggle");
      var stepsId = "stageGroupSteps" + groupIndex;
      toggle.type = "button";
      toggle.setAttribute("aria-expanded", groupExpanded ? "true" : "false");
      toggle.setAttribute("aria-controls", stepsId);
      toggle.setAttribute("aria-label", (groupActive ? "Current category: " : groupExpanded ? "Collapse " : "Open ") + group.label + " events");
      toggle.appendChild(makeEl("span", "stage-group-name", group.label));
      toggle.appendChild(makeEl("span", "stage-group-range", stageGroupProgressLabel(group, groupActive)));
      var affordance = makeEl("span", "stage-group-caret");
      affordance.setAttribute("aria-hidden", "true");
      toggle.appendChild(affordance);
      toggle.addEventListener("click", function (event) {
        event.stopPropagation();
        if (groupActive) {
          openStageGroup = -1;
          renderRail();
          return;
        }
        openStageGroup = groupExpanded ? -1 : groupIndex;
        renderRail();
      });
      groupEl.appendChild(toggle);
      rail.appendChild(groupEl);
    });

    if (drawerGroupIndex < 0) {
      ensureSimulatorButtonInfoLabels();
      refreshCoachmarkAfterRailChange();
      return;
    }
    var drawerGroup = STAGE_GROUPS[drawerGroupIndex];
    var drawerStart = Math.max(0, drawerGroup.start);
    var drawerEnd = Math.min(STAGES.length - 1, drawerGroup.end);
    var steps = makeEl("div", "stage-group-steps");
    steps.setAttribute("data-stage-mode", drawerGroup.mode);
    steps.id = "stageGroupSteps" + drawerGroupIndex;
    steps.setAttribute("aria-label", drawerGroup.label + " events");
    var stepList = makeEl("div", "stage-step-list");
    for (var i = drawerStart; i <= drawerEnd; i += 1) {
      var item = STAGES[i];
      var btn = document.createElement("button");
      var n = document.createElement("span");
      var itemMode = productModeForStage(i);
      var canVisit = i >= runStartStage && (i <= maxReachedByMode[itemMode] || !!completedStages[i] || i === stage);
      btn.type = "button";
      btn.className = "stage-step " + (completedStages[i] ? "done" : (i === stage ? "active" : ""));
      if (i === stage) btn.classList.add("active");
      btn.disabled = !canVisit;
      btn.setAttribute("aria-current", i === stage ? "step" : "false");
      btn.setAttribute("aria-label", (canVisit ? "Go to" : "Locked") + " stage " + (i + 1) + ": " + item.title);
      btn.title = item.title;
      n.className = "n";
      n.textContent = String(i + 1).padStart(2, "0");
      btn.appendChild(n);
      btn.appendChild(makeEl("span", "step-name", (STEP_GUIDES[i] && STEP_GUIDES[i].label) || item.title));
      btn.addEventListener("click", function (nextStage) {
        return function () {
          visitEventFromNavigator(nextStage);
        };
      }(i));
      stepList.appendChild(btn);
    }
    steps.appendChild(stepList);
    rail.appendChild(steps);
    ensureSimulatorButtonInfoLabels();
    refreshCoachmarkAfterRailChange();
  }

  function renderFocus(item) {
    var focus = FOCUS_STEPS[stage] || {
      lane: item.court === "idle" ? "Market" : "Arbitration",
      title: item.title,
      body: item.text,
      change: item.sub,
      why: item.log,
      next: stage === STAGES.length - 1 ? "Run complete" : STAGES[stage + 1].title,
      tone: "market"
    };
    renderStageArt(item, focus);
  }

  function renderControls() {
    var selectedGroup = stageGroupIndexForStage(stage);
    var continuation = currentContinuation();
    var placement = next.getAttribute("data-nav-placement") || "outer";
    var eventComplete = isEventComplete();
    if (runControlEvent) runControlEvent.textContent = String(stage + 1).padStart(2, "0") + "/" + STAGES.length;
    if (runControlStage) runControlStage.textContent = selectedGroup >= 0 ? STAGE_GROUPS[selectedGroup].label : "Run-through";
    if (runControlTitle) runControlTitle.textContent = (STEP_GUIDES[stage] && STEP_GUIDES[stage].label) || STAGES[stage].title;
    clearWorkflowAction(next);
    next.classList.remove("is-action-cue");
    back.textContent = activeEventStep > 0 ? "Previous action" : (stage > 0 ? "Previous event" : "Back");
    next.replaceChildren();
    if (eventComplete && continuation && placement === "app") {
      next.appendChild(makeEl("span", "sim-app-action-label", continuation.action));
    } else if (eventComplete && continuation && placement === "explainer") {
      var explainerNextCopy = makeEl("span", "sim-explainer-next-copy");
      explainerNextCopy.appendChild(makeEl("small", "", "Continue walkthrough"));
      explainerNextCopy.appendChild(makeEl("strong", "", continuation.action));
      next.appendChild(explainerNextCopy);
      next.appendChild(makeEl("span", "sim-next-arrow"));
    } else if (eventComplete && continuation && placement === "browser") {
      var browserNextCopy = makeEl("span", "sim-browser-next-copy");
      browserNextCopy.appendChild(makeEl("small", "", continuation.restart ? "Walkthrough complete" : "Next event · " + String(stage + 2).padStart(2, "0")));
      browserNextCopy.appendChild(makeEl("strong", "", continuation.action));
      next.appendChild(browserNextCopy);
      next.appendChild(makeEl("span", "sim-next-arrow"));
    } else {
      next.textContent = "Next event";
    }
    var nextHint = eventComplete && continuation
      ? continuation.action + ". " + continuation.note
      : "Complete the current event to continue.";
    next.setAttribute("aria-label", eventComplete && continuation ? continuation.action : "Next event locked");
    next.removeAttribute("data-sim-tip");
    next.title = cleanTip(nextHint);
    back.disabled = !canRewindRunState();
    back.setAttribute("aria-label", back.disabled ? "No previous state" : (activeEventStep > 0 ? "Return to the previous action" : "Return to the completed state of the previous event"));
    back.title = back.disabled ? "This is the first action in the run" : (activeEventStep > 0 ? "Previous action" : "Previous event");
    next.hidden = false;
    next.disabled = !isEventComplete() || !continuation;
    if (eventComplete && continuation) {
      next.classList.add("is-action-cue", "guided-target");
      tagWorkflowAction(next, continuation.action, continuation.note, "user");
      next.removeAttribute("data-sim-tip");
      setAttributeToken(next, "aria-describedby", "guidedCoachmark", true);
    }
    ensureSimulatorButtonInfoLabels();
    invalidateCoachmarkGeometry("controls", true);
    positionCoachmarkNow();
  }

  function render() {
    var item = STAGES[stage];
    var focus = FOCUS_STEPS[stage] || {};
    syncProductMode();
    renderRail();
    renderFocus(item);
    setTags("featureGrid", "data-feature", item.features);
    setTags("componentGrid", "data-component", item.components);
    renderControls();
    ensureSimulatorButtonInfoLabels();
    syncSystemMachineStage();
    saveProductProgress();
    revealGuidedTargetIfNeeded();
    queueCoachmarkPosition();
    settleCoachmarkAuditState();
  }

  function settleCoachmarkAuditState() {
    if (!coachmarkAuditEnabled) return;
    var root = document.getElementById("productDemo");
    var target = activeCoachmarkTarget();
    var frame = root && root.querySelector(".sim-surface-frame");
    if (!target || !frame) return;
    var bounds = visibleViewportBounds();
    var currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
    var maxScrollY = Math.max(0, document.documentElement.scrollHeight - document.documentElement.clientHeight);
    var desired;
    if (frame.contains(target)) {
      var frameRect = frame.getBoundingClientRect();
      desired = computeFrameScrollTop(currentScrollY, frameRect.top, frameRect.bottom, bounds.top, bounds.bottom, maxScrollY);
    } else {
      var outerTargetRect = target.getBoundingClientRect();
      desired = clampNumber(currentScrollY + outerTargetRect.top - bounds.top - 12, 0, maxScrollY);
    }
    if (Math.abs(desired - currentScrollY) > 1) window.scrollTo(0, desired);
    var scrollSurface = target.closest(".sim-surface-scroll, .protocol-sequence-scroll");
    if (scrollSurface) {
      var targetRect = target.getBoundingClientRect();
      var scrollRect = scrollSurface.getBoundingClientRect();
      if (targetRect.top < scrollRect.top + 8) scrollSurface.scrollTop -= scrollRect.top + 8 - targetRect.top;
      else if (targetRect.bottom > scrollRect.bottom - 8) scrollSurface.scrollTop += targetRect.bottom - scrollRect.bottom + 8;
    }
    coachmarkTargetKey = "";
    invalidateCoachmarkGeometry("audit-state", true);
    positionCoachmarkNow();
  }

  function installLayoutAuditHook() {
    if (!/[?&]layoutAudit=1(?:&|$)/.test(window.location.search)) return;
    document.documentElement.classList.add("layout-audit-mode");
    function readAuditValue(name) {
      var pattern = new RegExp("(?:[?&#&])" + name + "=([0-9]+)");
      var match = (window.location.search + window.location.hash).match(pattern);
      return match ? Number(match[1]) : null;
    }
    function auditStepCount(stageIndex) {
      return (APP_FLOWS[stageIndex] && APP_FLOWS[stageIndex].steps ? APP_FLOWS[stageIndex].steps.length : 0);
    }
    function applyAuditLocation(shouldRender) {
      var nextStage = readAuditValue("layoutStage");
      var nextStep = readAuditValue("layoutStep");
      if (nextStage == null) return;
      stage = Math.max(0, Math.min(STAGES.length - 1, nextStage));
      var auditMode = productModeForStage(stage);
      selectedRunMode = auditMode;
      runStartStage = PRODUCT_MODES[auditMode].start;
      maxReachedByMode[auditMode] = Math.max(maxReachedByMode[auditMode], stage);
      activeEventStep = Math.max(0, Math.min(auditStepCount(stage), nextStep || 0));
      activeAction = activeEventStep > 0 ? activeEventStep - 1 : -1;
      if (activeEventStep >= auditStepCount(stage)) completedStages[stage] = true;
      openStageGroup = -1;
      allowAutoRevealTarget = false;
      if (shouldRender) render();
    }
    window.__layoutAudit = {
      stages: function () {
        return STAGES.map(function (item, index) {
          return { index: index, title: item.title, steps: auditStepCount(index) };
        });
      },
      goTo: function (stageIndex, stepIndex) {
        stage = Math.max(0, Math.min(STAGES.length - 1, Number(stageIndex) || 0));
        var auditMode = productModeForStage(stage);
        selectedRunMode = auditMode;
        runStartStage = PRODUCT_MODES[auditMode].start;
        maxReachedByMode[auditMode] = Math.max(maxReachedByMode[auditMode], stage);
        activeEventStep = Math.max(0, Math.min(auditStepCount(stage), Number(stepIndex) || 0));
        activeAction = activeEventStep > 0 ? activeEventStep - 1 : -1;
        openStageGroup = -1;
        allowAutoRevealTarget = false;
        render();
        return { stage: stage, step: activeEventStep, steps: auditStepCount(stage) };
      }
    };
    applyAuditLocation(false);
    window.addEventListener("hashchange", function () {
      applyAuditLocation(true);
    });
  }

  next.addEventListener("click", function () {
    runContinuationAction();
  });
  back.addEventListener("click", function () {
    rewindCurrentEventStep();
  });
  productTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      selectProductMode(tab.getAttribute("data-product-mode"));
    });
  });
  if (eventNavigatorToggle) {
    eventNavigatorToggle.addEventListener("click", function (event) {
      event.stopPropagation();
      setEventNavigatorOpen(!eventNavigatorOpen);
    });
  }
  document.addEventListener("click", function (event) {
    if ((eventNavigatorToggle && eventNavigatorToggle.contains(event.target)) || (rail && rail.contains(event.target))) return;
    if (closeEventNavigator()) return;
    collapseLooseStageGroups();
  });
  window.addEventListener("scroll", function () {
    invalidateCoachmarkGeometry("scroll", false);
    queueCoachmarkPosition();
  }, { passive: true });

  document.addEventListener("scroll", function (event) {
    if (event.target === document || event.target === document.documentElement) return;
    invalidateCoachmarkGeometry("surface-scroll", false);
    queueCoachmarkPosition();
  }, { capture: true, passive: true });

  window.addEventListener("resize", function () {
    coachmarkMeasureCache = {};
    invalidateCoachmarkGeometry("viewport-resize", true);
    queueStageArtResize();
    queueCoachmarkPosition();
  });
  window.addEventListener("load", function () {
    invalidateCoachmarkGeometry("window-load", true);
    queueCoachmarkPosition();
  });
  window.addEventListener("hashchange", function () {
    allowAutoRevealTarget = false;
    invalidateCoachmarkGeometry("hashchange", true);
    queueCoachmarkPosition();
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", function () {
      coachmarkMeasureCache = {};
      invalidateCoachmarkGeometry("visual-viewport-resize", true);
      queueStageArtResize();
      queueCoachmarkPosition();
    });
    window.visualViewport.addEventListener("scroll", function () {
      invalidateCoachmarkGeometry("visual-viewport-scroll", false);
      queueCoachmarkPosition();
    }, { passive: true });
  }
  if ("ResizeObserver" in window) {
    var stageObserver = new ResizeObserver(function () {
      if (performance.now() >= coachmarkSuppressObservationUntil) invalidateCoachmarkGeometry("surface-resize", false);
      queueStageArtResize();
      queueCoachmarkPosition();
    });
    var stageNode = document.getElementById("productDemo");
    if (stageNode) stageObserver.observe(stageNode);
  }

  initSystemStateMachine();
  installSimTooltips();
  installLayoutAuditHook();
  installCoachmarkObservers();
  installCoachmarkAuditHook();
  render();
})();
