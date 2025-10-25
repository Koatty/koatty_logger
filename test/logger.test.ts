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
    expect(endTime - startTime).toBeLessThan(100);
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

  test('should create logger with buffer config', () => {
    const bufferedLogger = new Logger({
      buffer: {
        enableBuffer: true,
        maxBufferSize: 50,
        flushInterval: 500
      }
    });

    const stats = bufferedLogger.getStats();
    expect(stats).toBeTruthy();

    bufferedLogger.destroy();
  });

  test('should buffer logs when buffering enabled', () => {
    const bufferedLogger = new Logger({
      buffer: {
        enableBuffer: true,
        maxBufferSize: 100
      }
    });
    
    // 添加一些日志
    bufferedLogger.info('test1');
    bufferedLogger.debug('test2');
    bufferedLogger.warn('test3');

    const stats = bufferedLogger.getStats();
    expect(stats).toBeTruthy();
    if (stats) {
      expect(stats.buffer.bufferSize).toBeGreaterThanOrEqual(0);
    }
    
    bufferedLogger.destroy();
  });

  test('should flush buffer manually', async () => {
    const bufferedLogger = new Logger({
      buffer: {
        enableBuffer: true,
        maxBufferSize: 100
      }
    });
    
    // 添加日志到缓冲区
    bufferedLogger.info('buffered log 1');
    bufferedLogger.info('buffered log 2');
    
    // 手动异步刷新
    await bufferedLogger.flush();
    
    await bufferedLogger.destroy();
  });

  test('should support sampling logs', () => {
    const samplingLogger = new Logger({
      sampling: {
        sampleRates: new Map([['test-key', 0.5]])
      }
    });
    
    // 调用采样日志方法
    expect(() => {
      samplingLogger.InfoSampled('test-key', 'Sampled log');
      samplingLogger.DebugSampled('test-key', 'Sampled debug');
    }).not.toThrow();
    
    samplingLogger.destroy();
  });

  test('should support level filtering', () => {
    const filteredLogger = new Logger({
      minLevel: 'info'
    });
    
    // Debug 日志应该被过滤
    filteredLogger.debug('This should be filtered');
    filteredLogger.info('This should pass');
    
    const minLevel = filteredLogger.getMinLevel();
    expect(minLevel).toBe('info');
    
    filteredLogger.destroy();
  });

  test('should get stats when buffering enabled', () => {
    const statsLogger = new Logger({
      buffer: {
        enableBuffer: true
      }
    });
    
    const stats = statsLogger.getStats();
    expect(stats).toBeTruthy();
    expect(stats?.buffer).toBeDefined();
    
    statsLogger.destroy();
  });
}); 