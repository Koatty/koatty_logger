/*
 * @Description: Logger test cases
 * @Author: richen
 * @Date: 2023-01-01 00:00:00
 */

import { Logger } from '../src/logger';
import { ShieldLog, ShieldField } from '../src/shield';
import * as fs from 'fs';
import * as path from 'path';

describe('Logger Security Tests', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  afterEach(() => {
    if (logger) {
      logger.destroy();
    }
  });

  test('should fix error method bug', () => {
    // 验证error方法现在使用正确的日志级别
    const mockLogger = jest.spyOn(logger as any, 'printLog');
    logger.error('test error');
    expect(mockLogger).toHaveBeenCalledWith('error', '', ['test error']);
  });

  test('should prevent path traversal attacks', () => {
    // 测试路径遍历攻击防护
    expect(() => {
      logger.setLogFilePath('../../../etc/passwd');
    }).toThrow('Log path must be within');

    expect(() => {
      logger.setLogFilePath('/etc/passwd');
    }).toThrow('Log path must be within');

    expect(() => {
      logger.setLogFilePath('logs/../../../sensitive.log');
    }).toThrow('Log path must be within');
  });

  test('should prevent log injection attacks', () => {
    // 测试日志注入攻击防护
    const maliciousInput = 'Normal log\r\n[FAKE] Injected log entry\n';
    const sanitizeInput = (logger as any).sanitizeInput(maliciousInput);
    
    // 验证控制字符被过滤
    expect(sanitizeInput).not.toContain('\r');
    expect(sanitizeInput).not.toContain('\n');
    expect(sanitizeInput).toBe('Normal log  [FAKE] Injected log entry ');
  });

  test('should filter dangerous characters in paths', () => {
    const dangerousPaths = [
      'log<script>.log',
      'log|command.log',
      'log?query.log',
      'log*.log'
    ];

    dangerousPaths.forEach(path => {
      expect(() => {
        logger.setLogFilePath(path);
      }).toThrow('Log path contains invalid characters');
    });
  });

  test('should allow safe paths', () => {
    expect(() => {
      logger.setLogFilePath('app.log');
    }).not.toThrow();

    expect(() => {
      logger.setLogFilePath('subdir/app.log');
    }).not.toThrow();
  });
});

describe('Logger Performance Tests', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  afterEach(() => {
    if (logger) {
      logger.destroy();
    }
  });

  test('should manage sensitive fields memory efficiently', () => {
    // 测试敏感字段内存管理
    const initialSize = logger.getSensFields().size;
    
    // 添加字段
    logger.setSensFields(['password', 'token']);
    expect(logger.getSensFields().size).toBe(initialSize + 2);
    
    // 清理字段
    logger.clearSensFields();
    expect(logger.getSensFields().size).toBe(0);
    
    // 重置字段
    logger.resetSensFields(['newField']);
    expect(logger.getSensFields().size).toBe(1);
    expect(logger.getSensFields().has('newField')).toBe(true);
  });

  test('should handle deep objects with recursion limit', () => {
    // 创建深层嵌套对象
    let deepObj: any = {};
    let current = deepObj;
    for (let i = 0; i < 15; i++) {
      current.nested = { level: i };
      current = current.nested;
    }

    const sensitiveFields = new Set(['password']);
    const result = ShieldLog(deepObj, sensitiveFields);
    
    // 验证递归深度限制生效
    expect(JSON.stringify(result)).toContain('[Object: too deep]');
  });

  test('should efficiently handle arrays', () => {
    const largeArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `value${i}` }));
    const sensitiveFields = new Set(['value']);
    
    const startTime = Date.now();
    const result = ShieldLog(largeArray, sensitiveFields);
    const endTime = Date.now();
    
    // 性能测试：处理1000个元素应该在合理时间内完成
    expect(endTime - startTime).toBeLessThan(200);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1000);
  });
});

describe('Logger Functionality Tests', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  afterEach(() => {
    if (logger) {
      logger.destroy();
    }
  });

  test('should create logger instance', () => {
    expect(logger).toBeInstanceOf(Logger);
    expect(logger.getLevel()).toBe('debug');
  });

  test('should manage log levels', () => {
    logger.setLevel('error');
    expect(logger.getLevel()).toBe('error');
    
    logger.setLevel('info');
    expect(logger.getLevel()).toBe('info');
  });

  test('should handle sensitive field masking', () => {
    const testData = {
      username: 'testuser',
      password: 'secret123',
      email: 'test@example.com'
    };

    logger.setSensFields(['password']);
    const sensitiveFields = logger.getSensFields();
    const maskedData = ShieldLog(testData, sensitiveFields);

    expect(maskedData.username).toBe('testuser');
    expect(maskedData.password).not.toBe('secret123');
    expect(maskedData.password).toContain('*');
    expect(maskedData.email).toBe('test@example.com');
  });

  test('should handle various data types', () => {
    const testCases = [
      'string',
      123,
      true,
      null,
      undefined,
      { object: 'value' },
      ['array', 'items'],
      new Error('test error')
    ];

    testCases.forEach(testCase => {
      expect(() => {
        logger.info(testCase);
      }).not.toThrow();
    });
  });
});

