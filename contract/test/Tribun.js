const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Tribun", function () {
  async function deploy() {
    const factory = await ethers.getContractFactory("Tribun");
    const tribun = await factory.deploy();
    await tribun.waitForDeployment();
    return tribun;
  }

  async function claim(tribun, signer, eventId) {
    const price = await tribun.PRICE();
    return tribun.connect(signer).claim(eventId, { value: price });
  }

  it("sekiz etkinligi sabitler", async function () {
    const tribun = await deploy();
    expect(await tribun.eventCount()).to.equal(8n);

    const fest = await tribun.eventInfo(0);
    expect(fest.name).to.equal("Hep Yeni Kal Fest");
    expect(fest.whenLabel).to.equal("2 Ekim 2026");
    expect(fest.supply).to.equal(120);
    expect(fest.issued).to.equal(0);

    const konser = await tribun.eventInfo(1);
    expect(konser.name).to.equal("Amr Diab");
    expect(konser.supply).to.equal(50);

    const son = await tribun.eventInfo(7);
    expect(son.name).to.equal("Mario Frangoulis");
    expect(son.supply).to.equal(40);
  });

  it("claim bileti cuzdan sahibine yazar", async function () {
    const tribun = await deploy();
    const [alice] = await ethers.getSigners();

    await claim(tribun, alice, 0);
    const ids = await tribun.ticketsOf(alice.address);
    expect(ids.length).to.equal(1);
    expect(ids[0]).to.be.gte(1_000_000_000n);
    expect(ids[0]).to.be.lt(10_000_000_000n);

    const [valid, eventId, owner] = await tribun.verify(ids[0]);
    expect(valid).to.equal(true);
    expect(eventId).to.equal(0n);
    expect(owner).to.equal(alice.address);

    const fest = await tribun.eventInfo(0);
    expect(fest.issued).to.equal(1);
  });

  it("ayni cuzdan ikinci kez claim edemez", async function () {
    const tribun = await deploy();
    const [alice] = await ethers.getSigners();
    await claim(tribun, alice, 0);
    await expect(claim(tribun, alice, 0)).to.be.revertedWith("already");
  });

  it("olmayan bilet gecersizdir", async function () {
    const tribun = await deploy();
    const [valid, eventId, owner] = await tribun.verify(999);
    expect(valid).to.equal(false);
    expect(eventId).to.equal(0n);
    expect(owner).to.equal(ethers.ZeroAddress);
  });

  it("kontenjan dolunca claim reddedilir", async function () {
    const tribun = await deploy();
    const signers = await ethers.getSigners();
    expect(signers.length).to.be.greaterThan(50);

    for (let i = 0; i < 50; i++) {
      await claim(tribun, signers[i], 1);
    }

    const konser = await tribun.eventInfo(1);
    expect(konser.issued).to.equal(50);
    await expect(claim(tribun, signers[50], 1)).to.be.revertedWith("sold out");
  });

  it("iade kontenjani geri acar", async function () {
    const tribun = await deploy();
    const [alice, bob] = await ethers.getSigners();
    await claim(tribun, alice, 0);
    const id = (await tribun.ticketsOf(alice.address))[0];

    await expect(tribun.connect(bob).refund(id)).to.be.revertedWith("owner");
    await tribun.connect(alice).refund(id);

    const [valid] = await tribun.verify(id);
    expect(valid).to.equal(false);
    expect((await tribun.ticketsOf(alice.address)).length).to.equal(0);
    expect((await tribun.eventInfo(0)).issued).to.equal(0);
    await claim(tribun, alice, 0);
    expect((await tribun.eventInfo(0)).issued).to.equal(1);
  });

  it("bakiye bilet tutari kadar duser, iade geri yazar", async function () {
    const tribun = await deploy();
    const [alice] = await ethers.getSigners();
    const price = await tribun.PRICE();
    expect(price).to.equal(ethers.parseEther("0.0002"));

    const before = await ethers.provider.getBalance(alice.address);
    const bought = await claim(tribun, alice, 2);
    const buyReceipt = await bought.wait();
    const afterBuy = await ethers.provider.getBalance(alice.address);
    const buyGas = buyReceipt.gasUsed * buyReceipt.gasPrice;
    expect(before - afterBuy).to.equal(price + buyGas);

    const id = (await tribun.ticketsOf(alice.address))[0];
    const mid = await ethers.provider.getBalance(alice.address);
    const returned = await tribun.connect(alice).refund(id);
    const refundReceipt = await returned.wait();
    const afterRefund = await ethers.provider.getBalance(alice.address);
    const refundGas = refundReceipt.gasUsed * refundReceipt.gasPrice;
    expect(afterRefund - mid).to.equal(price - refundGas);
    expect((await tribun.eventInfo(2)).issued).to.equal(0);
  });

  it("eksik tutar reddedilir", async function () {
    const tribun = await deploy();
    const [alice] = await ethers.getSigners();
    await expect(tribun.connect(alice).claim(0, { value: 1n })).to.be.revertedWith("price");
  });

  it("olmayan etkinlik reddedilir", async function () {
    const tribun = await deploy();
    const [alice] = await ethers.getSigners();
    await expect(claim(tribun, alice, 20)).to.be.revertedWith("event");
  });

  it("bilet baska adrese devredilir", async function () {
    const tribun = await deploy();
    const [alice, bob] = await ethers.getSigners();
    await claim(tribun, alice, 0);
    const id = (await tribun.ticketsOf(alice.address))[0];

    await tribun.connect(alice).transferFrom(alice.address, bob.address, id);

    expect(await tribun.ownerOf(id)).to.equal(bob.address);
    expect(await tribun.balanceOf(alice.address)).to.equal(0n);
    expect(await tribun.balanceOf(bob.address)).to.equal(1n);
    expect(await tribun.supportsInterface("0x80ac58cd")).to.equal(true);
    expect(await tribun.name()).to.equal("Loca");

    await expect(tribun.connect(bob).refund(id)).to.be.revertedWith("handed");
    await expect(tribun.connect(alice).transferFrom(alice.address, bob.address, id)).to.be.revertedWith("owner");
    await claim(tribun, alice, 0);
    await expect(tribun.connect(bob).transferFrom(bob.address, alice.address, id)).to.be.revertedWith("taken");
  });
});
