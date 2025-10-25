# Fatal 日志级别使用指南

## 概述

`fatal` 是 koatty_logger v2.7+ 新增的最高级别日志,专门用于记录导致进程退出的致命错误。

## 问题背景

### 异步日志的困境

koatty_logger 默认使用异步日志写入以提升性能,但在进程即将退出时会导致日志丢失:

```typescript
// ❌ 问题代码
logger.error('Critical database error!');
process.exit(1);  // 进程立即退出,日志还在异步队列中,丢失!
```

**原因**: 
- `error()` 使用 `setImmediate` 异步写入
- `process.exit()` 立即终止进程
- 异步回调还未执行,日志丢失

### Fatal 的解决方案

`fatal` 级别使用**同步写入**,确保日志在进程退出前写入完成:

```typescript
// ✅ 解决方案
logger.fatal('Critical database error!');
process.exit(1);  // 日志已同步写入,不会丢失
```

---

## 核心特性

### 1. 同步写入

```typescript
DefaultLogger.fatal('Application crashed', error);
// 日志已立即写入,无需等待
```

- 不使用 `setImmediate`
- 直接写入 Winston
- 双重输出(文件 + console)

### 2. 最高优先级

```typescript
// 级别优先级
debug: 0
info: 1
warning: 2
error: 3
fatal: 4  // 最高
```

- 总是被记录
- 触发立即刷新缓冲区
- 不受级别过滤影响

### 3. 双重输出

```typescript
DefaultLogger.fatal('Fatal error');

// 输出1: Winston 文件日志
// [2025-10-25 22:56:49.375]  FATAL Fatal error

// 输出2: Console 错误流
// [FATAL] Fatal error
```

确保即使文件写入失败,console 也能看到错误。

### 4. 自动刷新缓冲

```typescript
DefaultLogger.enableBuffering({
  maxBufferSize: 100,
  flushOnLevel: 'error'
});

DefaultLogger.info('Buffered log');  // 缓冲
DefaultLogger.fatal('Fatal error');  // 立即刷新所有缓冲
```

---

## API 文档

### fatal() / Fatal()

```typescript
/**
 * Fatal - 致命错误 (同步写入,确保不丢失)
 * 用于记录导致进程退出的严重错误
 */
DefaultLogger.fatal(...args: any[]): void;
DefaultLogger.Fatal(...args: any[]): void;  // 大写版本
```

**示例**:
```typescript
// 记录错误消息
DefaultLogger.fatal('Database connection failed');

// 记录错误对象
DefaultLogger.fatal('Uncaught exception', error);

// 记录多个参数
DefaultLogger.fatal('Critical error', { userId: 123, action: 'payment' }, error);
```

### fatalAndExit()

```typescript
/**
 * fatalAndExit - 记录 fatal 日志并优雅退出
 * 
 * @param message - 错误信息
 * @param exitCode - 退出码,默认 1
 * @param error - 错误对象(可选)
 * @returns Promise<never>
 */
async fatalAndExit(
  message: string,
  exitCode?: number,
  error?: Error
): Promise<never>;
```

**流程**:
1. 记录 fatal 日志(同步)
2. 刷新所有缓冲区
3. 等待日志写入完成
4. 清理所有资源
5. 退出进程

**示例**:
```typescript
// 最简单
await DefaultLogger.fatalAndExit('Cannot start application');

// 指定退出码
await DefaultLogger.fatalAndExit('Database error', 1);

// 包含错误对象
await DefaultLogger.fatalAndExit('Unhandled exception', 1, error);
```

---

## 使用场景

### 1. 未捕获异常

```typescript
// 全局异常处理
process.on('uncaughtException', async (error) => {
  await DefaultLogger.fatalAndExit('Uncaught exception', 1, error);
});

process.on('unhandledRejection', async (reason, promise) => {
  await DefaultLogger.fatalAndExit(
    'Unhandled promise rejection',
    1,
    reason as Error
  );
});
```

### 2. 关键资源初始化失败

```typescript
class Application {
  async start() {
    try {
      await this.initDatabase();
      await this.initCache();
      await this.startServer();
    } catch (error) {
      // 无法继续运行
      await DefaultLogger.fatalAndExit(
        'Failed to initialize application',
        1,
        error as Error
      );
    }
  }

  private async initDatabase() {
    try {
      await db.connect();
    } catch (error) {
      DefaultLogger.fatal('Database connection failed', error);
      throw error;
    }
  }
}
```

### 3. 配置错误

```typescript
function loadConfig() {
  try {
    const config = require('./config.json');
    return config;
  } catch (error) {
    DefaultLogger.fatal('Failed to load configuration', error);
    process.exit(1);
  }
}
```

### 4. 优雅关闭

```typescript
// SIGTERM 信号处理
process.on('SIGTERM', async () => {
  DefaultLogger.info('Received SIGTERM, shutting down gracefully...');
  
  try {
    await app.close();
    await DefaultLogger.flush();
    await DefaultLogger.stop();
    process.exit(0);
  } catch (error) {
    await DefaultLogger.fatalAndExit('Failed to shutdown gracefully', 1, error as Error);
  }
});
```

---

## 最佳实践

### ✅ 推荐

