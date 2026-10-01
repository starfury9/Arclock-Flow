import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ArcLock, MockUSDC } from "../typechain-types";

const DAY = 24 * 60 * 60;
const AMOUNT = ethers.parseUnits("100", 6); // 100 USDC (6 decimals)

describe("ArcLock", () => {
  let arcLock: ArcLock;
  let usdc: MockUSDC;
  let payer: HardhatEthersSigner;
  let recipient: HardhatEthersSigner;
  let verifier: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  beforeEach(async () => {
    [payer, recipient, verifier, other] = await ethers.getSigners();

    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = (await MockUSDCFactory.deploy()) as unknown as MockUSDC;
    await usdc.waitForDeployment();
    await usdc.mint(payer.address, ethers.parseUnits("1000", 6));

    const ArcLockFactory = await ethers.getContractFactory("ArcLock");
    arcLock = (await ArcLockFactory.deploy(await usdc.getAddress())) as unknown as ArcLock;
    await arcLock.waitForDeployment();
  });

  async function createCommitment(deadlineOffsetSeconds = DAY) {
    const deadline = (await ethers.provider.getBlock("latest"))!.timestamp + deadlineOffsetSeconds;
    const conditionHash = ethers.keccak256(ethers.toUtf8Bytes("website deployed + github repo"));
    const tx = await arcLock
      .connect(payer)
      .createCommitment(recipient.address, verifier.address, AMOUNT, deadline, conditionHash);
    const receipt = await tx.wait();
    const event = receipt!.logs
      .map((l) => {
        try {
          return arcLock.interface.parseLog(l as any);
        } catch {
          return null;
        }
      })
      .find((e) => e?.name === "CommitmentCreated");
    const commitmentId = event!.args.commitmentId as bigint;
    return { commitmentId, deadline, conditionHash };
  }

  it("creates a commitment in CREATED status", async () => {
    const { commitmentId } = await createCommitment();
    const c = await arcLock.getCommitment(commitmentId);
    expect(c.payer).to.equal(payer.address);
    expect(c.recipient).to.equal(recipient.address);
    expect(c.verifier).to.equal(verifier.address);
    expect(c.amount).to.equal(AMOUNT);
    expect(c.status).to.equal(0); // CREATED
  });

  it("rejects creation with zero recipient, zero verifier, zero amount, or past deadline", async () => {
    const conditionHash = ethers.keccak256(ethers.toUtf8Bytes("x"));
    const futureDeadline = (await ethers.provider.getBlock("latest"))!.timestamp + DAY;

    await expect(
      arcLock.createCommitment(ethers.ZeroAddress, verifier.address, AMOUNT, futureDeadline, conditionHash)
    ).to.be.revertedWithCustomError(arcLock, "InvalidRecipient");

    await expect(
      arcLock.createCommitment(recipient.address, ethers.ZeroAddress, AMOUNT, futureDeadline, conditionHash)
    ).to.be.revertedWithCustomError(arcLock, "InvalidVerifier");

    await expect(
      arcLock.createCommitment(recipient.address, verifier.address, 0, futureDeadline, conditionHash)
    ).to.be.revertedWithCustomError(arcLock, "InvalidAmount");

    const pastDeadline = (await ethers.provider.getBlock("latest"))!.timestamp - 1;
    await expect(
      arcLock.createCommitment(recipient.address, verifier.address, AMOUNT, pastDeadline, conditionHash)
    ).to.be.revertedWithCustomError(arcLock, "InvalidDeadline");
  });

  it("funds a commitment, pulling USDC via transferFrom", async () => {
    const { commitmentId } = await createCommitment();
    await usdc.connect(payer).approve(await arcLock.getAddress(), AMOUNT);

    await expect(arcLock.connect(payer).fundCommitment(commitmentId))
      .to.emit(arcLock, "CommitmentFunded")
      .withArgs(commitmentId, AMOUNT);

    expect(await usdc.balanceOf(await arcLock.getAddress())).to.equal(AMOUNT);
    const c = await arcLock.getCommitment(commitmentId);
    expect(c.status).to.equal(1); // FUNDED
  });

  it("only the payer can fund their commitment", async () => {
    const { commitmentId } = await createCommitment();
    await usdc.mint(other.address, AMOUNT);
    await usdc.connect(other).approve(await arcLock.getAddress(), AMOUNT);

    await expect(arcLock.connect(other).fundCommitment(commitmentId)).to.be.revertedWithCustomError(
      arcLock,
      "NotPayer"
    );
  });

  it("full happy path: fund -> evidence -> approve -> settle to recipient", async () => {
    const { commitmentId } = await createCommitment();
    await usdc.connect(payer).approve(await arcLock.getAddress(), AMOUNT);
    await arcLock.connect(payer).fundCommitment(commitmentId);

    const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("https://example.com + github.com/x/y"));
    await expect(arcLock.connect(recipient).submitEvidence(commitmentId, evidenceHash))
      .to.emit(arcLock, "EvidenceSubmitted")
      .withArgs(commitmentId, evidenceHash);

    const recipientBalanceBefore = await usdc.balanceOf(recipient.address);

    await expect(arcLock.connect(verifier).approveCommitment(commitmentId))
      .to.emit(arcLock, "FundsReleased")
      .withArgs(commitmentId, recipient.address, AMOUNT);

    const recipientBalanceAfter = await usdc.balanceOf(recipient.address);
    expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(AMOUNT);

    const c = await arcLock.getCommitment(commitmentId);
    expect(c.status).to.equal(5); // SETTLED
  });

  it("rejection path: fund -> evidence -> reject -> refund to payer", async () => {
    const { commitmentId } = await createCommitment();
    await usdc.connect(payer).approve(await arcLock.getAddress(), AMOUNT);
    await arcLock.connect(payer).fundCommitment(commitmentId);
    await arcLock.connect(recipient).submitEvidence(commitmentId, ethers.keccak256(ethers.toUtf8Bytes("bad")));

    const payerBalanceBefore = await usdc.balanceOf(payer.address);
    await expect(arcLock.connect(verifier).rejectCommitment(commitmentId))
      .to.emit(arcLock, "FundsRefunded")
      .withArgs(commitmentId, payer.address, AMOUNT);
    const payerBalanceAfter = await usdc.balanceOf(payer.address);

    expect(payerBalanceAfter - payerBalanceBefore).to.equal(AMOUNT);
    const c = await arcLock.getCommitment(commitmentId);
    expect(c.status).to.equal(6); // REFUNDED
  });

  it("only the designated verifier can approve or reject", async () => {
    const { commitmentId } = await createCommitment();
    await usdc.connect(payer).approve(await arcLock.getAddress(), AMOUNT);
    await arcLock.connect(payer).fundCommitment(commitmentId);
    await arcLock.connect(recipient).submitEvidence(commitmentId, ethers.keccak256(ethers.toUtf8Bytes("x")));

    await expect(arcLock.connect(other).approveCommitment(commitmentId)).to.be.revertedWithCustomError(
      arcLock,
      "NotVerifier"
    );
    await expect(arcLock.connect(other).rejectCommitment(commitmentId)).to.be.revertedWithCustomError(
      arcLock,
      "NotVerifier"
    );
  });

  it("expires and refunds after the deadline if never resolved", async () => {
    const { commitmentId, deadline } = await createCommitment(60); // 60s window
    await usdc.connect(payer).approve(await arcLock.getAddress(), AMOUNT);
    await arcLock.connect(payer).fundCommitment(commitmentId);

    await expect(arcLock.connect(other).expireCommitment(commitmentId)).to.be.revertedWithCustomError(
      arcLock,
      "DeadlineNotPassed"
    );

    await ethers.provider.send("evm_setNextBlockTimestamp", [deadline + 1]);
    await ethers.provider.send("evm_mine", []);

    const payerBalanceBefore = await usdc.balanceOf(payer.address);
    await expect(arcLock.connect(other).expireCommitment(commitmentId))
      .to.emit(arcLock, "FundsRefunded")
      .withArgs(commitmentId, payer.address, AMOUNT);
    const payerBalanceAfter = await usdc.balanceOf(payer.address);

    expect(payerBalanceAfter - payerBalanceBefore).to.equal(AMOUNT);
    const c = await arcLock.getCommitment(commitmentId);
    expect(c.status).to.equal(7); // EXPIRED
  });

  it("cannot submit evidence after the deadline", async () => {
    const { commitmentId, deadline } = await createCommitment(60);
    await usdc.connect(payer).approve(await arcLock.getAddress(), AMOUNT);
    await arcLock.connect(payer).fundCommitment(commitmentId);

    await ethers.provider.send("evm_setNextBlockTimestamp", [deadline + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(
      arcLock.connect(recipient).submitEvidence(commitmentId, ethers.keccak256(ethers.toUtf8Bytes("late")))
    ).to.be.revertedWithCustomError(arcLock, "DeadlinePassed");
  });
});
