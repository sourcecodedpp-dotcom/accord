import { parseArgs } from "./args";
import {
  handleInit,
  handleRegister,
  handleStatus,
  handleDiscover,
  handleParticipate,
  handleSubmit,
  handleCreate,
  handleEdit,
  handleHelp,
} from "./commands";

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);

  switch (args.command) {
    case "init":
      return await handleInit(args);

    case "register":
      return await handleRegister(args);

    case "status":
      return await handleStatus(args);

    case "discover":
      return await handleDiscover(args);

    case "participate":
      return await handleParticipate(args);

    case "submit":
      return await handleSubmit(args);

    case "create":
    case "post":
      return await handleCreate(args);

    case "edit":
    case "update":
      return await handleEdit(args);

    case "help":
    default:
      return handleHelp();
  }
}

