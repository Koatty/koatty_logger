/**
 * DefaultLogger 使用示例
 * 
 * 演示 DefaultLogger 的各种使用方式
 */

import { DefaultLogger } from '../src/index';

console.log('='.repeat(80));
console.log('DefaultLogger 使用示例');
console.log('='.repeat(80));

// ============================================================
// 示例 1: 开箱即用（无需配置）
// ============================================================
console.log('\n📦 示例 1: 开箱即用（无需配置）');
console.log('-'.repeat(80));

// 直接使用，无需任何配置或初始化
DefaultLogger.info('这是一条 info 日志');
DefaultLogger.debug('这是一条 debug 日志');
DefaultLogger.warn('这是一条 warn 日志');
DefaultLogger.error('这是一条 error 日志');

// ============================================================
// 示例 2: 使用前配置
// ============================================================
console.log('\n⚙️  示例 2: 使用前完整配置');
console.log('-'.repeat(80));

DefaultLogger.configure({
  minLevel: 'debug',
  logFilePath: './logs/example.log',
  sensFields: new Set(['password', 'token', 'secret']),
  buffer: {
    enableBuffer: false, // 示例中禁用缓冲以便立即看到输出
    maxBufferSize: 100,
    flushInterval: 1000
  }
});

DefaultLogger.info('配置后的日志');
DefaultLogger.debug('现在 debug 日志也会输出了');

// ============================================================
// 示例 3: 分步配置
// ============================================================
console.log('\n🔧 示例 3: 分步配置');
console.log('-'.repeat(80));

// 设置日志级别
DefaultLogger.setMinLevel('info');
console.log('✓ 已设置日志级别为 info');

// 设置日志文件路径
DefaultLogger.setLogPath('./logs/example.log');
console.log('✓ 已设置日志文件路径');

// 设置敏感字段
DefaultLogger.setSensitiveFields(['apiKey', 'sessionId']);
console.log('✓ 已设置敏感字段');

DefaultLogger.info('分步配置完成');

// ============================================================
// 示例 4: 敏感数据脱敏
// ============================================================
console.log('\n🔒 示例 4: 敏感数据脱敏');
console.log('-'.repeat(80));

DefaultLogger.setSensitiveFields(['password', 'token', 'creditCard']);

DefaultLogger.info('用户登录', {
  username: 'john_doe',
  password: 'MySecretPassword123', // 会被脱敏
  email: 'john@example.com',
  loginTime: new Date()
});

DefaultLogger.info('API 请求', {
  endpoint: '/api/users',
  token: 'Bearer abc123xyz789', // 会被脱敏
  method: 'POST'
});

// ============================================================
// 示例 5: 不同级别的日志
// ============================================================
console.log('\n📊 示例 5: 不同级别的日志');
console.log('-'.repeat(80));

DefaultLogger.Debug('大写方法：Debug');
DefaultLogger.Info('大写方法：Info');
DefaultLogger.Warn('大写方法：Warn');
DefaultLogger.Error('大写方法：Error');

DefaultLogger.debug('小写方法：debug');
DefaultLogger.info('小写方法：info');
DefaultLogger.warn('小写方法：warn');
DefaultLogger.error('小写方法：error');

// ============================================================
// 示例 6: 通用 Log 方法
// ============================================================
console.log('\n📝 示例 6: 通用 Log 方法');
console.log('-'.repeat(80));

DefaultLogger.Log('info', '使用 Log 方法记录 info');
DefaultLogger.log('debug', '使用 log 方法记录 debug');
DefaultLogger.Log('error', '使用 Log 方法记录 error');

// ============================================================
// 示例 7: 复杂对象日志
// ============================================================
console.log('\n🗂️  示例 7: 复杂对象日志');
console.log('-'.repeat(80));

const complexObject = {
  user: {
    id: 12345,
    name: 'John Doe',
    email: 'john@example.com',
    roles: ['admin', 'user']
  },
  request: {
    method: 'POST',
    url: '/api/users',
    body: {
      name: 'New User',
      password: 'SecretPassword123'
    },
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token123'
    }
  },
  timestamp: new Date(),
  metadata: {
    requestId: 'req-abc-123',
    sessionId: 'sess-xyz-789'
  }
};

DefaultLogger.info('处理复杂请求', complexObject);

// ============================================================
// 示例 8: 状态查询
// ============================================================
console.log('\n🔍 示例 8: 状态查询');
console.log('-'.repeat(80));

const config = DefaultLogger.getConfig();
console.log('当前配置:', {
  minLevel: config.minLevel,
  logFilePath: config.logFilePath,
  hasSensFields: config.sensFields && config.sensFields.size > 0
});

