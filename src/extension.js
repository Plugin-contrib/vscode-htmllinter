const {
  commands,
  workspace,
  window,
  Diagnostic,
  languages,
  DiagnosticSeverity,
} = require('vscode')
const { run } = require('@htmllinter/core')

const displayName = 'htmllinter'
const htmlLanguageId = 'html'
let outputChannel = null
let diagnosticCollection = null
let cache = {}

const clearCache = () => {
  cache = null
}

const clearOutputChannel = () => {
  outputChannel = null
}

const errorMap = {
  error: DiagnosticSeverity.Error,
  warn: DiagnosticSeverity.Warning,
}

const htmllinterConfig = {
  extend: require('@htmllinter/basic-config'),
}

function outputLine(message, show) {
  const datePrefix = '[' + new Date().toLocaleTimeString() + '] '
  outputChannel.appendLine(datePrefix + message)
  if (show) {
    outputChannel.show()
  }
}

const lint = async (document) => {
  // const name = document.uri.toString()
  const html = document.getText()
  const op = await run(html, htmllinterConfig)
  const diagnostics = []
  op.forEach((res) => {
    const { message, node, ruleName, type } = res
    const {
      location: { line, col },
    } = node
    let range = document.lineAt(line - 1).range
    const messageToShow = `htmllinter/${ruleName}: ${message} [${line}:${col}]`
    const diagnostic = new Diagnostic(range, messageToShow, errorMap[type])
    outputLine(messageToShow, true)
    diagnostic.code = ruleName
    diagnostic.source = displayName
    diagnostics.push(diagnostic)
  })
  diagnosticCollection.set(document.uri, diagnostics)
  // outputLine(JSON.stringify(op), true)
  // window.showInformationMessage(op)
}

// TODO
const getConf = (document) => {
  const name = document.fileName

  //  TEMP : REMOVE IT. just for testing purpose
  cache = {}

  if (cache[name]) {
    return cache[name]
  }

  const configuration = workspace.getConfiguration(displayName)
  cache[name] = configuration.get('rules')

  outputLine(
    'INFO: Linting for "' +
      document.fileName +
      '" will be run "' +
      cache[name] +
      '".'
  )
  return cache[name]
}

const handleTextChange = (document) => {
  handleTextSave(document)
}

const handleTextClose = (document) => {
  clearOutputChannel()
  clearCache()
  diagnosticCollection.delete(document.uri)
}

const handleTextEditorVisbibleChange = (textEditors) => {
  textEditors.forEach((textEditor) => lint(textEditor.document))
}

const handleTextSave = (document) => {
  if (document.languageId === htmlLanguageId) {
    lint(document)
  }
}

function activate(context) {
  outputChannel = window.createOutputChannel(displayName)
  context.subscriptions.push(outputChannel)

  context.subscriptions.push(
    window.onDidChangeVisibleTextEditors(handleTextEditorVisbibleChange),
    workspace.onDidChangeTextDocument(handleTextChange),
    workspace.onDidSaveTextDocument(handleTextSave),
    workspace.onDidCloseTextDocument(handleTextClose)
    // TODO
    //   vscode.workspace.onDidChangeConfiguration(didChangeConfiguration)
  )

  diagnosticCollection = languages.createDiagnosticCollection(displayName)
  context.subscriptions.push(diagnosticCollection)
}
exports.activate = activate

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
}
