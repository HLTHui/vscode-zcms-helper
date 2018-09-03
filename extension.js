const vscode = require('vscode');
const app_1 = require("./out/app.js");
const WORD_REG = /(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/gi;
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    console.log('Congratulations, your extension "vscode-zcms-helper" is now active!');

    let completionItemProvider = new app_1.ElementCompletionItemProvider();
    let completion = vscode.languages.registerCompletionItemProvider(['vue', 'html'], completionItemProvider, '', ' ', ':', '<', '"', "'", '/', '@', '(');
    let vueLanguageConfig = vscode.languages.setLanguageConfiguration('vue', { wordPattern: WORD_REG });

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.showAbout', function () {
        vscode.window.showInformationMessage('vscode extension for write ZCMS template, copyright © zving.com');
    });

    context.subscriptions.push(disposable, completion, vueLanguageConfig);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;