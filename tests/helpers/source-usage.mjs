import { readdirSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '../..')

// Include browser probes: a component used only by QA is not dead code.
export function inspectSourceUsage() {
  const config = ts.readConfigFile(path.join(root, 'tsconfig.app.json'), ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
  const probes = readdirSync(path.join(root, 'tests/browser'), { recursive: true })
    .filter(file => /\.[jt]sx?$/.test(file))
    .map(file => path.join(root, 'tests/browser', file))
  const program = ts.createProgram([...parsed.fileNames, ...probes], { ...parsed.options, allowJs: true, checkJs: false })
  const checker = program.getTypeChecker()
  const sources = program.getSourceFiles().filter(file => file.fileName.startsWith(path.join(root, 'src/')) || probes.includes(file.fileName))
  const references = new Map()
  const canonical = symbol => symbol?.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
  for (const file of sources) {
    function visit(node) {
      let symbol
      if (ts.isIdentifier(node)) {
        symbol = ts.isShorthandPropertyAssignment(node.parent)
          ? checker.getShorthandAssignmentValueSymbol(node.parent)
          : checker.getSymbolAtLocation(node)
        if (ts.isImportSpecifier(node.parent) || ts.isImportClause(node.parent) || ts.isNamespaceImport(node.parent)) symbol = undefined
      } else if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)) {
        symbol = checker.getTypeAtLocation(node.expression).getProperty(node.argumentExpression.text)
      }
      symbol = canonical(symbol)
      if (symbol && !symbol.declarations?.some(declaration => declaration.name === node)) {
        references.set(symbol, [...(references.get(symbol) ?? []), node.getSourceFile().fileName])
      }
      ts.forEachChild(node, visit)
    }
    visit(file)
  }
  const unusedStyles = []
  for (const file of sources.filter(file => file.fileName.endsWith('.styles.ts'))) {
    const module = checker.getSymbolAtLocation(file)
    if (!module) continue
    for (const exported of checker.getExportsOfModule(module)) {
      const symbol = canonical(exported)
      // Shared compatibility re-exports are kept; inspect their definitions.
      const declaration = symbol?.declarations?.[0]
      if (declaration?.getSourceFile() !== file || references.has(symbol)) continue
      unusedStyles.push({ file: path.relative(root, file.fileName), name: exported.name, start: declaration.parent.parent.getStart(file), end: declaration.parent.parent.end })
    }
  }
  return { unusedStyles, program, checker, references }
}
