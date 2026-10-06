#!/usr/bin/env node
/**
 * Dead Code Detection Script
 * Purpose: Identify functions defined but never called
 * 
 * This script:
 * 1. Finds all function definitions in /backend/src
 * 2. Searches for call sites of each function
 * 3. Reports functions with zero references
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');

/**
 * Extract function names from JavaScript files
 */
function extractFunctions() {
  console.log('='.repeat(80));
  console.log('DEAD CODE DETECTION');
  console.log('='.repeat(80));
  console.log(`Scanning directory: ${SRC_DIR}`);
  console.log('');

  const functions = [];

  try {
    // Find all JavaScript files
    const jsFiles = execSync(`find "${SRC_DIR}" -name "*.js" -type f`, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(f => f.length > 0);

    console.log(`Found ${jsFiles.length} JavaScript files\n`);

    // Extract function names from each file
    for (const file of jsFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = file.replace(SRC_DIR + '/', '');

      // Match different function definition patterns
      const patterns = [
        // function name() {}
        /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
        // const name = function() {}
        /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*function/g,
        // const name = () => {}
        /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
        // async function name() {}
        /async\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
        // exports.name = function() {} or module.exports.name = function() {}
        /(?:module\.)?exports\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?function/g,
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const functionName = match[1];
          // Skip common patterns that aren't real functions
          if (functionName && 
              functionName !== 'require' && 
              functionName !== 'exports' &&
              functionName !== 'module' &&
              !functionName.startsWith('_') && // Skip private functions
              functionName.length > 2) {
            functions.push({
              name: functionName,
              file: relativePath
            });
          }
        }
      }
    }

    console.log(`Extracted ${functions.length} function definitions\n`);
    return functions;

  } catch (error) {
    console.error('Error extracting functions:', error.message);
    return [];
  }
}

/**
 * Search for function call sites
 */
function searchForCalls(functionName) {
  try {
    // Search for function calls: functionName(
    const grepCommand = `grep -r "${functionName}(" ${SRC_DIR} 2>/dev/null || true`;
    const result = execSync(grepCommand, { encoding: 'utf8' });
    const lines = result.trim().split('\n').filter(line => {
      // Filter out:
      // - empty lines
      // - function definitions themselves
      // - comments
      return line.length > 0 && 
             !line.includes(`function ${functionName}(`) &&
             !line.includes(`function ${functionName} (`) &&
             !line.includes(`const ${functionName} =`) &&
             !line.trim().startsWith('//') &&
             !line.trim().startsWith('/*') &&
             !line.trim().startsWith('*');
    });
    return lines.length;
  } catch (error) {
    return 0;
  }
}

/**
 * Analyze function usage
 */
function analyzeUsage() {
  const functions = extractFunctions();
  
  if (functions.length === 0) {
    console.log('No functions found to analyze.');
    return;
  }

  console.log('='.repeat(80));
  console.log('ANALYZING FUNCTION USAGE');
  console.log('='.repeat(80));
  console.log('');

  const analysis = {
    total: functions.length,
    used: 0,
    unused: 0,
    potentiallyDead: []
  };

  // Group functions by name to handle duplicates
  const functionsByName = {};
  for (const func of functions) {
    if (!functionsByName[func.name]) {
      functionsByName[func.name] = [];
    }
    functionsByName[func.name].push(func);
  }

  console.log(`Unique function names: ${Object.keys(functionsByName).length}\n`);
  console.log('Searching for call sites...\n');

  for (const [name, locations] of Object.entries(functionsByName)) {
    const callCount = searchForCalls(name);
    
    // Subtract definition occurrences (one per location)
    const adjustedCallCount = Math.max(0, callCount - locations.length);
    
    if (adjustedCallCount === 0) {
      analysis.unused++;
      console.log(`⚠️  ${name}`);
      for (const loc of locations) {
        console.log(`      in ${loc.file}`);
        analysis.potentiallyDead.push({
          name: name,
          file: loc.file,
          calls: 0
        });
      }
    } else {
      analysis.used++;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('ANALYSIS SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total functions analyzed: ${Object.keys(functionsByName).length} unique names`);
  console.log(`Functions with call sites: ${analysis.used}`);
  console.log(`Functions with NO call sites: ${analysis.unused}`);
  console.log('');

  if (analysis.potentiallyDead.length > 0) {
    console.log('⚠️  POTENTIALLY DEAD FUNCTIONS:');
    console.log('-'.repeat(80));
    for (const item of analysis.potentiallyDead) {
      console.log(`   ${item.name} in ${item.file}`);
    }
    console.log('');
    console.log('NOTE: This analysis may have false positives:');
    console.log('- Exported functions may be called from outside /backend/src');
    console.log('- Middleware functions may be referenced by name without direct calls');
    console.log('- Functions may be called via computed names or dynamic imports');
    console.log('- Route handlers are called by Express, not directly in code');
    console.log('');
    console.log('Manual review is required before removing any function.');
  } else {
    console.log('✓ No obviously unused functions detected.');
  }

  // Save results
  const outputFile = path.join(__dirname, 'dead-code-analysis-results.json');
  fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
  console.log(`\n✓ Detailed results saved to: ${outputFile}`);
  console.log('='.repeat(80));
}

// Run the analysis
analyzeUsage();
