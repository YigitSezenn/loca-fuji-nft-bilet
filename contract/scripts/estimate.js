const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const factory = await hre.ethers.getContractFactory("Tribun");
  const unsigned = await factory.getDeployTransaction();
  const gas = await deployer.estimateGas(unsigned);
  const fee = await hre.ethers.provider.getFeeData();
  const price = fee.gasPrice ?? 0n;
  const cost = gas * price;
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("gas", gas.toString());
  console.log("cost", hre.ethers.formatEther(cost));
  console.log("balance", hre.ethers.formatEther(balance));
  console.log(balance > cost ? "FITS" : "SHORT");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
