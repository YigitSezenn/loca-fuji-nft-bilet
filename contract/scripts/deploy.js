const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("PRIVATE_KEY yok. contract/.env dosyasina ekle. Anahtar uretilmez.");
  }

  console.log("Deployer:", deployer.address);

  const block = await hre.ethers.provider.getBlock("latest");
  const base = block && block.baseFeePerGas ? block.baseFeePerGas : 1n;
  const gasPrice = base * 2n;

  const factory = await hre.ethers.getContractFactory("Tribun");
  const tribun = await factory.deploy({ gasPrice });
  await tribun.waitForDeployment();
  const address = await tribun.getAddress();

  console.log("Deployer:", deployer.address);
  console.log("Tribun:", address);
  console.log("Snowtrace: https://testnet.snowtrace.io/address/" + address);

  const envPath = path.join(__dirname, "..", "..", "web", ".env");
  const line = `VITE_CONTRACT_ADDRESS=${address}\n`;
  fs.writeFileSync(envPath, line);
  console.log("Yazildi:", envPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
