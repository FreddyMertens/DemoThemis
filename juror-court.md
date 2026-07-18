# Juror courts without coins

Most systems we use to settle disputes on-chain run on tokens. UMA, Kleros, and Augur work in roughly the same way. You stake a token, you vote on the answer, and if your vote lands with the majority you earn a reward. The design rests on one bet from game theory: honest answers are a Schelling point, so rational voters converge on the truth.

I have used these systems, and I think the core idea is right. The part that bothers me is the layer underneath. When voting power scales with stake, security scales with money. Whoever holds the most tokens holds the most say over what counts as true. We have watched this go wrong already. On Polymarket, large holders moved UMA votes to settle markets that many users said did not match reality.

So here is the change I want to make. Keep the Schelling-point vote. Replace the part that decides who gets to vote. Instead of one token one vote, use one human one vote, where each human is verified once through World ID.

The mechanism has four parts.

First, an optimistic layer for the easy cases. Anyone can assert an answer and post a bond. If nobody challenges within two hours, the answer settles and the bond returns. Most questions are not controversial, so most never reach a jury, and the system stays cheap.

Second, random selection over verified humans. When someone does challenge, the question goes to a jury drawn at random from the people who hold a World ID and have opted in as jurors. Jurors do not choose their cases, but they may decline one they do not assess themselves as capable of judging; the next standby takes the seat. You cannot volunteer for the one market you want to swing.

Third, private votes that open together. Each juror submits a hash of their vote, then reveals it after the commit window closes. No juror sees another answer before committing, so there is nothing to copy and no bandwagon to join.

Fourth, coherence rewards and a refundable bond. This is the piece proof of personhood does not hand you for free. World ID shows you are a unique human. It says nothing about whether you will read the case. So each juror posts a small bond, say 20 dollars, refundable. Vote with the final majority and you get a fee and your bond back. Vote against it and you forfeit part of the bond to the jurors who were coherent. Now even a one-vote juror has money on the line.

Why does this resist capture better than a token vote? Because you cannot buy more humans. Suppose 10,000 people have opted in and each case draws a panel of 13. To bend one case you need a majority of a panel you cannot see coming, pulled from a pool where every identity costs an in-person iris scan, not a token purchase. Buy half of a governance token and you own half the votes, on every case, forever. Buying 5,000 verified humans is far more expensive and far more visible, and even then you only touch the cases your bought jurors happen to land on.

I want to be honest about what this does not fix.

It depends on World ID, which means depending on one personhood provider with its own central points and privacy questions. I would want the court to accept several kinds of personhood proof over time, not just one.

It invites apathy. People pulled at random into a technical dispute may not care enough to read the evidence. The fee and the bond push against that, and routing cases to jurors who opted into a matching topic pushes harder.

It does not create expertise. A random verified human is not a domain expert. For specialized questions I would let jurors register into subcourts, the way Kleros does, and draw each panel from the relevant pool.

None of these send me back to tying security to wealth. They are the work that comes after you decide that one human, one vote is the property you actually want.
