

// folder detection issue

// async function applyFixTimeoutIssue(issue: string) {
// //4
// // console.log("Original issue string:", JSON.stringify(issue));

// //     let filePath: string | null = null;

// //     // === 1️⃣ Extract File Path (Before ' - ' Separator) ===
// //     filePath = issue.split(" - ")[0].trim(); // Get everything before ' - '
// //     let fileName = path.basename(filePath);
// //     console.log("File name:", fileName);

// //     if (!fileName) {
// //         vscode.window.showErrorMessage(`Could not extract file path from issue: ${issue}`);
// //         return;
// //     }

// //     console.log("Extracted file path (before fix):", fileName);

// //     // === 2️⃣ Fix Windows-Specific Issues ===
// //     if (/^[a-zA-Z]:/.test(fileName)) {
// //         fileName = fileName.replace(/\\/g, "/"); // Ensure forward slashes
// //     }

// //     // === 3️⃣ Remove Any Newline Issues ===
// //     fileName = fileName.replace(/\n/g, "").trim(); // Removes any accidental line breaks

// //     // === 4️⃣ Ensure Absolute Path Resolution ===
// //     fileName = path.resolve(fileName);
// //     console.log("Final normalized file path:", fileName);

// //     // === 5️⃣ Verify File Exists Before Proceeding ===
// //     if (!fs.existsSync(fileName)) {
// //         vscode.window.showErrorMessage(`File not found: ${fileName}`);
// //         return;
// //     }
// //3
// // console.log("Original issue string:", JSON.stringify(issue)); // Log exact issue string

// // let filePath: string | null = null;

// // // === 1️⃣ Extract Path from Issue String ===
// // if (issue.startsWith("[")) {
// //     filePath = issue.substring(1, issue.indexOf("]")).trim(); // Remove square brackets [ ]
// // }

// // // === 2️⃣ Ensure Path is Correctly Formatted ===
// // if (!filePath) {
// //     vscode.window.showErrorMessage(`Could not extract file path from issue: ${issue}`);
// //     return;
// // }

// // // Remove any accidental newline characters from the path
// // filePath = filePath.replace(/\n/g, "").trim();

// // console.log("Extracted file path (before fix):", filePath);

// // // === 3️⃣ Fix Windows-Specific Issues ===
// // if (/^[a-zA-Z]:/.test(filePath)) {
// //     filePath = filePath.replace(/\\/g, "/"); // Ensure forward slashes
// // }

// // // === 4️⃣ Ensure Absolute Path Resolution ===
// // if (!path.isAbsolute(filePath)) {
// //     filePath = path.resolve(filePath); // Convert relative to absolute
// // }

// // console.log("Final normalized file path:", filePath);

// // // === 5️⃣ Verify File Exists Before Proceeding ===
// // if (!fs.existsSync(filePath)) {
// //     vscode.window.showErrorMessage(`File not found: ${filePath}`);
// //     return;
// // }


// //2
// // const issue = "[c:\\Users\\HP\\Desktop\\HealOps_Test_Project\\src\\no_timeout.js] Missing circuit breaker logic.";
//     // console.log(issue);
//     // // Extract file path using regex
//     // const match = issue.match(/\[(.*?)\]/);
//     // console.log(match);
//     // const filePath = match ? match[1] : 'Unknown Path';

//     // console.log(filePath);
// // Output: "c:\Users\HP\Desktop\HealOps_Test_Project\src\no_timeout.js"

// //1
//     // console.log(issue);
//     // const match = issue.match(/\[(.*?)\]/);
//     // console.log(match);
//     // const filePath = match ? match[1] : 'Unknown File';
//     // console.log(filePath);

//  //5>>>>>>>>>>>>>>>>>>>>>>>>>>>.
//     console.log(issue);
//     const file = issue.split(" - ")[0].trim(); // Get everything before ' - '
//     console.log("File:", file);
//     // const match = issue.match(/\[(.*?)\]/);
//     // console.log(match);
//     // const filePath = match ? match[1] : 'Unknown File';
//     const fileName = path.basename(file);
//     console.log("File name:",fileName); 
//     // const directory = "C:\\Users\\HP\\Desktop\\HealOps_Test_Project\\src";
//     // const filePath = path.join(directory, fileName);

// //6
//     // const files = await vscode.workspace.findFiles(`**/${fileName}`, '**/node_modules/**');
//     // let filePath;
//     // if (files.length > 0) {
//     //     const Path = files[0].fsPath;
//     //     const directory = path.dirname(Path);
//     //     console.log("Directory:", directory);
//     //     filePath = path.join(directory, fileName);
//     //     //return directory;
//     // } else {
//     //     vscode.window.showErrorMessage(`${fileName} not found in workspace.`);
//     //     //return null;
//     // }


//     // const workspaceFolders = vscode.workspace.workspaceFolders;
//     // if (!workspaceFolders) {
//     //     vscode.window.showErrorMessage('No workspace found.');
//     //     return;
//     // }
    
//     // const workspacePath = workspaceFolders[0].uri.fsPath;
//     // console.log("File workspacePath:",workspacePath); 
//     // const files = fs.readdirSync(workspacePath);
//     // const filePath = path.join(workspacePath, fileName);
//     //     console.log("File Path:",filePath);
//     //     const stat = fs.statSync(filePath);
//     //     console.log("File stat:",stat);
    

    

//     const workspaceFolders = vscode.workspace.workspaceFolders;
//     if (!workspaceFolders) {return null;}
//     const directory = workspaceFolders[0].uri.fsPath;
//     console.log("directory", directory); 
//     // const files = fs.readdirSync(directory);
//     const filePath = path.join(directory, fileName);
//     // const stat = fs.statSync(filePath);
//     console.log("File path:", filePath); 


//     try {
//         const document = await vscode.workspace.openTextDocument(filePath);
//         const text = document.getText();
//         const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });

//         const fixedCode = fixTimeoutIssues(ast, filePath);

//         if (fixedCode.length === 0) {
//             vscode.window.showInformationMessage(`No changes needed in ${filePath}.`);
//             return;
//         }

//         const edit = new vscode.WorkspaceEdit();
//         const fullRange = new vscode.Range(
//             document.positionAt(0),
//             document.positionAt(text.length)
//         );

//         edit.replace(document.uri, fullRange, fixedCode);
//         await vscode.workspace.applyEdit(edit);

//         vscode.window.showInformationMessage(`Timeout issue fixed in ${filePath}.`);
//     } catch (error) {
//         vscode.window.showErrorMessage(`Error fixing timeout issue: ${error}`);
//     }

// }
