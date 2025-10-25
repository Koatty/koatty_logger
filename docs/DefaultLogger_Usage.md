# DefaultLogger 使用指南

## 概述

`DefaultLogger` 是 `koatty_logger` 提供的开箱即用的日志器单例,专为简化日志使用而设计。

## 核心特性

### 1. 开箱即用

无需任何配置或初始化,直接调用即可:

```typescript
import { DefaultLogger } from 'koatty_logger';

DefaultLogger.info('应用启动');
DefaultLogger.error('错误信息', new Error('something went wrong'));
DefaultLogger.debug('调试信息', { userId: 123 });
```

**默认行为**:
- 日志级别: `info` (记录 info, warn, error)
- 缓冲模式: 禁用 (日志立即输出,无延迟)
- 输出目标: console 和文件(如果配置了路径)

### 2. 动态配置

运行时可随时调整配置,无需重启应用:

```typescript
// 方式1: 使用 configure() 方法
DefaultLogger.configure({
  minLevel: 'debug',
  logFilePath: './logs/app.log',
  sensFields: new Set(['password', 'token'])
});

// 方式2: 使用便捷方法
DefaultLogger.setMinLevel('error');
DefaultLogger.setLogPath('./logs/custom.log');
DefaultLogger.setSensitiveFields(['creditCard', 'ssn']);
```

**热更新支持**:
- 默认使用热更新模式(不重新创建实例)
- 如需完全重新创建,可传入 `hotReload: false`

```typescript
// 热更新(推荐,性能更好)
DefaultLogger.configure({ minLevel: 'debug' });

// 完全重新创建
DefaultLogger.configure({ minLevel: 'debug' }, false);
```

### 3. 便捷方法

提供丰富的便捷方法,简化常用操作:

```typescript
// 日志级别控制
DefaultLogger.setMinLevel('debug');      // 设置最小日志级别
const level = DefaultLogger.getMinLevel(); // 获取当前级别

// 文件路径
DefaultLogger.setLogPath('./logs/app.log');
const path = DefaultLogger.getLogFilePath();

// 敏感字段
DefaultLogger.setSensitiveFields(['password', 'token']);
DefaultLogger.clearSensFields();  // 清空
DefaultLogger.resetSensFields(['newField']);  // 重置

// 缓冲控制
DefaultLogger.enableBuffering({
  maxBufferSize: 200,
  flushInterval: 500,
  flushOnLevel: 'error'
});
DefaultLogger.disableBuffering();

// 采样控制
DefaultLogger.setSamplingRate('api-request', 0.1);  // 10% 采样率

// 手动刷新
await DefaultLogger.flush();

// 获取状态
const stats = DefaultLogger.getStats();
const config = DefaultLogger.getConfig();
const status = DefaultLogger.getStatus();
```

### 4. 容错降级

初始化失败时自动降级到 console 输出,确保应用不会因日志问题而崩溃:

```typescript
// 即使日志器初始化失败,这些调用也不会抛出异常
DefaultLogger.info('这条日志始终会输出');
DefaultLogger.error('错误信息');
```

## 完整配置选项

```typescript
interface LoggerConfig {
  /** 日志级别 (已废弃,建议使用 minLevel) */
  logLevel?: 'debug' | 'info' | 'warning' | 'error';
  
  /** 最小日志级别 - 用于级别过滤 */
  minLevel?: 'debug' | 'info' | 'warn' | 'warning' | 'error';
  
  /** 日志文件路径 */
  logFilePath?: string;
  
  /** 敏感字段集合(自动脱敏) */
  sensFields?: Set<string>;
  
  /** 缓冲配置 */
  buffer?: {
    enableBuffer?: boolean;       // 是否启用缓冲
    maxBufferSize?: number;       // 最大缓冲区大小
    flushInterval?: number;       // 刷新间隔(毫秒)
    flushOnLevel?: 'error' | 'warn' | 'info' | 'debug';  // 立即刷新的级别
  };
  
  /** 采样配置 */
  sampling?: {
    sampleRates?: Map<string, number>;  // 采样率映射
  };
}
```

## 使用场景

### 场景1: 简单Web应用

```typescript
import { DefaultLogger } from 'koatty_logger';

// 开箱即用
DefaultLogger.info('Server started on port 3000');

app.get('/api/users', (req, res) => {
  DefaultLogger.info('Handling user request', { method: req.method, path: req.path });
  // ... 业务逻辑
});
```

### 场景2: 动态调整日志级别

```typescript
import { DefaultLogger } from 'koatty_logger';

// 生产环境只记录错误
if (process.env.NODE_ENV === 'production') {
  DefaultLogger.setMinLevel('error');
}

// 开发环境记录所有日志
if (process.env.NODE_ENV === 'development') {
  DefaultLogger.setMinLevel('debug');
}

// 运行时动态调整(例如通过API)
app.post('/admin/log-level', (req, res) => {
  const { level } = req.body;
  DefaultLogger.setMinLevel(level);
  res.json({ success: true, level });
});
```

### 场景3: 高性能场景

