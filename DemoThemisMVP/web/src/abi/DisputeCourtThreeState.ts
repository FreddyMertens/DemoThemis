/** Supplemental ABI for the replacement court's explicit three-state ballot.
 * Kept separate from the generated legacy ABI until replacement deployment
 * artifacts become the canonical deployment source. */
export const disputeCourtThreeStateAbi = [
  {
    type: 'function',
    name: 'THREE_STATE_RULING_VERSION',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'BALLOT_V2_DOMAIN',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'revealAnswer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'caseId', type: 'uint256' },
      { name: 'ruling', type: 'uint8' },
      { name: 'salt', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'rulingOf',
    stateMutability: 'view',
    inputs: [{ name: 'caseId', type: 'uint256' }],
    outputs: [
      { name: 'ruling', type: 'uint8' },
      { name: 'insufficientVotes', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'rulingVoteOf',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'event',
    name: 'AnswerRevealed',
    anonymous: false,
    inputs: [
      { name: 'caseId', type: 'uint256', indexed: true },
      { name: 'juror', type: 'address', indexed: true },
      { name: 'ruling', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'RulingResolved',
    anonymous: false,
    inputs: [
      { name: 'caseId', type: 'uint256', indexed: true },
      { name: 'ruling', type: 'uint8', indexed: false },
      { name: 'yes', type: 'uint256', indexed: false },
      { name: 'no', type: 'uint256', indexed: false },
      { name: 'insufficient', type: 'uint256', indexed: false },
    ],
  },
] as const;
