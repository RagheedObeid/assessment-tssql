import { db, schema } from "../../db/client";
import { eq } from "drizzle-orm";
import { trpcError } from "../../trpc/core";

export const getPlanById = async (planId: number) => {
  const plan = await db.query.plans.findFirst({
    where: eq(schema.plans.id, planId),
  });
  if (!plan) {
    throw new trpcError({
      code: "NOT_FOUND",
      message: "Plan not found",
    });
  }
  return plan;
};

export const getAllPlans = async () => {
  try {
    const plans = await db.query.plans.findMany({});
    return plans;
  } catch (error) {
    console.error("Error fetching plans", error);
    return [];
  }
};

export const createPlan = async (name: string, price: number) => {
  try {
    await db
      .insert(schema.plans)
      .values({
        name,
        price,
      })
      .returning();
    return {
      success: true,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
    };
  }
};

export const updatePlan = async (id: number, name: string, price: number) => {
  try {
    await db
      .update(schema.plans)
      .set({
        name,
        price,
      })
      .where(eq(schema.plans.id, id));
    return {
      success: true,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
    };
  }
};

export const calculateProratedUpgradePrice = async ({
  currentPlanId,
  newPlanId,
  remainingDays,
}: {
  currentPlanId: number;
  newPlanId: number;
  remainingDays: number;
}) => {
  // Placeholder logic for prorated price calculation
  const currentPlan = await getPlanById(currentPlanId);
  const newPlan = await getPlanById(newPlanId);

  const dailyRateDifference = (newPlan.price - currentPlan.price) / 30; // Assuming 30 days in a month
  const proratedPrice = dailyRateDifference * remainingDays;

  return proratedPrice;
};
