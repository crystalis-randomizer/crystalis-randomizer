const typescript = require('typescript');
const path = require('path');

// first write a transform (or import it from somewhere)
const transformer = (transformationContext) => (sourceFile) => {
    function visitNode(node) {
        if (shouldMutateModuleSpecifier(node)) {
            if (typescript.isImportDeclaration(node)) {
                const newModuleSpecifier = typescript.createLiteral(node.moduleSpecifier.text.replace(/\.js$/, ''))
                return typescript.updateImportDeclaration(node, node.decorators, node.modifiers, node.importClause, newModuleSpecifier)
            } else if (typescript.isExportDeclaration(node)) {
                const newModuleSpecifier = typescript.createLiteral(node.moduleSpecifier.text.replace(/\.js$/, ''))
                return typescript.updateExportDeclaration(node, node.decorators, node.modifiers, node.exportClause, newModuleSpecifier)
            }
        }

        return typescript.visitEachChild(node, visitNode, transformationContext)
    }

    function shouldMutateModuleSpecifier(node) {
        if (!typescript.isImportDeclaration(node) && !typescript.isExportDeclaration(node)) return false
        if (node.moduleSpecifier === undefined) return false
        // only when module specifier is valid
        if (!typescript.isStringLiteral(node.moduleSpecifier)) return false
        // only when path is relative
        if (!node.moduleSpecifier.text.startsWith('./') && !node.moduleSpecifier.text.startsWith('../')) return false
        // only when module specifier has a .js extension
        if (path.extname(node.moduleSpecifier.text) !== '.js') return false
        return true
    }

    return typescript.visitNode(sourceFile, visitNode)
}

// TODO - pull in TS_NODE_PROJECT=?
// TODO - accept args?

require('ts-node').register({
  // ... other options ...
  // then give the transform to ts-node
  transformers: {
    before: [transformer],
    after: [],
  },
})
require('esm');
// const Mocha = require('mocha');
// const mocha = new Mocha();
// mocha.addFile('test/asm/macro_test.ts');
// mocha.run(failures => process.exitCode = !!failures);
