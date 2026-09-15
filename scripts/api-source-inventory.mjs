import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])
const files = walk('src').filter(p => /\.tsx?$/.test(p))
const sources = new Map(files.map(p => [p, fs.readFileSync(p, 'utf8')]))
const result = []
for (const [file, text] of sources) {
  if (!file.startsWith('src/api/')) continue
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const constants = new Map()
  const helpers = new Map()
  for (const statement of ast.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      const returned = statement.body?.statements.find(ts.isReturnStatement)
      if (returned?.expression) helpers.set(statement.name.text, returned.expression)
    }
  }
  const value = node => {
    if (!node) return ''
    if (ts.isStringLiteralLike(node)) return node.text
    if (ts.isIdentifier(node)) return constants.get(node.text) ?? `{${node.text}}`
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && helpers.has(node.expression.text)) return value(helpers.get(node.expression.text))
    if (ts.isTemplateExpression(node)) return node.head.text + node.templateSpans.map(s => value(s.expression) + s.literal.text).join('')
    return `{${node.getText(ast)}}`
  }
  function visit(node, fn = '') {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) constants.set(node.name.text, value(node.initializer))
    if (ts.isFunctionDeclaration(node)) fn = node.name?.text ?? ''
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ['get', 'post', 'put', 'patch', 'delete'].includes(node.expression.name.text)) {
      const endpoint = value(node.arguments[0])
      if (endpoint.startsWith('/')) {
        const callers = [...sources].filter(([p, s]) => fn && (p !== file ? new RegExp(`\\b${fn}\\b`).test(s) : (s.match(new RegExp(`\\b${fn}\\s*\\(`, 'g')) ?? []).length > 1)).map(([p]) => p)
        result.push({ method: node.expression.name.text.toUpperCase(), path: endpoint, file, function: fn, callers })
      }
    }
    ts.forEachChild(node, child => visit(child, fn))
  }
  visit(ast)
}
console.log(JSON.stringify(result, null, 2))
