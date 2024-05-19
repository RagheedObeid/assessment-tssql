import { router, trpcError, protectedProcedure } from "../../trpc/core";
import { z } from "zod";
import {
  getPlanById,
  getAllPlans,
  createPlan,
  updatePlan,
  calculateProratedUpgradePrice,
} from "./model";
import { schema, db } from "../../db/client";
import { eq } from "drizzle-orm";

export const plans = router({
  getOne: protectedProcedure
    .input(
      z.object({
        planId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const { planId } = input;
      return await getPlanById(planId);
    }),

  get: protectedProcedure.query(async () => {
    return await getAllPlans();
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string(), price: z.number() }))
    .mutation(async ({ ctx: { user }, input }) => {
      const { userId } = user;
      const getUser = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });
      if (!getUser?.isAdmin) {
        throw new trpcError({
          code: "FORBIDDEN",
          message: "User is not authorized to create a plan",
        });
      }
      const { name, price } = input;
      return await createPlan(name, price);
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string(), price: z.number() }))
    .mutation(async ({ ctx: { user }, input }) => {
      const { id, name, price } = input;
      const { userId } = user;
      const getUser = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });
      if (!getUser?.isAdmin) {
        throw new trpcError({
          code: "FORBIDDEN",
          message: "User is not authorized to update a plan",
        });
      }
      return await updatePlan(id, name, price);
    }),

  calculateProratedUpgradePrice: protectedProcedure
    .input(
      z.object({
        currentPlanId: z.number(),
        newPlanId: z.number(),
        remainingDays: z.number(),
      })
    )
    .query(async ({ input }) => {
      const { currentPlanId, newPlanId, remainingDays } = input;
      const proratedPrice = await calculateProratedUpgradePrice({
        currentPlanId,
        newPlanId,
        remainingDays,
      });
      return { proratedPrice };
    }),
});
