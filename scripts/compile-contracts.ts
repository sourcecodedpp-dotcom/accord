import fs from "fs";
import path from "path";
// @ts-ignore
import solc from "solc";

export function compileContracts() {
  const contractsDir = path.resolve(__dirname, "../contracts");
  const artifactsDir = path.resolve(__dirname, "../src/lib/blockchain/artifacts");

  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const escrowSource = fs.readFileSync(path.join(contractsDir, "AccordEscrow.sol"), "utf8");
  const usdcSource = fs.readFileSync(path.join(contractsDir, "MockUSDC.sol"), "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "AccordEscrow.sol": { content: escrowSource },
      "MockUSDC.sol": { content: usdcSource },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode", "evm.deployedBytecode"],
        },
      },
    },
  };

  console.log("Compiling Accord Solidity contracts with solc...");
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    let hasError = false;
    for (const error of output.errors) {
      if (error.severity === "error") {
        console.error("❌ Compile error:", error.formattedMessage);
        hasError = true;
      } else {
        console.warn("⚠️ Warning:", error.formattedMessage);
      }
    }
    if (hasError) {
      throw new Error("Solidity compilation failed.");
    }
  }

  // Extract AccordEscrow
  const escrowContract = output.contracts["AccordEscrow.sol"]["AccordEscrow"];
  const escrowArtifact = {
    contractName: "AccordEscrow",
    abi: escrowContract.abi,
    bytecode: `0x${escrowContract.evm.bytecode.object}`,
    deployedBytecode: `0x${escrowContract.evm.deployedBytecode.object}`,
  };

  fs.writeFileSync(
    path.join(artifactsDir, "AccordEscrow.json"),
    JSON.stringify(escrowArtifact, null, 2)
  );
  console.log(`✅ AccordEscrow compiled successfully (${escrowArtifact.bytecode.length / 2} bytes)`);

  // Extract MockUSDC
  const usdcContract = output.contracts["MockUSDC.sol"]["MockUSDC"];
  const usdcArtifact = {
    contractName: "MockUSDC",
    abi: usdcContract.abi,
    bytecode: `0x${usdcContract.evm.bytecode.object}`,
    deployedBytecode: `0x${usdcContract.evm.deployedBytecode.object}`,
  };

  fs.writeFileSync(
    path.join(artifactsDir, "MockUSDC.json"),
    JSON.stringify(usdcArtifact, null, 2)
  );
  console.log(`✅ MockUSDC compiled successfully (${usdcArtifact.bytecode.length / 2} bytes)`);

  return { escrowArtifact, usdcArtifact };
}

if (require.main === module || process.argv[1]?.endsWith("compile-contracts.ts")) {
  compileContracts();
}
