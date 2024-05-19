import { beforeAll, describe, expect, it } from "vitest";
import { db, schema } from "../../db/client";
import { createAuthenticatedCaller, createCaller } from "../helpers/utils";
import resetDb from "../helpers/resetDb";
import { eq } from "drizzle-orm";
import { trpcError } from "../../trpc/core";

describe("plans routes", () => {
  beforeAll(async () => {
    await resetDb();
  });

  describe("plan tests", () => {
    const adminUser = {
      email: "adminmail@mail.com",
      password: "P@ssw0rd",
      name: "admintest",
      timezone: "Asia/Riyadh",
      locale: "en",
      isAdmin: true,
    };
    const user = {
      email: "mail@mail.com",
      password: "P@ssw0rd",
      name: "test",
      timezone: "Asia/Riyadh",
      locale: "en",
    };

    it("should fail when a non-admin tries to create a plan", async () => {
      await createCaller({}).auth.register(user);
      const userInDb = await db.query.users.findFirst({
        where: eq(schema.users.email, user.email),
      });
      await expect(
        createAuthenticatedCaller({ userId: userInDb!.id }).plans.create({
          name: "plan 1",
          price: 34,
        })
      ).rejects.toThrowError(
        new trpcError({
          code: "FORBIDDEN",
          message: "User is not authorized to create a plan",
        })
      );
    });

    it("should pass when an admin tries to create a plan", async () => {
      await createCaller({}).auth.register(adminUser);
      const adminUserInDb = await db.query.users.findFirst({
        where: eq(schema.users.email, adminUser.email),
      });

      const resp = await createAuthenticatedCaller({
        userId: adminUserInDb!.id,
      }).plans.create({
        name: "plan 2",
        price: 34,
      });
      expect(resp.success).toBe(true);
    });

    it("should pass when an admin tries to update a plan", async () => {
      const adminUserInDb = await db.query.users.findFirst({
        where: eq(schema.users.email, adminUser.email),
      });

      const plan = await db.query.plans.findFirst({
        where: eq(schema.plans.name, "plan 2"),
      });
      let resp;
      if (plan?.id) {
        resp = await createAuthenticatedCaller({
          userId: adminUserInDb!.id,
        }).plans.update({
          id: plan?.id,
          name: "plan 3",
          price: 34,
        });
      }

      expect(resp?.success).toBe(true);
    });

    it("should pass when a user tries to get all plans", async () => {
      const userInDb = await db.query.users.findFirst({
        where: eq(schema.users.email, user.email),
      });

      const resp = await createAuthenticatedCaller({
        userId: userInDb!.id,
      }).plans.get();
      expect(resp[0]?.name).toEqual("plan 3");
    });

    it("should calculate prorated upgrade price correctly as a regular user", async () => {
      const regularUserInDb = await db.query.users.findFirst({
        where: eq(schema.users.email, user.email),
      });
      const adminUserInDb = await db.query.users.findFirst({
        where: eq(schema.users.email, adminUser.email),
      });

      const plan4OBJ = { name: "plan 4", price: 30 };
      await createAuthenticatedCaller({
        userId: adminUserInDb!.id,
      }).plans.create(plan4OBJ);
      const plan3 = await db.query.plans.findFirst({
        where: eq(schema.plans.name, "plan 3"),
      });
      const plan4 = await db.query.plans.findFirst({
        where: eq(schema.plans.name, "plan 4"),
      });
      const remainingDays = 15;

      if (plan3?.id && plan4?.id) {
        const { proratedPrice } = await createAuthenticatedCaller({
          userId: regularUserInDb!.id,
        }).plans.calculateProratedUpgradePrice({
          currentPlanId: plan3?.id,
          newPlanId: plan4?.id,
          remainingDays,
        });
        const expectedProratedPrice =
          ((plan4.price - plan3.price) / 30) * remainingDays;
        expect(proratedPrice).toBe(expectedProratedPrice);
      }
    });
  });
});
