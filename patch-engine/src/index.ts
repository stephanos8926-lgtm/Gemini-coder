import fs from 'fs'
import { safeExec } from './utils/safeExec.js'
import { detectStack } from './detectStack.js'
import { runValidation } from './validator.js'
import { runBuild } from './buildRunner.js'
import { runAutoFix } from './autoFix.js'
import { classify } from './classifier.js'

const patchFile = process.argv[2]

if (!patchFile) {
  console.error('Usage: node index.js <patch.diff>')
  process.exit(1)
}

const patch = fs.readFileSync(patchFile, 'utf-8')

console.log('--- PATCH ENGINE START ---')

const stack = detectStack()

// Apply patch
const apply = safeExec(`git apply ${patchFile}`)

if (!apply.success) {
  console.error('Patch apply failed:', apply.error)
  process.exit(1)
}

console.log('Patch applied.')

// Validation
let result: any = runValidation(stack)

if (!result.success) {
  console.log('Validation failed. Attempting auto-fix...')
  runAutoFix(stack)
  result = runValidation(stack)
}

if (!result.success) {
  console.error('Validation still failing:', result.error)
  process.exit(1)
}

// Build
result = runBuild(stack)

if (!result.success) {
  const type = classify(result.error || '')
  console.log('Build failed:', type)
  runAutoFix(stack)
  result = runBuild(stack)
}

if (!result.success) {
  console.error('Final build failed:', result.error)
  process.exit(1)
}

console.log('--- SUCCESS ---')
process.exit(0)
