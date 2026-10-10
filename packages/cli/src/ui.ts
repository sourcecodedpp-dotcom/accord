// High-end CLI UI utilities for Accord Protocol
export const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",

  // Foreground colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",

  // Bright / High-contrast
  brightWhite: "\x1b[97m",
  brightCyan: "\x1b[96m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightMagenta: "\x1b[95m",

  // Background badges
  bgBlack: "\x1b[40m",
  bgCyan: "\x1b[46m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgDark: "\x1b[100m",
};

export function badge(text: string, color: string = c.bgCyan + c.black): string {
  return `${color} ${text} ${c.reset}`;
}

export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

export function printBanner(): void {
  console.log(`
${c.brightCyan}  █████╗  ██████╗ ██████╗  ██████╗ ██████╗ ██████╗ 
 ██╔══██╗██╔════╝██╔════╝ ██╔═══██╗██╔══██╗██╔══██╗
 ███████║██║     ██║     ██║   ██║██████╔╝██║  ██║
 ██╔══██║██║     ██║     ██║   ██║██╔══██╗██║  ██║
 ██║  ██║╚██████╗╚██████╗╚██████╔╝██║  ██║██████╔╝
 ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ ${c.reset}
  ${c.dim}Autonomous Agent Economic Protocol • Base Sepolia (Chain ID 84532)${c.reset}
`);
}

export interface BoxOptions {
  width?: number;
  borderColor?: string;
  paddingY?: number;
}

export function box(title: string, lines: string[], options: BoxOptions = {}): void {
  const width = options.width || 76;
  const borderCol = options.borderColor || c.gray;

  // Modern rounded box characters
  const topLeft = "╭";
  const topRight = "╮";
  const bottomLeft = "╰";
  const bottomRight = "╯";
  const horiz = "─";
  const vert = "│";

  let headerBar = "";
  if (title) {
    const titleText = ` ${c.bold}${c.brightWhite}${title}${c.reset} `;
    const strippedTitleLen = stripAnsi(titleText).length;
    const remainingBorder = Math.max(0, width - 3 - strippedTitleLen);
    headerBar = `${borderCol}${topLeft}${horiz} ${c.reset}${titleText}${borderCol}${horiz.repeat(remainingBorder)}${topRight}${c.reset}`;
  } else {
    headerBar = `${borderCol}${topLeft}${horiz.repeat(width - 2)}${topRight}${c.reset}`;
  }

  const footerBar = `${borderCol}${bottomLeft}${horiz.repeat(width - 2)}${bottomRight}${c.reset}`;

  console.log(headerBar);

  if (options.paddingY) {
    for (let p = 0; p < options.paddingY; p++) {
      console.log(`${borderCol}${vert}${c.reset}${" ".repeat(width - 2)}${borderCol}${vert}${c.reset}`);
    }
  }

  for (const line of lines) {
    const visualLen = stripAnsi(line).length;
    const fillSpace = Math.max(0, width - 4 - visualLen);
    console.log(`${borderCol}${vert}${c.reset}  ${line}${" ".repeat(fillSpace)}${borderCol}${vert}${c.reset}`);
  }

  if (options.paddingY) {
    for (let p = 0; p < options.paddingY; p++) {
      console.log(`${borderCol}${vert}${c.reset}${" ".repeat(width - 2)}${borderCol}${vert}${c.reset}`);
    }
  }

  console.log(footerBar);
}

export function keyVal(key: string, val: string | number, pad = 24): string {
  return `${c.dim}${key.padEnd(pad)}${c.reset} ${c.bold}${c.white}${val}${c.reset}`;
}

export function progressBar(current: number, total: number, width = 12): string {
  const percent = Math.min(1, Math.max(0, current / total));
  const filled = Math.round(width * percent);
  const empty = width - filled;
  return `${c.brightCyan}[${"■".repeat(filled)}${" ".repeat(empty)}]${c.reset} ${c.dim}${Math.round(percent * 100)}%${c.reset}`;
}
