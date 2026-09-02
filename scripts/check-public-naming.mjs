import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(process.argv[2] ?? fileURLToPath(new URL('../', import.meta.url)))
const policyPath = path.join(root, 'legal/public-name-policy.json')
const policy = JSON.parse(await readFile(policyPath, 'utf8'))
const excludedDirectories = new Set(['.git', 'node_modules'])

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const forbidden = new RegExp(
  policy.forbiddenTerms
    .sort((left, right) => right.length - left.length)
    .map(term => term.length <= 3 ? `\\b${escapeRegExp(term)}\\b` : escapeRegExp(term))
    .join('|'),
  'giu',
)

async function filesUnder(directory, prefix = '') {
  const output = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue
    const relative = path.posix.join(prefix, entry.name)
    if (entry.isDirectory()) output.push(...await filesUnder(path.join(directory, entry.name), relative))
    else if (entry.isFile()) output.push(relative)
  }
  return output
}

function removeLegalPackageNames(relative, content) {
  const exceptions = policy.legalExceptions
  if (relative === exceptions.policyFile) return ''
  if (relative === exceptions.generatedDependencyLock.path) {
    const prefix = escapeRegExp(exceptions.generatedDependencyLock.packagePrefix)
    return content.replace(new RegExp(`${prefix}[a-z0-9._-]+`, 'giu'), '[third-party-package]')
  }
  const isRuntimeImport = exceptions.runtimeImports.paths.includes(relative)
  const isGeneratedRuntime = relative.startsWith(exceptions.generatedRuntimeArtifacts.pathPrefix)
  if (!isRuntimeImport && !isGeneratedRuntime) return content
  const packages = isRuntimeImport
    ? exceptions.runtimeImports.packages
    : exceptions.generatedRuntimeArtifacts.packages
  return packages.reduce(
    (current, packageName) => current.replaceAll(packageName, '[third-party-package]'),
    content,
  )
}

const violations = []
for (const relative of await filesUnder(root)) {
  const absolute = path.join(root, relative)
  let content
  try {
    content = await readFile(absolute, 'utf8')
  } catch {
    continue
  }
  const inspected = removeLegalPackageNames(relative, content)
  for (const match of inspected.matchAll(forbidden)) {
    const line = inspected.slice(0, match.index).split('\n').length
    violations.push(`${relative}:${line}:${match[0]}`)
  }
}

if (violations.length !== 0) {
  console.error(violations.join('\n'))
  process.exitCode = 1
} else {
  console.log('public naming gate: PASS')
}
