// Bonding curve settings for every coin launched on the pad.
// Fees: flat 1% per trade, paid in SOL. Meteora keeps its protocol share; the rest goes to the pad
// (creatorTradingFeePercentage = 0), which then pays the launching agent and the burn.
// The Meteora toolkit is passed in (loaded at run time by the caller) to keep deploys fast.
// deno-lint-ignore no-explicit-any
type Sdk = any;

export type CurveSettings = {
  migration_quote_threshold_sol: number;
  percentage_supply_on_migration: number;
  fee_bps: number;
  total_supply: number;
  decimals: number;
};

export function curveParams(m: Sdk, s: CurveSettings) {
  const { buildCurve, TokenType, TokenDecimal, TokenAuthorityOption, BaseFeeMode, CollectFeeMode, MigrationOption, MigrationFeeOption, ActivationType } = m;
  return buildCurve({
    token: {
      tokenType: TokenType.SPLToken,
      tokenBaseDecimal: TokenDecimal.SIX,
      tokenQuoteDecimal: TokenDecimal.NINE,
      tokenAuthorityOption: TokenAuthorityOption.Immutable,
      totalTokenSupply: s.total_supply,
      leftover: 0,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
        feeSchedulerParam: { startingFeeBps: s.fee_bps, endingFeeBps: s.fee_bps, numberOfPeriod: 0, totalDuration: 0 },
      },
      dynamicFeeEnabled: false,
      collectFeeMode: CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: 0,
      poolCreationFee: 0,
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.FixedBps100,
      migrationFee: { feePercentage: 0, creatorFeePercentage: 0 },
    },
    liquidityDistribution: {
      partnerPermanentLockedLiquidityPercentage: 100,
      partnerLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: 0,
      creatorLiquidityPercentage: 0,
    },
    lockedVesting: { totalLockedVestingAmount: 0, numberOfVestingPeriod: 0, cliffUnlockAmount: 0, totalVestingDuration: 0, cliffDurationFromMigrationTime: 0 },
    activationType: ActivationType.Timestamp,
    percentageSupplyOnMigration: s.percentage_supply_on_migration,
    migrationQuoteThreshold: s.migration_quote_threshold_sol,
  });
}