```typescript
import { DefaultLogger } from 'koatty_logger';

// 启用缓冲模式
DefaultLogger.enableBuffering({
  maxBufferSize: 500,      // 缓冲500条
  flushInterval: 100,      // 每100ms刷新一次
  flushOnLevel: 'error'    // error级别立即刷新
});

// 高频日志
for (let i = 0; i < 10000; i++) {
  DefaultLogger.info('High frequency log', { index: i });
}

// 关键操作前手动刷新
await DefaultLogger.flush();
```

### 场景4: 敏感数据脱敏

```typescript
import { DefaultLogger } from 'koatty_logger';

// 配置敏感字段
DefaultLogger.setSensitiveFields([
  'password', 'token', 'secret',
  'creditCard', 'ssn', 'apiKey'
]);

// 敏感数据会自动脱敏
DefaultLogger.info('User login', {
  username: 'john',
  password: 'secret123',  // 会显示为 sec***23
  email: 'john@example.com'
});
```

### 场景5: 日志采样

```typescript
import { DefaultLogger } from 'koatty_logger';

// 设置采样率
DefaultLogger.setSamplingRate('api-request', 0.1);  // 只记录10%

// 高频日志使用采样
app.get('/api/items', (req, res) => {
  DefaultLogger.InfoSampled('api-request', 'API request', {
    method: req.method,
    path: req.path
  });
  // ... 业务逻辑
});
```

## 最佳实践

### 1. 应用启动时配置

```typescript
// app.ts
import { DefaultLogger } from 'koatty_logger';

// 在应用启动时配置一次
DefaultLogger.configure({
  minLevel: process.env.LOG_LEVEL || 'info',
  logFilePath: './logs/app.log',
  sensFields: new Set(['password', 'token', 'secret']),
  buffer: {
    enableBuffer: process.env.NODE_ENV === 'production',
    maxBufferSize: 200,
    flushInterval: 500
  }
});

// 之后在任何地方直接使用
DefaultLogger.info('Application started');
```

### 2. 优雅关闭

```typescript
// 确保所有日志都被写入
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, flushing logs...');
  await DefaultLogger.flush();
  await DefaultLogger.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, flushing logs...');
  await DefaultLogger.flush();
  await DefaultLogger.stop();
  process.exit(0);
});
```

### 3. 错误处理

```typescript
try {
  // 业务逻辑
} catch (error) {
  DefaultLogger.error('Operation failed', error, {
    context: 'user-service',
    userId: 123
  });
  throw error;
}
```

### 4. 性能监控

```typescript
// 定期检查日志统计
setInterval(() => {
  const stats = DefaultLogger.getStats();
  if (stats.buffer.droppedRate > 0.1) {
    console.warn('High log drop rate:', stats.buffer.droppedRate);
  }
}, 60000);
```

## 与 new Logger() 的对比

| 特性 | DefaultLogger | new Logger() |
|------|---------------|--------------|
| 使用方式 | 全局单例,直接导入使用 | 手动创建实例 |
| 配置复杂度 | 简单,提供便捷方法 | 灵活,完全控制 |
| 适用场景 | 单体应用,统一日志管理 | 微服务,独立日志隔离 |
| 初始化 | 懒加载,自动初始化 | 手动创建 |
| 容错 | 自动降级到console | 需要自行处理 |
| 动态调整 | 支持热更新 | 需要重新创建实例 |
| 推荐度 | ⭐⭐⭐⭐⭐ 大多数场景 | ⭐⭐⭐⭐ 特殊场景 |

## FAQ

**Q: DefaultLogger 的默认配置是什么?**

A: 
- 日志级别: `info`
- 缓冲模式: 禁用 (立即输出)
- 日志文件: 无 (仅console输出)
- 敏感字段: 无

**Q: 如何在多个文件中使用 DefaultLogger?**

A: 直接导入即可,无需传递实例:

```typescript
// file1.ts
import { DefaultLogger } from 'koatty_logger';
DefaultLogger.info('From file1');

// file2.ts
import { DefaultLogger } from 'koatty_logger';
DefaultLogger.info('From file2');
```

**Q: DefaultLogger 线程安全吗?**

A: 是的,基于 Winston 实现,支持异步写入,线程安全。

**Q: 如何禁用 DefaultLogger?**

A: 设置日志级别为最高:

```typescript
DefaultLogger.setMinLevel('error');  // 只记录错误
// 或者禁用日志器
DefaultLogger.enable(false);
```

**Q: 性能开销如何?**

A: 
- 禁用缓冲模式: 与直接使用 Logger 相同
- 启用缓冲模式: 高并发场景下性能提升 200-500%
- 采样模式: 可减少 90% 以上的日志开销

## 示例代码

完整示例请参考:
- [综合示例](../examples/default_logger_comprehensive.ts)
- [对比示例](../examples/logger_comparison.ts)

## 总结

`DefaultLogger` 是为简化日志使用而设计的,适合大多数应用场景。如果你需要:
- ✅ 快速开始,零配置
- ✅ 全局统一的日志管理
- ✅ 运行时动态调整
- ✅ 简洁的 API

那么 `DefaultLogger` 是你的最佳选择!

