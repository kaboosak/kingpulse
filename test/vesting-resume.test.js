import assert from "node:assert/strict";

import { parseUnits } from "ethers";

import {
  buildRemainingPlan,
  parseCompletedCategoriesLog,
  summarizePlan,
} from "../scripts/build-resume-vesting-plan.js";

describe("vesting resume plan builder", function () {
  it("excludes completed categories parsed from the results log", function () {
    const completedCategories = parseCompletedCategoriesLog(`
category=alpha
current_holder=0x1111111111111111111111111111111111111111
---
category=gamma
current_holder=0x3333333333333333333333333333333333333333
---
category=alpha
`);

    const remaining = buildRemainingPlan({
      completedCategories,
      planEntries: [
        {
          category: "alpha",
          amountDisplay: "1.0",
        },
        {
          category: "beta",
          amountDisplay: "2.5",
        },
        {
          category: "gamma",
          amountDisplay: "3.0",
        },
      ],
    });

    assert.deepEqual(completedCategories, ["alpha", "gamma"]);
    assert.deepEqual(
      remaining.map((entry) => entry.category),
      ["beta"]
    );

    const summary = summarizePlan(remaining);
    assert.equal(summary.entryCount, 1);
    assert.equal(summary.totalRawAmount, parseUnits("2.5", 18));
    assert.equal(summary.totalAmount, "2.5");
  });
});
