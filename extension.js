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
					"regex": "/<IMG:(.*?):(.*?):(.*?):(.*?)>/gi",
					"replacement": "{F=$2;I=$1;X=$3;X=$4}",
					"pararms": [
						{
							"replaceId": 2,
							"operation": "=",
							"item": {
								"18": {
									"value": "images.wil",
									"chidPararms": [{
										"replaceId":1,
										"operation": "+",
										"value":1500
									}]
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
						pararms.forEach(({ replaceId, operation, item }) => {
							if (typeof item === 'object' && item !== null) {
								if (item.hasOwnProperty(replaceId)) {
									const { value, chidPararms } = item[replaceId];
									if (chidPararms) {
										chidPararms.forEach(({ replaceId: childReplaceId, operation: childOperation, value: childValue }) => {
											if (childOperation === '+') {
												replacementMap[childReplaceId] = [childOperation, childValue];
											} else if (childOperation === '=') {
												replacementMap[childReplaceId] = childValue;
											}
										});
									} else {
										replacementMap[replaceId] = value;
									}
								}
							} else {
								replacementMap[replaceId] = [operation, item];
							}
						});
					}
                    text = text.replace(regex, (match, ...args) => {
                        let replaced = replacement;
                        Object.entries(replacementMap).forEach(([replaceId, [operation, item]]) => {
                            if (args[parseInt(replaceId) - 1] && operation === '=') {
                                replaced = replaced.replace(new RegExp(`\\$${replaceId}`, 'g'), item[args[parseInt(replaceId) - 1]] || args[parseInt(replaceId) - 1]);
                            } else if (args[parseInt(replaceId) - 1] && operation === '+') {
                                replaced = replaced.replace(new RegExp(`\\$${replaceId}`, 'g'), (parseInt(args[parseInt(replaceId) - 1]) + parseInt(item)).toString());
                            }
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

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
