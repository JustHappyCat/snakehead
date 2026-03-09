import { normalizeUrl, isValidUrl, isInternalUrl, getDomain } from '../lib/url'

function testURLNormalization() {
  console.log('Testing URL normalization...')
  
  const tests = [
    { input: 'https://example.com/path', expected: 'https://example.com/path' },
    { input: 'https://example.com/path/', expected: 'https://example.com/path' },
    { input: 'https://example.com/path#section', expected: 'https://example.com/path' },
    { input: 'https://example.com/path?query=1', expected: 'https://example.com/path?query=1' },
    { input: 'https://example.com/path?Query=1', expected: 'https://example.com/path?query=1' },
    { input: '/relative/path', expected: '/relative/path' }, 
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      const result = normalizeUrl(test.input)
      if (result === test.expected) {
        passed++
        console.log(`✓ ${test.input} -> ${result}`)
      } else {
        failed++
        console.log(`✗ ${test.input}`)
        console.log(`  Expected: ${test.expected}`)
        console.log(`  Got: ${result}`)
      }
    } catch (error) {
      failed++
      console.log(`✗ ${test.input} - Error: ${error}`)
    }
  }

  console.log(`URL Normalization: ${passed} passed, ${failed} failed`)
  return failed === 0
}

function testIsValidUrl() {
  console.log('\nTesting isValidUrl...')
  
  const tests = [
    { input: 'https://example.com', expected: true },
    { input: 'http://example.com', expected: true },
    { input: 'not-a-url', expected: false },
    { input: 'ftp://example.com', expected: true },
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    const result = isValidUrl(test.input)
    if (result === test.expected) {
      passed++
      console.log(`✓ ${test.input} -> ${result}`)
    } else {
      failed++
      console.log(`✗ ${test.input}`)
      console.log(`  Expected: ${test.expected}`)
      console.log(`  Got: ${result}`)
    }
  }

  console.log(`isValidUrl: ${passed} passed, ${failed} failed`)
  return failed === 0
}

function testGetDomain() {
  console.log('\nTesting getDomain...')
  
  const tests = [
    { input: 'https://example.com', expected: 'example.com' },
    { input: 'https://www.example.com/path', expected: 'www.example.com' },
    { input: 'https://sub.domain.example.com', expected: 'sub.domain.example.com' },
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    const result = getDomain(test.input)
    if (result === test.expected) {
      passed++
      console.log(`✓ ${test.input} -> ${result}`)
    } else {
      failed++
      console.log(`✗ ${test.input}`)
      console.log(`  Expected: ${test.expected}`)
      console.log(`  Got: ${result}`)
    }
  }

  console.log(`getDomain: ${passed} passed, ${failed} failed`)
  return failed === 0
}

function testIsInternalUrl() {
  console.log('\nTesting isInternalUrl...')
  
  const baseUrl = 'https://example.com'
  
  const tests = [
    { input: 'https://example.com/path', expected: true },
    { input: 'https://example.com', expected: true },
    { input: 'https://other.com', expected: false },
    { input: 'https://sub.example.com', expected: false },
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    const result = isInternalUrl(test.input, baseUrl)
    if (result === test.expected) {
      passed++
      console.log(`✓ ${test.input} vs ${baseUrl} -> ${result}`)
    } else {
      failed++
      console.log(`✗ ${test.input} vs ${baseUrl}`)
      console.log(`  Expected: ${test.expected}`)
      console.log(`  Got: ${result}`)
    }
  }

  console.log(`isInternalUrl: ${passed} passed, ${failed} failed`)
  return failed === 0
}

async function runTests() {
  console.log('Running utility tests...\n')
  console.log('='.repeat(50))
  
  const results = [
    testURLNormalization(),
    testIsValidUrl(),
    testGetDomain(),
    testIsInternalUrl(),
  ]

  console.log('\n' + '='.repeat(50))
  
  if (results.every(r => r)) {
    console.log('✓ All tests passed!')
    process.exit(0)
  } else {
    console.log('✗ Some tests failed')
    process.exit(1)
  }
}

runTests().catch(console.error)
