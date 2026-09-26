'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const vscode = require('vscode');

async function until(check, timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await check();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for LSP diagnostics');
}

function diagnosticsFor(uri) {
  const entry = vscode.languages.getDiagnostics().find(([candidate]) => candidate.toString() === uri.toString());
  return entry?.[1] || [];
}

async function run() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'jiang-vscode-lsp-'));
  const cliDirectory = path.join(directory, 'bin');
  fs.mkdirSync(cliDirectory);
  fs.symlinkSync(process.env.JIANG_LSP_BIN, path.join(cliDirectory, 'jiang'));
  const file = path.join(directory, 'main.jiang');
  const preview = path.join(directory, 'preview.txt');
  const invalid = 'Int value() { 1 }\nInt main() { missing }\n';
  const valid = 'Int value() { 1 }\nInt main() { value() }\n';
  fs.writeFileSync(file, invalid);
  fs.writeFileSync(preview, 'Jiang LSP integration');
  try {
    await vscode.workspace.getConfiguration('jiang').update(
      'serverPath', cliDirectory, vscode.ConfigurationTarget.Global,
    );
    const extension = vscode.extensions.all.find(item => item.packageJSON.name === 'vscode-jiang');
    assert.ok(extension);
    assert.ok(vscode.workspace.workspaceFolders?.some(folder => folder.uri.fsPath === path.resolve(__dirname, '..')));
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(vscode.Uri.file(preview)));
    const activationStart = performance.now();
    await extension.activate();
    assert.ok(performance.now() - activationStart < 9000, 'extension activation waited for the language server');
    const uri = vscode.Uri.file(file);
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
    assert.equal(document.languageId, 'jiang');
    assert.equal(vscode.workspace.getConfiguration('jiang', uri).get('serverPath'), cliDirectory);
    await until(() => diagnosticsFor(uri).length > 0);

    async function replaceText(text, hasDiagnostics) {
      const previousVersion = document.version;
      const edit = new vscode.WorkspaceEdit();
      edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), text);
      const start = performance.now();
      assert.equal(await vscode.workspace.applyEdit(edit), true);
      assert.equal(document.getText(), text);
      await until(() => document.version > previousVersion && (diagnosticsFor(uri).length > 0) === hasDiagnostics);
      return Math.round(performance.now() - start);
    }

    const clearMs = await replaceText(valid, false);
    const introduceMs = await replaceText(invalid, true);
    const clearAgainMs = await replaceText(valid, false);

    const position = new vscode.Position(1, 14);
    const definitions = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', uri, position);
    assert.equal(definitions.length, 1);
    assert.equal(definitions[0].uri.toString(), uri.toString());
    assert.equal(definitions[0].range.start.line, 0);
    assert.equal(definitions[0].range.start.character, 4);

    const completions = await vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider', uri, new vscode.Position(1, 16),
    );
    const valueCompletion = completions.items.find(item => item.label === 'value');
    assert.ok(valueCompletion);
    assert.equal(valueCompletion.kind, vscode.CompletionItemKind.Function);
    assert.equal(valueCompletion.detail, 'Int value()');

    const incomplete = 'Int value() { 1 }\nInt main() { Int chosen = val\n return 0; }\n';
    await replaceText(incomplete, true);
    const unfinishedPosition = document.positionAt(incomplete.lastIndexOf('val') + 3);
    const unfinishedCompletions = await vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider', uri, unfinishedPosition,
    );
    assert.ok(unfinishedCompletions.items.some(item => item.label === 'value'));
    await replaceText(valid, false);

    const memberSource = 'struct User { Int id; Bool active = true; public Int score(self) { 1 } }\n'
      + 'extend User { public Int extra(self) { 2 } }\n'
      + 'Int main() { User user = User(id = 1); user.\nInt after = 1; return after; }\n';
    await replaceText(memberSource, true);
    const memberPosition = document.positionAt(memberSource.indexOf('user.') + 'user.'.length);
    const memberCompletions = await vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider', uri, memberPosition,
    );
    assert.ok(['id', 'active', 'score', 'extra']
      .every(name => memberCompletions.items.some(item => item.label === name)));

    fs.writeFileSync(path.join(directory, 'helper.jiang'),
      'public Int answer() { 1 }\nInt hidden() { 2 }\n');
    const namespaceSource = 'alias helper = import "./helper.jiang";\n'
      + 'Int main() { helper.\nInt after = 1; return after; }\n';
    await replaceText(namespaceSource, true);
    const namespacePosition = document.positionAt(namespaceSource.indexOf('helper.') + 'helper.'.length);
    const namespaceCompletions = await vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider', uri, namespacePosition,
    );
    assert.ok(namespaceCompletions.items.some(item => item.label === 'answer'));
    assert.ok(!namespaceCompletions.items.some(item => item.label === 'hidden'));

    const enumSource = 'enum Result { ok(Int), err(Int), }\n'
      + 'Int main() { Result second = .;\nInt after = 1; return after; }\n';
    await replaceText(enumSource, true);
    const enumPosition = document.positionAt(enumSource.indexOf('Result second = .') + 'Result second = .'.length);
    const enumCompletions = await vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider', uri, enumPosition,
    );
    assert.deepEqual(
      ['ok', 'err'].filter(name => enumCompletions.items.some(item => item.label === name)),
      ['ok', 'err'],
    );
    assert.ok(enumCompletions.items.filter(item => ['ok', 'err'].includes(item.label))
      .every(item => item.kind === vscode.CompletionItemKind.EnumMember));
    await replaceText(valid, false);

    const examples = path.resolve(__dirname, '..', 'examples');
    const demoUri = vscode.Uri.file(path.join(examples, 'demo.jiang'));
    const helperUri = vscode.Uri.file(path.join(examples, 'helper.jiang'));
    const demo = await vscode.workspace.openTextDocument(demoUri);
    await vscode.window.showTextDocument(demo);
    const userDeclaration = demo.getText().indexOf('User user');
    assert.ok(userDeclaration >= 0);
    const userHover = await until(async () => {
      const hovers = await vscode.commands.executeCommand(
        'vscode.executeHoverProvider', demoUri, demo.positionAt(userDeclaration + 'User '.length + 1),
      );
      return hovers.find(hover => hover.contents.length > 0);
    });
    assert.ok(userHover);
    const call = demo.getText().indexOf('helper.answer()');
    assert.ok(call >= 0);
    const answerPosition = demo.positionAt(call + 'helper.'.length + 1);
    const importedDefinition = await until(async () => {
      const locations = await vscode.commands.executeCommand(
        'vscode.executeDefinitionProvider', demoUri, answerPosition,
      );
      return locations.length === 1 ? locations[0] : null;
    });
    assert.equal(importedDefinition.uri.toString(), helperUri.toString());
    assert.equal(importedDefinition.range.start.line, 2);
    assert.equal(importedDefinition.range.start.character, 11);
    const answerHover = await vscode.commands.executeCommand(
      'vscode.executeHoverProvider', demoUri, answerPosition,
    );
    assert.ok(answerHover.some(hover => hover.contents.length > 0));
    assert.deepEqual(diagnosticsFor(demoUri), []);

    const helper = await vscode.workspace.openTextDocument(helperUri);
    await vscode.window.showTextDocument(helper);
    const originalHelper = helper.getText();
    const brokenHelper = originalHelper.replace('answer', 'wrong');
    assert.notEqual(originalHelper, brokenHelper);

    async function replaceHelper(text) {
      const edit = new vscode.WorkspaceEdit();
      edit.replace(helperUri, new vscode.Range(helper.positionAt(0), helper.positionAt(helper.getText().length)), text);
      assert.equal(await vscode.workspace.applyEdit(edit), true);
    }

    await replaceHelper(brokenHelper);
    await until(() => diagnosticsFor(demoUri).some(item => item.code === 'unresolved_value'));
    await replaceHelper(originalHelper);
    await until(() => diagnosticsFor(demoUri).length === 0);
    const restoredDefinition = await vscode.commands.executeCommand(
      'vscode.executeDefinitionProvider', demoUri, answerPosition,
    );
    assert.equal(restoredDefinition.length, 1);
    assert.equal(restoredDefinition[0].uri.toString(), helperUri.toString());
    console.log(`PASS VS Code LSP integration; diagnostic updates ${clearMs}/${introduceMs}/${clearAgainMs} ms; cross-file import verified`);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

module.exports = { run };
