import {
  poolsGsi1,
  type BloodUnit,
  type DonorPool,
} from "@pulsechain/shared";
import { getItem, queryAll } from "../lib/db.js";

export interface DonorTierInput {
  unitId: string;
}

export interface DonorTierOutput {
  unitId: string;
  poolsMatched: Array<{
    poolId: string;
    name: string;
    availableDonors: number;
  }>;
}

export async function handler(event: DonorTierInput): Promise<DonorTierOutput> {
  const { unitId } = event;

  const pools = await queryAll<DonorPool & Record<string, any>>({
    indexName: "GSI1",
    keyCondition: "GSI1PK = :pk",
    values: {
      ":pk": "POOLS",
    },
  });

  const matched = pools.map((p) => ({
    poolId: p.poolId,
    name: p.name,
    availableDonors: p.registered ?? 0,
  }));

  return {
    unitId,
    poolsMatched: matched,
  };
}
