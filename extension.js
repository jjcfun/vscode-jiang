'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vscode = require('vscode');
const { LanguageClient } = require('vscode-languageclient/node');

let client;

function executablePath(configured) {
  if (configured !== 'jiang') {
    const selected = path.resolve(configured);
    if (fs.existsSync(selected) && fs.statSync(selected).isDirectory()) {
      return path.join(selected, 'jiang');
    }
    return configured;
  }
  return configured;
}

function resourceRoot(command) {
  const candidates = path.isAbsolute(command) || command.includes(path.sep)
    ? [command]
    : (process.env.PATH || '').split(path.delimiter).map(directory => path.join(directory, command));
  const executable = candidates.find(candidate => fs.existsSync(candidate));
  if (!executable) return undefined;
  let directory = path.dirname(fs.realpathSync(executable));
  while (true) {
    if (fs.existsSync(path.join(directory, 'src', 'std', 'package.jiang'))
      && fs.existsSync(path.join(directory, 'src', 'compiler', 'core.jiang'))) {
      return directory;
    }
    const parent = path.dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

function activate() {
  const resource = vscode.window.activeTextEditor?.document.uri
    || vscode.workspace.textDocuments.find(document => document.languageId === 'jiang')?.uri
    || vscode.workspace.workspaceFolders?.[0]?.uri;
  const settings = vscode.workspace.getConfiguration('jiang', resource);
  const command = executablePath(settings.get('serverPath', 'jiang'));
  const root = resourceRoot(command);
  const options = root ? { cwd: root, env: { ...process.env, PWD: root } } : undefined;
  const serverOptions = { command, args: ['lsp'], options };
  const clientOptions = {
    documentSelector: [{ scheme: 'file', language: 'jiang' }],
  };
  client = new LanguageClient('jiang', 'Jiang Language Server', serverOptions, clientOptions);
  client.outputChannel.appendLine(`Starting ${command} lsp (resource root: ${root || 'not found'})`);
  void client.start().catch(error => {
    vscode.window.showErrorMessage(`Jiang language server failed to start: ${error.message}`);
  });
}

function deactivate() {
  return client?.stop();
}

module.exports = { activate, deactivate };
