const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function activate(context) {
	const { commands, window } = vscode;

	const regexReplacements = [
		{
			"title": "消息替换",
			"replacements": [
				{
					"regex": /<IMG:(.*?):(.*?):(.*?):(.*?)>/gi,
					"replacement": "{F=$2;I=$1;X=$3;X=$4}",
					"pararms": [
						{
							"replaceId": 2,
							"item": {
								"18": {
									"operation": "=",
									"value": "images.wil",
									"chidPararms": [
										{
											"replaceId": 1,
											"operation": "+",
											"value": 1500
										}
									]
								}
							}
						}
					]
				}
			]
		}
	];
	const workspacePath = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
	regexReplacements.forEach((rule, index) => {
		const command = commands.registerCommand(`extension.regexReplace${index + 1}`, async () => {
			const editor = window.activeTextEditor;
			if (editor) {
				const document = editor.document;
				let text = document.getText();

				let file_replacements;
				try {
					let fileRegexPth = path.join(workspacePath, 'commandsRegex.json');

					// 检查文件fileRegexPth是否存在
					if (fs.existsSync(fileRegexPth)) {
						file_replacements = JSON.parse(fs.readFileSync(fileRegexPth, 'utf-8'));
						// 检查当前index的规则是否存在
						if (file_replacements[index]) {
							rule.replacements = file_replacements[index].replacements.map(({ regex, replacement, pararms }) => {
								// Remove the leading and trailing slashes and split into pattern and flags
								const [pattern, flags] = regex.toString().slice(1, -1).split('/');
								return {
									regex: new RegExp(pattern, flags),
									replacement,
									pararms
								};
							});
						}
					}
				} catch (err) {
					console.error('Failed to load or parse commandsRegex.json:', err);
					file_replacements = [];
				}

				rule.replacements.forEach(({ regex, replacement, pararms }) => {
					const replacementMap = {};
					if (pararms) {
						pararms.forEach(({ replaceId, item }) => {
							replacementMap[replaceId] = item;
						});
					}
					text = text.replace(regex, (...args) => {
						let replaced = replacement;
						Object.entries(replacementMap).forEach(([replaceId, item]) => {
							let replaceData = args[parseInt(replaceId)];
							if (item.hasOwnProperty(replaceData)) {
								replaced = replaced.replace(new RegExp(`\\$${replaceId}`, 'g'), item[replaceData].value);
							}
							replaced = replaced.replace(new RegExp(`\\$${replaceId}`, 'g'), replaceData);
						});
						return replaced;
					});
				});
				

				const all = new vscode.Range(
					document.positionAt(0),
					document.positionAt(text.length)
				);

				editor.edit((editBuilder) => {
					editBuilder.replace(all, text);
				});
			}
		});
		context.subscriptions.push(command);
	});
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
};
