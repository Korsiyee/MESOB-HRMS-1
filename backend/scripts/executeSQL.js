/**
 * Direct SQL execution script for creating RBAC tables
 */

require('dotenv').config();
const { db } = require('../src/config/db');

const SQL_STATEMENTS = [
  // RoleOccupations Table
  `CREATE TABLE IF NOT EXISTS RoleOccupations (
    uuid VARCHAR(36) PRIMARY KEY,
    role ENUM('EMPLOYEE','DEPARTMENT_HEAD','HR_OFFICER','HR_ADMIN','SUPER_ADMIN') NOT NULL,
    occupation_uuid VARCHAR(36) NOT NULL,
    assigned_by_uuid VARCHAR(36),
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_reason TEXT,
    INDEX idx_role_occupations_role (role),
    INDEX idx_role_occupations_occupation (occupation_uuid),
    UNIQUE KEY unique_role_occupation (role, occupation_uuid),
    FOREIGN KEY (occupation_uuid) REFERENCES Occupations (uuid) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by_uuid) REFERENCES Users (uuid) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  
  // UserScopes Table
  `CREATE TABLE IF NOT EXISTS UserScopes (
    uuid VARCHAR(36) PRIMARY KEY,
    user_uuid VARCHAR(36) NOT NULL,
    scope_type ENUM('SELF','DEPARTMENT','BRANCH','COMPANY','ALL') NOT NULL,
    scope_value VARCHAR(36),
    assigned_by_uuid VARCHAR(36),
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_reason TEXT,
    INDEX idx_user_scopes_user (user_uuid),
    INDEX idx_user_scopes_type (scope_type),
    FOREIGN KEY (user_uuid) REFERENCES Users (uuid) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by_uuid) REFERENCES Users (uuid) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  
  // OccupationDelegations Table
  `CREATE TABLE IF NOT EXISTS OccupationDelegations (
    uuid VARCHAR(36) PRIMARY KEY,
    delegator_user_uuid VARCHAR(36) NOT NULL,
    delegatee_user_uuid VARCHAR(36) NOT NULL,
    occupation_uuid VARCHAR(36) NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    delegation_reason TEXT,
    revoked_at DATETIME,
    revoked_by_uuid VARCHAR(36),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_delegations_delegatee (delegatee_user_uuid),
    INDEX idx_delegations_delegator (delegator_user_uuid),
    INDEX idx_delegations_active (end_date, revoked_at),
    INDEX idx_delegations_occupation (occupation_uuid),
    FOREIGN KEY (delegator_user_uuid) REFERENCES Users (uuid) ON DELETE CASCADE,
    FOREIGN KEY (delegatee_user_uuid) REFERENCES Users (uuid) ON DELETE CASCADE,
    FOREIGN KEY (occupation_uuid) REFERENCES Occupations (uuid) ON DELETE CASCADE,
    FOREIGN KEY (revoked_by_uuid) REFERENCES Users (uuid) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  
  // AccessAuditLogs Table
  `CREATE TABLE IF NOT EXISTS AccessAuditLogs (
    uuid VARCHAR(36) PRIMARY KEY,
    actor_user_uuid VARCHAR(36),
    target_user_uuid VARCHAR(36),
    action_type ENUM(
      'ROLE_OCCUPATION_ASSIGNED',
      'ROLE_OCCUPATION_REMOVED',
      'USER_OCCUPATION_ASSIGNED',
      'USER_OCCUPATION_REMOVED',
      'SCOPE_ASSIGNED',
      'SCOPE_REMOVED',
      'DELEGATION_CREATED',
      'DELEGATION_REVOKED',
      'AUTHORIZATION_DENIED',
      'TOKEN_REVOKED',
      'PERMISSION_CHECKED',
      'PERMISSION_GRANTED',
      'PERMISSION_DENIED',
      'SCOPE_VIOLATION',
      'LOGIN_FAILURE',
      'TOKEN_REFRESH',
      'DELEGATION_EXPIRED',
      'PERMISSION_EXPIRED',
      'PERMISSION_OVERRIDE_ADDED',
      'PERMISSION_OVERRIDE_REMOVED'
    ) NOT NULL,
    resource_type VARCHAR(50),
    resource_uuid VARCHAR(36),
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_logs_actor (actor_user_uuid, created_at),
    INDEX idx_audit_logs_target (target_user_uuid, created_at),
    INDEX idx_audit_logs_action (action_type, created_at),
    INDEX idx_audit_logs_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  
  // UserPermissionOverrides Table
  `CREATE TABLE IF NOT EXISTS UserPermissionOverrides (
    uuid VARCHAR(36) PRIMARY KEY,
    user_uuid VARCHAR(36) NOT NULL,
    occupation_uuid VARCHAR(36) NOT NULL,
    effect ENUM('ALLOW', 'DENY') NOT NULL,
    created_by_uuid VARCHAR(36),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    INDEX idx_permission_overrides_user (user_uuid),
    INDEX idx_permission_overrides_occupation (occupation_uuid),
    INDEX idx_permission_overrides_effect (effect),
    UNIQUE KEY unique_user_occupation_override (user_uuid, occupation_uuid),
    FOREIGN KEY (user_uuid) REFERENCES Users (uuid) ON DELETE CASCADE,
    FOREIGN KEY (occupation_uuid) REFERENCES Occupations (uuid) ON DELETE CASCADE,
    FOREIGN KEY (created_by_uuid) REFERENCES Users (uuid) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
];

async function executeSQL() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Creating RBAC Tables');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    const promisePool = db.promise();
    
    for (let i = 0; i < SQL_STATEMENTS.length; i++) {
      const statement = SQL_STATEMENTS[i];
      const tableName = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
      
      console.log(`⏳ Creating table: ${tableName}`);
      
      try {
        await promisePool.query(statement);
        console.log(`✅ Table created: ${tableName}\n`);
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`⚠️  Table already exists: ${tableName}\n`);
        } else {
          console.error(`❌ Failed to create ${tableName}:`, error.message);
          throw error;
        }
      }
    }
    
    // Verify tables
    console.log('Verifying RBAC tables...');
    const [tables] = await promisePool.query('SHOW TABLES');
    const existingTables = tables.map(row => Object.values(row)[0].toLowerCase());
    
    const requiredTables = [
      'roleoccupations',
      'userscopes',
      'occupationdelegations',
      'accessauditlogs',
      'userpermissionoverrides'
    ];
    
    let allExist = true;
    for (const table of requiredTables) {
      const exists = existingTables.includes(table);
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
      if (!exists) allExist = false;
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    if (allExist) {
      console.log('✅ All RBAC tables created successfully!');
    } else {
      console.log('⚠️  Some tables are missing!');
    }
    console.log('═══════════════════════════════════════════════════════════\n');
    
    process.exit(allExist ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

executeSQL();
