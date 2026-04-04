// three modern solving methods:
// FISH, AIC, ALS
// Order for learning:
//   Locked sets => BLR (size 1 fish
//    Fish  (size 2+ fish)
//    AIC => Als  xz, xy chain=> ALS DOF

export type Technique =
  | 'nakedSingle'
  | 'hiddenSingleBox'
  | 'hiddenSingleRow'
  | 'hiddenSingleCol'
  | 'nakedPair'
  | 'nakedTriple'
  | 'nakedQuad'
  | 'hiddenPair'
  | 'hiddenTriple'
  | 'hiddenQuad'
  | 'lockedCandidatePointing'
  | 'lockedCandidateClaiming'
  | 'xWing'
  | 'swordfish'
  | 'jellyfish'
  | 'skyscraper'
  | 'twoStringKite'
  | 'finnedXWing'
  | 'finnedSwordfish'
  | 'finnedJellyfish'
  | 'emptyRectangle'
  | 'wWing'
  | 'yWing'
  | 'xyzWing'
  | 'uniqueRectangleType1'
  | 'uniqueRectangleType2'
  | 'uniqueRectangleType3'
  | 'uniqueRectangleType4'
  | 'uniqueRectangleType5' // note - not seen so far
  | 'bug'
  | 'xyChain'
  | 'aic'
  | 'aicRing'
  | 'groupedAIC'
  | 'alsXZ'
  | 'sueDeCoq'
  | 'deathBlossom'
  | 'nishio'
  | 'nishioNet'
  | 'cellRegionForcingChain' // note - should be solved by als above
  | 'cellRegionForcingNet' // note - should be solved by als above
  | 'forcingChain'; // note - should be solved by als above
