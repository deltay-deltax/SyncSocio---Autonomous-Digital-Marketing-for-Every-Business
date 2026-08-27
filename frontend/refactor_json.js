import { Project, SyntaxKind, VariableDeclaration } from "ts-morph";

const project = new Project();
project.addSourceFilesAtPaths("src/**/*.tsx");
project.addSourceFilesAtPaths("src/**/*.ts");

let counter = 0;

for (const sourceFile of project.getSourceFiles()) {
  let fileChanged = false;

  const variableDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);

  // We have to iterate in reverse to avoid breaking AST node references when replacing
  for (let i = variableDeclarations.length - 1; i >= 0; i--) {
    const varDecl = variableDeclarations[i];
    const initializer = varDecl.getInitializer();

    if (initializer && initializer.getKind() === SyntaxKind.AwaitExpression) {
      const expression = initializer.getExpression();
      if (expression && expression.getKind() === SyntaxKind.CallExpression) {
        const propAccess = expression.getExpression();
        if (propAccess.getKind() === SyntaxKind.PropertyAccessExpression && propAccess.getName() === "json") {
          
          const varName = varDecl.getName(); // could be 'data', or '{ token, user }'
          const caller = propAccess.getExpression().getText(); // e.g. 'res' or 'response'
          
          // Generate unique intermediate variable name based on counter to avoid collisions
          const tempName = `_rawJson${counter++}`;
          
          const statement = varDecl.getFirstAncestorByKind(SyntaxKind.VariableStatement);
          if (statement) {
            // Replace the entire variable statement
            const newText = `const ${tempName} = await ${caller}.json();\nconst ${varName} = ${tempName} && ${tempName}.success !== undefined ? (${tempName}.success ? ${tempName}.data : ${tempName}) : ${tempName};`;
            statement.replaceWithText(newText);
            fileChanged = true;
          }
        }
      }
    }
  }

  // Also handle assignment expressions like `data = await res.json();`
  const binaryExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.BinaryExpression);
  for (let i = binaryExpressions.length - 1; i >= 0; i--) {
    const expr = binaryExpressions[i];
    if (expr.getOperatorToken().getKind() === SyntaxKind.EqualsToken) {
      const right = expr.getRight();
      if (right.getKind() === SyntaxKind.AwaitExpression) {
        const expression = right.getExpression();
        if (expression && expression.getKind() === SyntaxKind.CallExpression) {
          const propAccess = expression.getExpression();
          if (propAccess.getKind() === SyntaxKind.PropertyAccessExpression && propAccess.getName() === "json") {
            const leftName = expr.getLeft().getText();
            const caller = propAccess.getExpression().getText();
            
            const tempName = `_rawJson${counter++}`;
            const exprStmt = expr.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
            if (exprStmt) {
              const newText = `const ${tempName} = await ${caller}.json();\n${leftName} = ${tempName} && ${tempName}.success !== undefined ? (${tempName}.success ? ${tempName}.data : ${tempName}) : ${tempName};`;
              exprStmt.replaceWithText(newText);
              fileChanged = true;
            }
          }
        }
      }
    }
  }

  if (fileChanged) {
    sourceFile.saveSync();
  }
}

console.log(`Transformed ${counter} JSON parse calls.`);
