import assert from "node:assert/strict";
import { network } from "hardhat";

const { ethers } = await network.connect("hardhat");

describe("KingPulseMigrationToken", function () {
  let owner;
  let user;
  let treasury;
  let token;
  let cap;

  beforeEach(async function () {
    [owner, user, treasury] = await ethers.getSigners();
    cap = ethers.parseUnits("27510", 18);

    const factory = await ethers.getContractFactory("KingPulseMigrationToken");
    token = await factory.deploy(owner.address, cap);
    await token.waitForDeployment();
  });

  it("deploys with zero supply, a cap, and the configured owner", async function () {
    assert.equal(await token.name(), "KingPulse");
    assert.equal(await token.symbol(), "KPL");
    assert.equal(await token.decimals(), 18n);
    assert.equal(await token.totalSupply(), 0n);
    assert.equal(await token.maxSupply(), cap);
    assert.equal(await token.owner(), owner.address);
    assert.equal(await token.migrationFinalized(), false);
  });

  it("allows owner minting and batch minting while migration is open", async function () {
    const mintAmount = ethers.parseUnits("100", 18);
    const batchAmounts = [
      ethers.parseUnits("50", 18),
      ethers.parseUnits("25", 18),
    ];

    await token.mint(user.address, mintAmount);
    await token.mintBatch([owner.address, treasury.address], batchAmounts);

    assert.equal(await token.balanceOf(user.address), mintAmount);
    assert.equal(await token.balanceOf(owner.address), batchAmounts[0]);
    assert.equal(await token.balanceOf(treasury.address), batchAmounts[1]);
    assert.equal(
      await token.totalSupply(),
      mintAmount + batchAmounts[0] + batchAmounts[1]
    );
  });

  it("blocks non-owner minting and cap overruns", async function () {
    await assert.rejects(
      token.connect(user).mint(user.address, 1n),
      /OwnableUnauthorizedAccount/
    );

    await assert.rejects(
      token.mint(user.address, cap + 1n),
      /CapExceeded/
    );

    await token.mint(user.address, cap);

    await assert.rejects(
      token.mint(user.address, 1n),
      /CapExceeded/
    );
  });

  it("finalizes migration minting irreversibly", async function () {
    await token.finalizeMigration();

    assert.equal(await token.migrationFinalized(), true);

    await assert.rejects(
      token.mint(user.address, 1n),
      /MigrationAlreadyFinalized/
    );

    await assert.rejects(
      token.mintBatch([user.address], [1n]),
      /MigrationAlreadyFinalized/
    );

    await assert.rejects(
      token.finalizeMigration(),
      /MigrationAlreadyFinalized/
    );
  });

  it("recovers contract-held balance even while paused", async function () {
    const amount = ethers.parseUnits("10", 18);
    const tokenAddress = await token.getAddress();

    await token.mint(owner.address, amount);
    await token.transfer(tokenAddress, amount);
    await token.pause();
    await token.recoverContractBalance(user.address, amount);

    assert.equal(await token.balanceOf(tokenAddress), 0n);
    assert.equal(await token.balanceOf(user.address), amount);
  });

  it("burns contract-held balance", async function () {
    const amount = ethers.parseUnits("8", 18);
    const tokenAddress = await token.getAddress();

    await token.mint(owner.address, amount);
    await token.transfer(tokenAddress, amount);

    const initialSupply = await token.totalSupply();

    await token.burnContractBalance(amount);

    assert.equal(await token.balanceOf(tokenAddress), 0n);
    assert.equal(await token.totalSupply(), initialSupply - amount);
  });
});
