'use strict';

const path = require('node:path');
const { runTests } = require('@vscode/test-electron');

async function main() {
  const binary = process.env.JIANG_LSP_BIN;
  if (!binary || !path.isAbsolute(binary)) {
    throw new Error('JIANG_LSP_BIN must be an absolute path to the current Jiang build');
  }
  await runTests({
    vscodeExecutablePath: process.env.JIANG_VSCODE_BIN || '/Applications/Visual Studio Code.app/Contents/MacOS/Code',
    extensionDevelopmentPath: path.resolve(__dirname, '..'),
    extensionTestsPath: path.resolve(__dirname, 'integration.js'),
    extensionTestsEnv: { JIANG_LSP_BIN: binary },
    launchArgs: [path.resolve(__dirname, '..', 'examples', 'demo.code-workspace'), '--disable-extensions', '--skip-welcome', '--skip-release-notes'],
  });
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
