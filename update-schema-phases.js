const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Add DeviceToken and SyncCode for Phase 5
if (!schema.includes('model DeviceToken')) {
  schema += `

/// 设备授权令牌（同步用）
model DeviceToken {
  id         String   @id @default(cuid())
  token      String   @unique
  userId     String
  deviceName String?
  isRevoked  Boolean  @default(false)
  createdAt  DateTime @default(now())
  lastSyncAt DateTime?
}

/// 临时同步码
model SyncCode {
  id        String   @id @default(cuid())
  code      String   @unique
  userId    String
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
}

/// 数据同步日志（用于解决冲突和防重）
model SyncLog {
  id         String   @id @default(cuid())
  userId     String
  deviceId   String
  entityType String   // "ExamSession", "ExamAnswer", "ReviewRecord"
  entityId   String
  action     String   // "create", "update", "delete"
  timestamp  DateTime @default(now())
}
`;
}

// Add grading fields to ExamAnswer for Phase 6
if (!schema.includes('gradeReason')) {
  schema = schema.replace(
    /model ExamAnswer \{[\s\S]*?score\s+Float\s+@default\(0\)/,
    `$&
  gradeReason   String?  // 评分理由
  gradeTier     String?  // 评分档次 (A, B, C...)
  gradedBy      String?  // 评分人或 "AI"
  gradeVersion  Int      @default(1)`
  );
}

fs.writeFileSync(schemaPath, schema);