const status = DefaultLogger.getStatus();
console.log('初始化状态:', {
  initialized: status.initialized,
  failed: status.failed,
  usingFallback: status.usingFallback
});

const isInit = DefaultLogger.isInitialized();
console.log('是否已初始化:', isInit);

// 尝试获取统计信息（仅在使用 EnhancedLogger 时可用）
const stats = DefaultLogger.getStats();
if (stats) {
  console.log('统计信息:', stats);
} else {
  console.log('统计信息不可用（可能使用了基础 Logger 或 fallback）');
}

// ============================================================
// 示例 9: 错误处理场景
// ============================================================
console.log('\n⚠️  示例 9: 错误处理场景');
console.log('-'.repeat(80));

try {
  // 模拟一些操作
  throw new Error('模拟的业务错误');
} catch (error) {
  DefaultLogger.error('捕获到错误', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date(),
    context: '用户注册流程'
  });
}

// ============================================================
// 示例 10: 采样日志（仅在 EnhancedLogger 可用时）
// ============================================================
console.log('\n🎲 示例 10: 采样日志');
console.log('-'.repeat(80));

// 设置采样率：10% 的日志会被输出
DefaultLogger.configureSampling('high-frequency-api', 0.1);

// 模拟高频日志（只有部分会被输出）
console.log('发送 20 条采样日志（预期只输出约 2 条）...');
for (let i = 0; i < 20; i++) {
  DefaultLogger.InfoSampled('high-frequency-api', `高频 API 调用 #${i}`, {
    requestId: `req-${i}`,
    timestamp: Date.now()
  });
}

// ============================================================
// 示例 11: 实际应用场景 - Web 应用启动
// ============================================================
console.log('\n🚀 示例 11: 实际应用场景 - Web 应用启动');
console.log('-'.repeat(80));

// 模拟应用启动流程
function startApplication() {
  DefaultLogger.info('应用启动中...');
  
  // 加载配置
  DefaultLogger.info('加载配置文件...');
  DefaultLogger.debug('配置详情', {
    env: 'development',
    port: 3000,
    database: 'mongodb://localhost:27017'
  });
  
  // 连接数据库
  DefaultLogger.info('连接数据库...');
  DefaultLogger.info('数据库连接成功', {
    host: 'localhost',
    port: 27017,
    database: 'myapp'
  });
  
  // 启动服务器
  DefaultLogger.info('启动 HTTP 服务器...');
  DefaultLogger.info('服务器已启动', {
    port: 3000,
    url: 'http://localhost:3000'
  });
  
  DefaultLogger.info('✓ 应用启动完成');
}

startApplication();

// ============================================================
// 示例 12: 实际应用场景 - API 请求处理
// ============================================================
console.log('\n🌐 示例 12: 实际应用场景 - API 请求处理');
console.log('-'.repeat(80));

// 模拟 API 请求处理
function handleApiRequest(req: any) {
  const startTime = Date.now();
  
  DefaultLogger.info('收到 API 请求', {
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  
  try {
    // 模拟业务逻辑
    DefaultLogger.debug('处理业务逻辑', {
      userId: req.user?.id,
      action: 'createUser'
    });
    
    // 成功响应
    const duration = Date.now() - startTime;
    DefaultLogger.info('API 请求成功', {
      method: req.method,
      url: req.url,
      status: 200,
      duration: `${duration}ms`
    });
  } catch (error) {
    // 错误处理
    const duration = Date.now() - startTime;
    DefaultLogger.error('API 请求失败', {
      method: req.method,
      url: req.url,
      error: error instanceof Error ? error.message : String(error),
      duration: `${duration}ms`
    });
  }
}

// 模拟几个请求
handleApiRequest({
  method: 'POST',
  url: '/api/users',
  ip: '192.168.1.100',
  user: { id: 123 }
});

handleApiRequest({
  method: 'GET',
  url: '/api/users/123',
  ip: '192.168.1.100',
  user: { id: 123 }
});

// ============================================================
// 清理
// ============================================================
console.log('\n🧹 清理资源');
console.log('-'.repeat(80));

// 手动刷新缓冲区（如果启用了缓冲）
DefaultLogger.flush().then(() => {
  console.log('✓ 日志缓冲区已刷新');
});

// 在应用关闭时销毁日志器
// DefaultLogger.destroy();
// console.log('✓ DefaultLogger 已销毁');

console.log('\n='.repeat(80));
console.log('示例完成！');
console.log('='.repeat(80));

