#!/usr/bin/env node
/**
 * Database Schema Analysis Script
 * Purpose: Identify unused or duplicate database structures
 * 
 * This script:
 * 1. Queries INFORMATION_SCHEMA to list all tables and columns
 * 2. Searches codebase for references to each structure
 * 3. Identifies potentially unused or duplicate structures
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mesob_hrms'
};

// Directory to search for code references
const SRC_DIR = path.join(__dirname, 'src');
const SCRIPTS_DIR = path.join(__dirname, 'scripts');

/**
 * Search for references to a table or column name in the codebase
 */
function searchCodebase(searchTerm) {
  try {
    // Search in src/ and scripts/ directories
    const grepCommand = `grep -r -i "${searchTerm}" ${SRC_DIR} ${SCRIPTS_DIR} 2>/dev/null || true`;
    const result = execSync(grepCommand, { encoding: 'utf8' });
    const lines = result.trim().split('\n').filter(line => line.length > 0);
    return lines.length;
  } catch (error) {
    return 0;
  }
}

/**
 * Main analysis function
 */
async function analyzeSchema() {
  console.log('='.repeat(80));
  console.log('DATABASE SCHEMA ANALYSIS');
  console.log('='.repeat(80));
  console.log(`Database: ${dbConfig.database}`);
  console.log(`Host: ${dbConfig.host}`);
  console.log('');

  let connection;
  
  try {
    // Connect to database
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ Connected successfully\n');

    // Get all tables
    console.log('Fetching table information...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `, [dbConfig.database]);

    console.log(`✓ Found ${tables.length} tables\n`);
    console.log('='.repeat(80));
    console.log('TABLE AND COLUMN ANALYSIS');
    console.log('='.repeat(80));
    console.log('');

    const analysisResults = {
      tables: [],
      potentiallyUnused: [],
      summary: {
        totalTables: tables.length,
        totalColumns: 0,
        tablesWithNoReferences: 0,
        columnsWithNoReferences: 0
      }
    };

    // Analyze each table
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      console.log(`\n📋 TABLE: ${tableName}`);
      console.log('-'.repeat(80));

      // Get columns for this table
      const [columns] = await connection.query(`
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE,
          COLUMN_KEY,
          COLUMN_DEFAULT,
          EXTRA
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `, [dbConfig.database, tableName]);

      analysisResults.summary.totalColumns += columns.length;

      // Search for table references
      const tableRefs = searchCodebase(tableName);
      console.log(`   References to table name: ${tableRefs}`);

      if (tableRefs === 0) {
        analysisResults.summary.tablesWithNoReferences++;
        analysisResults.potentiallyUnused.push({
          type: 'table',
          name: tableName,
          references: 0
        });
      }

      const tableAnalysis = {
        name: tableName,
        tableReferences: tableRefs,
        columns: [],
        unusedColumns: []
      };

      // Analyze each column
      console.log(`   Columns (${columns.length}):`);
      for (const column of columns) {
        const columnName = column.COLUMN_NAME;
        const columnRefs = searchCodebase(columnName);
        
        const columnInfo = {
          name: columnName,
          type: column.DATA_TYPE,
          nullable: column.IS_NULLABLE,
          key: column.COLUMN_KEY,
          default: column.COLUMN_DEFAULT,
          extra: column.EXTRA,
          references: columnRefs
        };

        tableAnalysis.columns.push(columnInfo);

        // Check for potentially unused columns
        if (columnRefs === 0 && !['id', 'uuid', 'created_at', 'updated_at'].includes(columnName.toLowerCase())) {
          console.log(`   ⚠️  ${columnName} (${column.DATA_TYPE}) - NO REFERENCES FOUND`);
          tableAnalysis.unusedColumns.push(columnInfo);
          analysisResults.summary.columnsWithNoReferences++;
          analysisResults.potentiallyUnused.push({
            type: 'column',
            table: tableName,
            name: columnName,
            dataType: column.DATA_TYPE,
            references: 0
          });
        } else {
          console.log(`      ${columnName} (${column.DATA_TYPE}) - ${columnRefs} references`);
        }
      }

      analysisResults.tables.push(tableAnalysis);
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('ANALYSIS SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Tables: ${analysisResults.summary.totalTables}`);
    console.log(`Total Columns: ${analysisResults.summary.totalColumns}`);
    console.log(`Tables with no references: ${analysisResults.summary.tablesWithNoReferences}`);
    console.log(`Columns with no references: ${analysisResults.summary.columnsWithNoReferences}`);
    console.log('');

    if (analysisResults.potentiallyUnused.length > 0) {
      console.log('⚠️  POTENTIALLY UNUSED STRUCTURES:');
      console.log('-'.repeat(80));
      for (const item of analysisResults.potentiallyUnused) {
        if (item.type === 'table') {
          console.log(`   TABLE: ${item.name} (${item.references} references)`);
        } else {
          console.log(`   COLUMN: ${item.table}.${item.name} (${item.dataType}) - ${item.references} references`);
        }
      }
    } else {
      console.log('✓ All structures appear to be referenced in the codebase');
    }

    // Save detailed results to JSON file
    const outputFile = path.join(__dirname, 'schema-analysis-results.json');
    fs.writeFileSync(outputFile, JSON.stringify(analysisResults, null, 2));
    console.log(`\n✓ Detailed results saved to: ${outputFile}`);

    console.log('\n' + '='.repeat(80));
    console.log('NOTE: This analysis searches for text references in code.');
    console.log('False positives may occur. Manual review is recommended.');
    console.log('Standard columns (id, uuid, created_at, updated_at) are excluded from warnings.');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✓ Database connection closed');
    }
  }
}

// Run the analysis
analyzeSchema().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
