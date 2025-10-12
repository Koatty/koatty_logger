/**
 * EnhancedLogger 兼容性测试
 * 确保 EnhancedLogger 可以无缝替换 Logger
 */

import { Logger } from '../src/logger';
import { EnhancedLogger } from '../src/enhanced_logger';
import { LogLevelType } from '../src/interface';

describe('EnhancedLogger Compatibility Tests', () => {
  let logger: Logger;
  let enhancedLogger: EnhancedLogger;

  beforeEach(() => {
    logger = new Logger();
    enhancedLogger = new EnhancedLogger();
  });

  afterEach(() => {
    logger.destroy();
    enhancedLogger.destroy();
  });

  describe('基础方法兼容性', () => {
    test('应该支持所有 Logger 的日志方法', () => {
      // 大写方法
      expect(() => enhancedLogger.Debug('test')).not.toThrow();
      expect(() => enhancedLogger.Info('test')).not.toThrow();
      expect(() => enhancedLogger.Warn('test')).not.toThrow();
      expect(() => enhancedLogger.Error('test')).not.toThrow();

      // 小写方法
      expect(() => enhancedLogger.debug('test')).not.toThrow();
      expect(() => enhancedLogger.info('test')).not.toThrow();
      expect(() => enhancedLogger.warn('test')).not.toThrow();
      expect(() => enhancedLogger.error('test')).not.toThrow();

      // 通用方法
      expect(() => enhancedLogger.Log('info', 'test')).not.toThrow();
      expect(() => enhancedLogger.log('debug', 'test')).not.toThrow();
    });

    test('应该支持相同的参数类型', () => {
      // 字符串
      enhancedLogger.Info('string message');
      
      // 数字
      enhancedLogger.Info(123);
      
      // 对象
      enhancedLogger.Info({ key: 'value' });
      
      // 多参数
      enhancedLogger.Info('message', { data: 'value' }, 123);
      
      // 无参数
      enhancedLogger.Info();
    });
  });

  describe('配置方法兼容性', () => {
    test('应该支持 enable 方法', () => {
      expect(() => enhancedLogger.enable(true)).not.toThrow();
      expect(() => enhancedLogger.enable(false)).not.toThrow();
    });

    test('应该支持 getLevel/setLevel 方法', () => {
      const level: LogLevelType = 'info';
      enhancedLogger.setLevel(level);
      expect(enhancedLogger.getLevel()).toBe(level);
    });

    test('应该支持敏感字段方法', () => {
      const fields = ['password', 'token'];
      
      enhancedLogger.setSensFields(fields);
      expect(enhancedLogger.getSensFields().size).toBeGreaterThan(0);
      
      enhancedLogger.clearSensFields();
      expect(enhancedLogger.getSensFields().size).toBe(0);
      
      enhancedLogger.resetSensFields(fields);
      expect(enhancedLogger.getSensFields().size).toBe(fields.length);
    });

    test('应该支持批量配置方法', () => {
      enhancedLogger.enableBatch(true);
      
      const config = {
        enabled: true,
        maxSize: 200,
        flushInterval: 2000
      };
      
      enhancedLogger.setBatchConfig(config);
      const retrievedConfig = enhancedLogger.getBatchConfig();
      expect(retrievedConfig.maxSize).toBe(200);
      expect(retrievedConfig.flushInterval).toBe(2000);
    });

    test('应该支持批量状态方法', () => {
      const status = enhancedLogger.getBatchStatus();
      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('bufferSize');
    });
  });

  describe('类型兼容性', () => {
    test('EnhancedLogger 应该可以赋值给 Logger 类型', () => {
      // TypeScript 类型检查
      const loggerInstance: Logger = new EnhancedLogger();
      expect(loggerInstance).toBeInstanceOf(Logger);
      expect(loggerInstance).toBeInstanceOf(EnhancedLogger);
    });

    test('应该可以作为 Logger 使用', () => {
      function logSomething(logger: Logger, message: string) {
        logger.Info(message);
        logger.Debug(message);
        logger.Warn(message);
        logger.Error(message);
      }

      // 使用 Logger
      expect(() => logSomething(logger, 'test with Logger')).not.toThrow();
      
      // 使用 EnhancedLogger
      expect(() => logSomething(enhancedLogger, 'test with EnhancedLogger')).not.toThrow();
    });
  });

  describe('新增功能（向后兼容）', () => {
    test('应该支持新的统计方法', () => {
      const stats = enhancedLogger.getStats();
      expect(stats).toHaveProperty('buffer');
      expect(stats).toHaveProperty('sampling');
      expect(stats).toHaveProperty('minLevel');
    });

    test('应该支持采样日志方法', () => {
      expect(() => enhancedLogger.DebugSampled('key', 'message')).not.toThrow();
      expect(() => enhancedLogger.InfoSampled('key', 'message')).not.toThrow();
      expect(() => enhancedLogger.WarnSampled('key', 'message')).not.toThrow();
      expect(() => enhancedLogger.ErrorSampled('key', 'message')).not.toThrow();
    });

    test('应该支持配置采样率', () => {
      expect(() => enhancedLogger.configureSampling('test', 0.5)).not.toThrow();
    });

    test('应该支持配置缓冲', () => {
      expect(() => enhancedLogger.configureBuffering({ maxBufferSize: 150 })).not.toThrow();
    });

    test('应该支持 flush 和 stop 方法', async () => {
      await expect(enhancedLogger.flush()).resolves.not.toThrow();
      await expect(enhancedLogger.stop()).resolves.not.toThrow();
    });
  });

  describe('无缝升级场景', () => {
    test('从 Logger 升级到 EnhancedLogger - 基础用法', () => {
      // 旧代码（使用 Logger）
      const oldLogger = new Logger();
      oldLogger.Info('Old logger message');
      oldLogger.setLevel('debug');
      oldLogger.destroy();

      // 新代码（升级到 EnhancedLogger）
      const newLogger = new EnhancedLogger();
      newLogger.Info('New logger message');
      newLogger.setLevel('debug');
      newLogger.destroy();

      // 两者行为应该一致
      expect(oldLogger).toBeInstanceOf(Logger);
      expect(newLogger).toBeInstanceOf(Logger);
      expect(newLogger).toBeInstanceOf(EnhancedLogger);
    });

    test('从 Logger 升级到 EnhancedLogger - 批量配置', () => {
      // 旧代码
      const oldLogger = new Logger({
        logLevel: 'info',
        batchConfig: {
          enabled: true,
          maxSize: 100
        }
      });

      // 新代码（使用相同配置）
      const newLogger = new EnhancedLogger({
        minLevel: 'info',
        buffer: {
          enableBuffer: true,
          maxBufferSize: 100
        }
      });

      expect(oldLogger.getBatchConfig().enabled).toBe(true);
      expect(newLogger.getStats().buffer.bufferSize).toBeDefined();

      oldLogger.destroy();
      newLogger.destroy();
    });

    test('从 Logger 升级到 EnhancedLogger - 敏感字段', () => {
      const sensitiveFields = ['password', 'token', 'secret'];

      // 旧代码
      const oldLogger = new Logger({
        sensFields: new Set(sensitiveFields)
      });

      // 新代码
      const newLogger = new EnhancedLogger({
        sensFields: new Set(sensitiveFields)
      });

      expect(oldLogger.getSensFields().size).toBe(sensitiveFields.length);
      expect(newLogger.getSensFields().size).toBe(sensitiveFields.length);

      oldLogger.destroy();
      newLogger.destroy();
    });
  });

  describe('方法签名兼容性', () => {
    test('所有方法应该接受相同的参数', () => {
      // 测试各种参数组合
      const testCases = [
        [],
        ['message'],
        ['message', { data: 'value' }],
        ['message', 1, 2, 3],
        [{ obj: 'value' }],
        [null],
        [undefined],
        ['msg', null, undefined, 0, false]
      ];

      testCases.forEach(args => {
        expect(() => logger.Info(...args)).not.toThrow();
        expect(() => enhancedLogger.Info(...args)).not.toThrow();
        
        expect(() => logger.Debug(...args)).not.toThrow();
        expect(() => enhancedLogger.Debug(...args)).not.toThrow();
      });
    });

    test('Log 方法应该接受相同的参数', () => {
      const levels = ['debug', 'info', 'warn', 'warning', 'error'];
      
      levels.forEach(level => {
        expect(() => logger.Log(level, 'message')).not.toThrow();
        expect(() => enhancedLogger.Log(level, 'message')).not.toThrow();
        
        expect(() => logger.log(level, 'message', { data: 'value' })).not.toThrow();
        expect(() => enhancedLogger.log(level, 'message', { data: 'value' })).not.toThrow();
      });
    });
  });
});

