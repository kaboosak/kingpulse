const assert = require("node:assert/strict");
const { ethers } = require("hardhat");

describe("KingPulse", function () {
  let owner;
  let user;
  let spender;
  let token;

  beforeEach(async function () {
    [owner, user, spender] = await ethers.getSigners();

    const kingPulseFactory = await ethers.getContractFactory("KingPulse");
    token = await kingPulseFactory.deploy();
    await token.waitForDeployment();
  });

  it("mints the initial supply to the deployer", async function () {
    const expectedSupply = ethers.parseUnits("1000000", 18);

    assert.equal(await token.name(), "KingPulse");
    assert.equal(await token.symbol(), "KPL");
    assert.equal(await token.decimals(), 18n);
    assert.equal(await token.totalSupply(), expectedSupply);
    assert.equal(await token.balanceOf(owner.address), expectedSupply);
    assert.equal(await token.owner(), owner.address);
  });

  it("allows only the owner to mint", async function () {
    const amount = ethers.parseUnits("500", 18);

    await assert.doesNotReject(token.mint(user.address, amount));
    assert.equal(await token.balanceOf(user.address), amount);

    await assert.rejects(
      token.connect(user).mint(user.address, amount),
      /OwnableUnauthorizedAccount/
    );
  });

  it("allows holders to burn their own tokens", async function () {
    const amount = ethers.parseUnits("250", 18);
    const initialSupply = await token.totalSupply();

    await token.transfer(user.address, amount);
    await token.connect(user).burn(amount);

    assert.equal(await token.balanceOf(user.address), 0n);
    assert.equal(await token.totalSupply(), initialSupply - amount);
  });

  it("allows approved callers to burn from another account", async function () {
    const amount = ethers.parseUnits("100", 18);

    await token.transfer(user.address, amount);
    await token.connect(user).approve(spender.address, amount);
    await token.connect(spender).burnFrom(user.address, amount);

    assert.equal(await token.balanceOf(user.address), 0n);
  });

  it("blocks transfers while paused and restores them after unpause", async function () {
    const amount = ethers.parseUnits("10", 18);

    await token.pause();

    await assert.rejects(
      token.transfer(user.address, amount),
      /EnforcedPause/
    );

    await assert.doesNotReject(token.mint(user.address, amount));
    await assert.doesNotReject(token.connect(user).burn(amount));

    await token.unpause();
    await assert.doesNotReject(token.transfer(user.address, amount));
  });

  it("supports EIP-2612 permit approvals", async function () {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const nonce = await token.nonces(owner.address);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const value = ethers.parseUnits("42", 18);

    const domain = {
      name: "KingPulse",
      version: "1",
      chainId,
      verifyingContract: await token.getAddress(),
    };

    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const signature = await owner.signTypedData(domain, types, {
      owner: owner.address,
      spender: spender.address,
      value,
      nonce,
      deadline,
    });

    const { v, r, s } = ethers.Signature.from(signature);

    await token.permit(owner.address, spender.address, value, deadline, v, r, s);

    assert.equal(await token.allowance(owner.address, spender.address), value);
  });
});