```typescript
// 1. 进程退出前使用 fatal
try {
  criticalOperation();
} catch (error) {
  DefaultLogger.fatal('Critical operation failed', error);
  process.exit(1);
}

// 2. 使用 fatalAndExit (最推荐)
try {
  await initApp();
} catch (error) {
  await DefaultLogger.fatalAndExit('Init failed', 1, error as Error);
}

// 3. 设置全局异常处理器
process.on('uncaughtException', async (error) => {
  await DefaultLogger.fatalAndExit('Uncaught exception', 1, error);
});

// 4. 关键错误后手动 flush
logger.error('Important error');
await logger.flush();  // 确保写入完成
```

### ❌ 避免

```typescript
// ❌ 不要在高频场景使用
for (let i = 0; i < 10000; i++) {
  logger.fatal('test');  // 同步写入会严重影响性能!
}

// ❌ 不要忘记 await
logger.fatalAndExit('Error', 1);  // 错误!返回 Promise

// ✅ 应该
await logger.fatalAndExit('Error', 1);

// ❌ 不要在正常流程使用 fatal
if (user.age < 18) {
  logger.fatal('User too young');  // 错误!这不是致命错误
}

// ✅ 应该
if (user.age < 18) {
  logger.warn('User too young');
}
```

---

## 性能考虑

### 同步 vs 异步

| 操作 | 方法 | 速度 | 适用场景 |
|------|------|------|---------|
| 异步日志 | `info/warn/error` | 快 (基准) | 普通日志,高频场景 |
| 同步日志 | `fatal` | 慢 ~100x | 致命错误,进程退出 |

### 性能测试

```typescript
// 异步日志 - 1000条
console.time('async');
for (let i = 0; i < 1000; i++) {
  logger.info('test');
}
console.timeEnd('async');  // ~5ms

// 同步日志 - 1000条
console.time('sync');
for (let i = 0; i < 1000; i++) {
  logger.fatal('test');
}
console.timeEnd('sync');  // ~500ms
```

**结论**: 
- Fatal 慢 100 倍
- 但 fatal 是低频操作(进程退出时)
- 性能影响完全可接受

---

## 与其他级别对比

| 级别 | 写入方式 | 适用场景 | 进程退出 |
|------|---------|---------|---------|
| `debug` | 异步 | 调试信息 | ❌ |
| `info` | 异步 | 普通信息 | ❌ |
| `warn` | 异步 | 警告信息 | ❌ |
| `error` | 异步 | 错误信息 | ❌ 可能丢失 |
| `fatal` | **同步** | **致命错误** | **✅ 不会丢失** |

---

## 配置

### 缓冲配置

```typescript
DefaultLogger.configure({
  buffer: {
    enableBuffer: true,
    maxBufferSize: 100,
    flushInterval: 1000,
    flushOnLevel: 'error'  // 或 'fatal'
  }
});
```

**注意**: 即使启用缓冲,`fatal` 也会:
1. 同步写入自身
2. 触发缓冲区立即刷新

### 级别过滤

```typescript
DefaultLogger.setMinLevel('error');

DefaultLogger.debug('不会记录');
DefaultLogger.info('不会记录');
DefaultLogger.warn('不会记录');
DefaultLogger.error('会记录');
DefaultLogger.fatal('总是记录');  // Fatal 总是记录,不受过滤影响
```

---

## 常见问题

### Q1: Fatal 和 Error 有什么区别?

**A**: 
- `error`: 异步写入,性能好,可能丢失
- `fatal`: 同步写入,确保不丢失,性能差

### Q2: 什么时候用 fatal?

**A**: 
- 进程即将退出
- 未捕获异常
- 关键资源初始化失败
- 系统无法继续运行

### Q3: Fatal 会影响性能吗?

**A**: 
- 会,比异步慢 ~100 倍
- 但 fatal 是低频操作
- 影响完全可接受

### Q4: Fatal 一定要退出进程吗?

**A**: 
- 不一定
- 但 fatal 的设计目的就是记录导致退出的错误
- 如果不退出,应该用 `error`

### Q5: fatalAndExit 和 fatal + process.exit 有什么区别?

**A**: 
- `fatalAndExit`: 自动 flush + 清理 + 退出
- `fatal + process.exit`: 只记录 + 立即退出
- 推荐使用 `fatalAndExit`

---

## 示例代码

完整示例请查看: `examples/fatal_example.ts`

运行示例:
```bash
npx ts-node examples/fatal_example.ts
```

---

## 总结

### 核心要点

1. ✅ **Fatal 使用同步写入** - 不会因进程退出而丢失
2. ✅ **最高优先级** - 总是被记录,不受过滤影响
3. ✅ **双重输出** - 同时写入文件和 console
4. ✅ **立即刷新** - 触发缓冲区立即刷新
5. ⚠️ **性能考虑** - 比异步慢 100 倍,仅在进程退出时使用

### 推荐用法

```typescript
// 方式1: 简单直接
DefaultLogger.fatal('Critical error');
process.exit(1);

// 方式2: 优雅退出(推荐)
await DefaultLogger.fatalAndExit('Critical error', 1);

// 方式3: 全局异常处理
process.on('uncaughtException', async (error) => {
  await DefaultLogger.fatalAndExit('Uncaught exception', 1, error);
});
```

Fatal 日志级别的引入,彻底解决了异步日志在进程退出时丢失的问题! 🎉