describe('ShieldField Tests', () => {
  test('should mask different length strings correctly', () => {
    // 测试不同长度字符串的脱敏
    expect(ShieldField('a').res).toBe('*');
    expect(ShieldField('ab').res).toBe('b*');
    expect(ShieldField('abc').res).toBe('a*c');
    expect(ShieldField('abcdef').res).toBe('ab**ef');
    expect(ShieldField('abcdefghij').res).toBe('abc****hij');
  });

  test('should handle empty and special strings', () => {
    expect(ShieldField('').res).toBe('*');
    expect(ShieldField('密码').res).toBe('码*');
    expect(ShieldField('测试密码').res).toBe('测**码');
  });
});

describe('Logger Batch Writing Tests', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  afterEach(() => {
    if (logger) {
      logger.destroy();
    }
  });

  test('should create logger with batch config', () => {
    const batchLogger = new Logger({
      batchConfig: {
        enabled: true,
        maxSize: 50,
        flushInterval: 500,
        maxWaitTime: 2000
      }
    });

    const config = batchLogger.getBatchConfig();
    expect(config.enabled).toBe(true);
    expect(config.maxSize).toBe(50);
    expect(config.flushInterval).toBe(500);
    expect(config.maxWaitTime).toBe(2000);

    batchLogger.destroy();
  });

  test('should buffer logs when batch enabled', () => {
    logger.enableBatch(true);
    
    // 添加一些日志
    logger.info('test1');
    logger.debug('test2');
    logger.warn('test3');

    const status = logger.getBatchStatus();
    expect(status.enabled).toBe(true);
    expect(status.bufferSize).toBe(3);
  });

  test('should flush buffer manually', async () => {
    logger.enableBatch(true);
    
    // 添加日志到缓冲区
    logger.info('buffered log 1');
    logger.info('buffered log 2');
    
    expect(logger.getBatchStatus().bufferSize).toBe(2);
    
    // 手动异步刷新
    await logger.flushBatch();
    
    expect(logger.getBatchStatus().bufferSize).toBe(0);
  });

  test('should auto flush when buffer size exceeded', () => {
    logger.setBatchConfig({
      enabled: true,
      maxSize: 3,
      flushInterval: 100
    });

    // 添加超过maxSize的日志
    logger.info('log1');
    logger.info('log2');
    logger.info('log3');
    
    // 给异步刷新一点时间
    return new Promise(resolve => {
      setTimeout(() => {
        expect(logger.getBatchStatus().bufferSize).toBe(0); // 应该已经自动刷新
        resolve(undefined);
      }, 10);
    });
  });

  test('should flush on timer interval', (done) => {
    logger.setBatchConfig({
      enabled: true,
      maxSize: 100,
      flushInterval: 100,
      maxWaitTime: 200
    });

    // 添加一些日志
    logger.info('timer test 1');
    logger.info('timer test 2');
    
    expect(logger.getBatchStatus().bufferSize).toBe(2);

    // 等待定时器触发
    setTimeout(() => {
      expect(logger.getBatchStatus().bufferSize).toBe(0);
      done();
    }, 250);
  });

  test('should handle batch config updates', () => {
    // 初始禁用批量写入
    expect(logger.getBatchStatus().enabled).toBe(false);
    
    // 启用批量写入
    logger.enableBatch(true);
    expect(logger.getBatchStatus().enabled).toBe(true);
    
    // 更新配置
    logger.setBatchConfig({
      maxSize: 200,
      flushInterval: 2000
    });
    
    const config = logger.getBatchConfig();
    expect(config.enabled).toBe(true);
    expect(config.maxSize).toBe(200);
    expect(config.flushInterval).toBe(2000);
    
    // 禁用批量写入
    logger.enableBatch(false);
    expect(logger.getBatchStatus().enabled).toBe(false);
  });

  test('should handle destroy with buffered logs', async () => {
    logger.enableBatch(true);
    
    // 添加一些日志
    logger.info('will be flushed on destroy');
    logger.error('another buffered log');
    
    expect(logger.getBatchStatus().bufferSize).toBe(2);
    
    // 销毁应该异步刷新缓冲区
    logger.destroy();
    
    // 给异步操作一点时间
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // 验证日志已被处理（这里主要是确保不抛出异常）
    expect(() => logger.info('should not work')).not.toThrow();
  });

  test('should handle high-frequency logging efficiently', async () => {
    logger.setBatchConfig({
      enabled: true,
      maxSize: 500,
      flushInterval: 50
    });

    const startTime = Date.now();
    
    // 模拟高频日志写入
    for (let i = 0; i < 1000; i++) {
      logger.info(`High frequency log ${i}`, { index: i, data: `data${i}` });
    }
    
    const endTime = Date.now();
    
    // 批量写入应该比逐个写入更快 - 调整为适应CI/CD环境的期望值
    expect(endTime - startTime).toBeLessThan(300);
    
    // 手动异步刷新剩余的日志
    await logger.flushBatch();
  });

  test('should maintain log order in batch mode', async () => {
    const logSpy = jest.spyOn(logger as any, 'writeLogEntry');
    
    logger.enableBatch(true);
    
    // 按顺序添加日志
    const logs = ['first', 'second', 'third'];
    logs.forEach(log => logger.info(log));
    
    // 手动异步刷新
    await logger.flushBatch();
    
    // 验证日志顺序
    expect(logSpy).toHaveBeenCalledTimes(3);
    logs.forEach((log, index) => {
      const call = logSpy.mock.calls[index];
      const logEntry = call[0] as any; // 类型断言
      expect(logEntry.args).toContain(log);
    });
    
    logSpy.mockRestore();
  });
}); 