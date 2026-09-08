import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

// Local source only. Never crawl environment files, caches, user data or ETL runs.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const out = resolve(root, 'docs/architecture')
const require = createRequire(resolve(root, 'app/package.json'))
const ts = require('typescript')
const read = p => readFileSync(resolve(root, p), 'utf8')
const walk = dir => readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap(e => {
  if (['generated', 'node_modules', 'runs', 'data', 'fixtures'].includes(e.name) || e.name.startsWith('.')) return []
  const p = `${dir}/${e.name}`
  return e.isDirectory() ? walk(p) : /\.(tsx?|mjs|css|prisma)$/.test(p) ? [p] : []
})
const paths = [...walk('app/src'), ...walk('app/etl'),
  'app/prisma/schema.prisma', 'app/prisma/seed.ts', 'app/public/sw.js', 'app/package.json',
  'app/next.config.ts', 'app/vercel.json', 'app/docker-compose.yml', 'app/prisma.config.ts',
  'app/scripts/deploy/migrate.mjs', 'app/scripts/m8a/build-id.mjs', 'app/scripts/m8a/sw-manifest.mjs',
  '.github/workflows/check.yml', 'README.md', 'docs/DEPLOY.md', 'docs/ROADMAP.md',
  'docs/GLOSSARY.md', 'app/etl/README.md', 'app/etl/data/README.md',
].filter(p => existsSync(resolve(root, p))).sort()
const files = paths.map(path => {
  const text = read(path)
  const file = { path, text, lines: text.split('\n').length, imports: [], types: [], procedures: [] }
  if (!/\.[mt]sx?$/.test(path)) return file
  const ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const line = n => ast.getLineAndCharacterOfPosition(n.getStart(ast)).line + 1
  const visit = n => {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) file.imports.push(n.moduleSpecifier.text)
    if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) file.imports.push(n.arguments[0].text)
    if ((ts.isTypeAliasDeclaration(n) || ts.isInterfaceDeclaration(n)) && n.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) file.types.push({ name: n.name.text, line: line(n), text: n.getText(ast) })
    if (path.includes('/server/routers/') && ts.isPropertyAssignment(n) && n.initializer.getText(ast).startsWith('publicProcedure')) {
      const body = n.initializer.getText(ast)
      file.procedures.push({ name: n.name.getText(ast), kind: /\.mutation\(/.test(body) ? 'mutation' : 'query', line: line(n), text: n.getText(ast) })
    }
    ts.forEachChild(n, visit)
  }
  visit(ast)
  return file
})
const fileSet = new Set(paths)
for (const f of files) f.imports = [...new Set(f.imports)].map(specifier => {
  const base = specifier.startsWith('@/') ? `app/src/${specifier.slice(2)}` : specifier.startsWith('.') ? relative(root, resolve(root, dirname(f.path), specifier)) : null
  const target = base ? [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find(p => fileSet.has(p)) ?? null : null
  return { specifier, target }
})
const schema = read('app/prisma/schema.prisma')
const blocks = [...schema.matchAll(/^(model|enum) (\w+) \{\n([\s\S]*?)^\}/gm)]
const models = blocks.filter(m => m[1] === 'model').map(m => {
  const lines = m[3].split('\n'), fields = [], constraints = []; let comment = []
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim()
    if (s.startsWith('///')) { comment.push(s.slice(3).trim()); continue }
    if (s.startsWith('@@')) constraints.push(s)
    else if (s && !s.startsWith('//')) {
      const field = s.match(/^(\w+)\s+(\S+)\s*(.*)$/)
      if (field) fields.push({ name: field[1], type: field[2], attributes: field[3], description: comment.join(' '), line: schema.slice(0, m.index).split('\n').length + 1 + i })
    }
    comment = []
  }
  return { name: m[2], line: schema.slice(0, m.index).split('\n').length, fields, constraints }
})
const names = new Set(models.map(m => m.name))
for (const m of models) for (const f of m.fields) f.relation = names.has(f.type.replace(/[?\[\]]/g, '')) ? f.type.replace(/[?\[\]]/g, '') : null
const enums = blocks.filter(m => m[1] === 'enum').map(m => ({ name: m[2], values: m[3].split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('//')), line: schema.slice(0, m.index).split('\n').length }))
const pkg = JSON.parse(read('app/package.json')), lock = JSON.parse(read('app/package-lock.json'))
const dependencies = ['dependencies', 'devDependencies'].flatMap(group => Object.entries(pkg[group] ?? {}).map(([name, declared]) => ({ name, declared, resolved: lock.packages?.[`node_modules/${name}`]?.version ?? null, group })))
const routes = files.filter(f => /\/src\/app\/.*\/(page\.tsx|route\.ts)$/.test(f.path)).map(f => ({ path: f.path, url: f.path.replace('app/src/app', '').replace(/\/\([^/]+\)/g, '').replace(/\/(page\.tsx|route\.ts)$/, '') || '/', kind: f.path.endsWith('route.ts') ? 'HTTP' : 'Page', methods: [...f.text.matchAll(/export (?:async )?function (GET|POST|PUT|PATCH|DELETE|OPTIONS)\b/g)].map(m => m[1]) }))
const data = { generatedAt: new Date().toISOString(), commit: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), scope: 'Working-tree source snapshot; includes uncommitted work. Deployment state is not verified.', models, enums, dependencies, scripts: pkg.scripts, routes, files, counts: { models: models.length, enums: enums.length, routers: files.filter(f => f.procedures.length).length, procedures: files.reduce((n, f) => n + f.procedures.length, 0), sourceFiles: files.filter(f => /\.(tsx?|mjs)$/.test(f.path)).length, testFiles: files.filter(f => /\.test\./.test(f.path)).length } }
mkdirSync(out, { recursive: true })
writeFileSync(resolve(out, 'data.js'), `// Generated by app/scripts/architecture/build.mjs; do not edit.\nwindow.ARCHITECTURE_DATA = ${JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')};\n`)
console.log(`Architecture snapshot: ${models.length} models, ${data.counts.procedures} procedures, ${files.length} files → docs/architecture/data.js`)
