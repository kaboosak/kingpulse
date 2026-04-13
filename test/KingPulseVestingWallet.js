import assert from "node:assert/strict";
import { network } from "hardhat";

const { ethers } = await network.connect("hardhat");

describe("KingPulseVestingWallet", function () {
  let owner;
  let beneficiary;
  let thirdParty;
  let token;
  let vestingWallet;

  beforeEach(async function () {
    [owner, beneficiary, thirdParty] = await ethers.getSigners();

    const tokenFactory = await ethers.getContractFactory("KingPulse");
    token = await tokenFactory.deploy();
    await token.waitForDeployment();

    const latestBlock = await ethers.provider.getBlock("latest");
    const start = BigInt(latestBlock.timestamp + 100);
    const duration = 1000n;

    const vestingFactory = await ethers.getContractFactory(
      "KingPulseVestingWallet"
    );
    vestingWallet = await vestingFactory.deploy(
      beneficiary.address,
      start,
      duration
    );
    await vestingWallet.waitForDeployment();

    await token.transfer(
      await vestingWallet.getAddress(),
      ethers.parseUnits("100", 18)
    );
  });

  it("releases KPL linearly over time to the beneficiary", async function () {
    const vestingAddress = await vestingWallet.getAddress();
    const tokenAddress = await token.getAddress();
    const vestingStart = await vestingWallet.start();
    const vestingDuration = await vestingWallet.duration();
    const latestBlock = await ethers.provider.getBlock("latest");
    const midpoint = latestBlock.timestamp + 600;
    const totalAllocation = ethers.parseUnits("100", 18);

    assert.equal(
      await vestingWallet["releasable(address)"](tokenAddress),
      0n
    );

    await ethers.provider.send("evm_setNextBlockTimestamp", [midpoint]);
    await ethers.provider.send("evm_mine", []);

    const midpointBlock = await ethers.provider.getBlock("latest");
    const midpointReleasable =
      await vestingWallet["releasable(address)"](tokenAddress);
    const expectedMidpointReleasable =
      (totalAllocation *
        (BigInt(midpointBlock.timestamp) - vestingStart)) /
      vestingDuration;
    assert.equal(midpointReleasable, expectedMidpointReleasable);

    await vestingWallet.connect(thirdParty)["release(address)"](tokenAddress);
    const releasedAfterMidpoint =
      await vestingWallet["released(address)"](tokenAddress);

    assert.equal(
      await token.balanceOf(beneficiary.address),
      releasedAfterMidpoint
    );
    assert.equal(
      await token.balanceOf(vestingAddress),
      totalAllocation - releasedAfterMidpoint
    );

    await ethers.provider.send("evm_setNextBlockTimestamp", [midpoint + 500]);
    await ethers.provider.send("evm_mine", []);

    await vestingWallet["release(address)"](tokenAddress);
    const releasedAfterEnd = await vestingWallet["released(address)"](tokenAddress);

    assert.equal(
      await token.balanceOf(beneficiary.address),
      releasedAfterEnd
    );
    assert.equal(releasedAfterEnd, totalAllocation);
    assert.equal(await token.balanceOf(vestingAddress), 0n);
  });
});
