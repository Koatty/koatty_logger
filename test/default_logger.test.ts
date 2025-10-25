/**
 * DefaultLogger 测试
 * 验证开箱即用、动态配置和容错能力
 */

import { DefaultLogger } from '../src/default_logger';

describe('DefaultLogger Tests', () => {
  // 在每个测试之前清理 DefaultLogger
  beforeEach(() => {
    // 重置 DefaultLogger（通过销毁和重新初始化）
    DefaultLogger.destroy();
  });

  afterEach(() => {
    DefaultLogger.destroy();
  });

  describe('开箱即用', () => {
    test('应该能直接使用而无需初始化', () => {
      expect(() => {
        DefaultLogger.info('Test message');
        DefaultLogger.debug('Debug message');
        DefaultLogger.warn('Warning message');
        DefaultLogger.error('Error message');
      }).not.toThrow();
    });

    test('应该支持大小写方法', () => {
      expect(() => {
        DefaultLogger.Info('Test message');
        DefaultLogger.Debug('Debug message');
        DefaultLogger.Warn('Warning message');
        DefaultLogger.Error('Error message');
      }).not.toThrow();
    });

    test('应该支持 Log 方法', () => {
      expect(() => {
        DefaultLogger.Log('info', 'Test message');
        DefaultLogger.log('debug', 'Debug message');
      }).not.toThrow();
    });

    test('应该能正常处理各种参数类型', () => {
      expect(() => {
        DefaultLogger.info('String message');
        DefaultLogger.info(123);
        DefaultLogger.info({ key: 'value' });
        DefaultLogger.info('message', { data: 'value' }, 123);
        DefaultLogger.info();
      }).not.toThrow();
    });
  });

  describe('动态配置', () => {
    test('应该支持 configure 方法', () => {
      expect(() => {
        DefaultLogger.configure({
          minLevel: 'debug',
          logFilePath: './logs/test.log'
        });
        DefaultLogger.info('After configure');
      }).not.toThrow();
    });

    test('应该支持 setMinLevel 便捷方法', () => {
      expect(() => {
        DefaultLogger.setMinLevel('debug');
        DefaultLogger.debug('Debug message after setMinLevel');
      }).not.toThrow();
    });

    test('应该支持 setLogPath 便捷方法', () => {
      expect(() => {
        DefaultLogger.setLogPath('./logs/custom.log');
        DefaultLogger.info('After setLogPath');
      }).not.toThrow();
    });

    test('应该支持 setSensitiveFields 便捷方法', () => {
      expect(() => {
        DefaultLogger.setSensitiveFields(['password', 'token']);
        DefaultLogger.info('User data', {
          username: 'john',
          password: 'secret123'
        });
      }).not.toThrow();
    });

    test('应该能在使用前配置', () => {
      DefaultLogger.configure({
        minLevel: 'info',
        logFilePath: './logs/app.log'
      });

      expect(() => {
        DefaultLogger.info('Application started');
      }).not.toThrow();

      const config = DefaultLogger.getConfig();
      expect(config.minLevel).toBe('info');
      expect(config.logFilePath).toBe('./logs/app.log');
    });

    test('应该能在使用后重新配置', () => {
      // 先使用
      DefaultLogger.info('First message');

      // 再配置
      DefaultLogger.configure({
        minLevel: 'debug',
        logFilePath: './logs/new.log'
      });

      // 继续使用
      expect(() => {
        DefaultLogger.debug('After reconfigure');
      }).not.toThrow();
    });
  });

  describe('状态查询', () => {
    test('应该能获取配置', () => {
      DefaultLogger.configure({
        minLevel: 'info',
        logFilePath: './logs/test.log'
      });

      const config = DefaultLogger.getConfig();
      expect(config).toHaveProperty('minLevel');
      expect(config).toHaveProperty('logFilePath');
      expect(config.minLevel).toBe('info');
    });

    test('应该能检查初始化状态', () => {
      // 初始状态
      expect(DefaultLogger.isInitialized()).toBe(false);

      // 使用后
      DefaultLogger.info('Test');
      expect(DefaultLogger.isInitialized()).toBe(true);
    });

    test('应该能获取详细状态', () => {
      const status = DefaultLogger.getStatus();
      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('failed');
      expect(status).toHaveProperty('usingFallback');
    });
  });

  describe('ILogger 接口兼容性', () => {
    test('应该实现所有 ILogger 方法', () => {
      // 日志方法
      expect(typeof DefaultLogger.Debug).toBe('function');
      expect(typeof DefaultLogger.Info).toBe('function');
      expect(typeof DefaultLogger.Warn).toBe('function');
      expect(typeof DefaultLogger.Error).toBe('function');
      expect(typeof DefaultLogger.debug).toBe('function');
      expect(typeof DefaultLogger.info).toBe('function');
      expect(typeof DefaultLogger.warn).toBe('function');
      expect(typeof DefaultLogger.error).toBe('function');
      expect(typeof DefaultLogger.Log).toBe('function');
      expect(typeof DefaultLogger.log).toBe('function');

      // 配置方法
      expect(typeof DefaultLogger.enable).toBe('function');
      expect(typeof DefaultLogger.getLevel).toBe('function');
      expect(typeof DefaultLogger.setLevel).toBe('function');
      expect(typeof DefaultLogger.getLogFilePath).toBe('function');
      expect(typeof DefaultLogger.setLogFilePath).toBe('function');
      expect(typeof DefaultLogger.setLogPath).toBe('function');
      expect(typeof DefaultLogger.getSensFields).toBe('function');
      expect(typeof DefaultLogger.setSensFields).toBe('function');
      expect(typeof DefaultLogger.clearSensFields).toBe('function');
      expect(typeof DefaultLogger.resetSensFields).toBe('function');
      
      // 增强功能方法
      expect(typeof DefaultLogger.configureBuffering).toBe('function');
      expect(typeof DefaultLogger.configureSampling).toBe('function');
      expect(typeof DefaultLogger.getStats).toBe('function');
      expect(typeof DefaultLogger.flush).toBe('function');
      expect(typeof DefaultLogger.stop).toBe('function');
      
      // 销毁方法
      expect(typeof DefaultLogger.destroy).toBe('function');
    });

    test('应该能调用所有配置方法', () => {
      expect(() => {
        DefaultLogger.enable(true);
        DefaultLogger.setLevel('info');
        const level = DefaultLogger.getLevel();
        expect(level).toBeTruthy();

        DefaultLogger.setSensFields(['password']);
        const fields = DefaultLogger.getSensFields();
        expect(fields).toBeInstanceOf(Set);

        DefaultLogger.clearSensFields();
        DefaultLogger.resetSensFields(['token']);

        // 增强功能配置
        DefaultLogger.configureBuffering({ maxBufferSize: 200 });
        DefaultLogger.configureSampling('test-key', 0.5);
        DefaultLogger.setMinLevel('info');
        const minLevel = DefaultLogger.getMinLevel();
        expect(minLevel).toBeTruthy();
      }).not.toThrow();
    });

    test('应该支持异步方法', async () => {
      await expect(DefaultLogger.flush()).resolves.not.toThrow();
      await expect(DefaultLogger.stop()).resolves.not.toThrow();
    });
  });

  describe('增强功能方法', () => {
    test('应该支持采样日志方法', () => {
      expect(() => {
        DefaultLogger.DebugSampled('key1', 'Debug message');
        DefaultLogger.InfoSampled('key2', 'Info message');
        DefaultLogger.WarnSampled('key3', 'Warn message');
        DefaultLogger.ErrorSampled('key4', 'Error message');
      }).not.toThrow();
    });

    test('应该支持配置采样率', () => {
      expect(() => {
        DefaultLogger.configureSampling('test-key', 0.5);
      }).not.toThrow();
    });

    test('应该支持配置缓冲', () => {
      expect(() => {
        DefaultLogger.configureBuffering({
          maxBufferSize: 150,
          flushInterval: 2000
        });
      }).not.toThrow();
    });

    test('应该支持获取统计信息', () => {
      DefaultLogger.info('Test message');
      const stats = DefaultLogger.getStats();
      
      // stats 可能为 null（如果使用基础 Logger）或有值（如果使用 EnhancedLogger）
      if (stats) {
        expect(stats).toHaveProperty('buffer');
        expect(stats).toHaveProperty('sampling');
        expect(stats).toHaveProperty('minLevel');
      }
    });

    test('应该支持 flush 和 stop 方法', async () => {
      await expect(DefaultLogger.flush()).resolves.not.toThrow();
      await expect(DefaultLogger.stop()).resolves.not.toThrow();
    });
  });

  describe('容错能力', () => {
    test('即使初始化部分失败，日志方法也不应抛出异常', () => {
      // 测试各种可能的错误情况
      expect(() => {
        DefaultLogger.info('Test message 1');
        DefaultLogger.debug('Test message 2');
        DefaultLogger.warn('Test message 3');
        DefaultLogger.error('Test message 4');
      }).not.toThrow();
    });

    test('配置错误不应导致后续日志失败', () => {
      expect(() => {
        // 尝试一些可能导致错误的配置
        DefaultLogger.configure({
          minLevel: 'debug',
          logFilePath: './logs/test.log'
        });
        
        DefaultLogger.info('After potentially problematic config');
      }).not.toThrow();
    });

    test('销毁后应该能重新使用', () => {
      DefaultLogger.info('Before destroy');
      DefaultLogger.destroy();
      
      expect(() => {
        DefaultLogger.info('After destroy');
      }).not.toThrow();
    });
  });

  describe('实际使用场景', () => {
    test('场景1: 应用启动时直接使用', () => {
      expect(() => {
        DefaultLogger.info('Application starting...');
        DefaultLogger.info('Loading configuration...');
        DefaultLogger.info('Connecting to database...');
        DefaultLogger.info('Application started successfully');
      }).not.toThrow();
    });

    test('场景2: 配置后使用', () => {
      expect(() => {
        // 在应用初始化时配置
        DefaultLogger.configure({
          minLevel: 'info',
          logFilePath: './logs/app.log',
          sensFields: new Set(['password', 'token', 'secret'])
        });

        // 在应用运行时使用
        DefaultLogger.info('User login', {
          username: 'john',
          password: 'secret123', // 将被脱敏
          timestamp: new Date()
        });

        DefaultLogger.warn('High memory usage', {
          usage: '85%',
          threshold: '80%'
        });
      }).not.toThrow();
    });

    test('场景3: 分步配置', () => {
      expect(() => {
        // 先设置日志级别
        DefaultLogger.setMinLevel('debug');

        // 使用
        DefaultLogger.debug('Debug enabled');

        // 再设置文件路径
        DefaultLogger.setLogPath('./logs/custom.log');

        // 继续使用
        DefaultLogger.info('Logging to custom file');

        // 添加敏感字段
        DefaultLogger.setSensitiveFields(['apiKey', 'sessionId']);

        // 继续使用
        DefaultLogger.info('Protected data', {
          apiKey: 'abc123xyz',
          data: 'some data'
        });
      }).not.toThrow();
    });

    test('场景4: 高并发日志', () => {
      expect(() => {
        // 模拟高并发场景
        for (let i = 0; i < 100; i++) {
          DefaultLogger.info(`Request ${i}`);
          if (i % 10 === 0) {
            DefaultLogger.debug(`Checkpoint ${i}`);
          }
        }
      }).not.toThrow();
    });

    test('场景5: 错误处理', () => {
      expect(() => {
        try {
          throw new Error('Something went wrong');
        } catch (error) {
          DefaultLogger.error('Caught error', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
        }
      }).not.toThrow();
    });
  });

  describe('与 Logger/EnhancedLogger 的比较', () => {
    test('DefaultLogger 应该提供与 Logger 相同的基础功能', () => {
      // DefaultLogger 的方法签名应该与 Logger 兼容
      const testFn = (logger: { info: (...args: any[]) => void }) => {
        logger.info('Test message');
      };

      expect(() => {
        testFn(DefaultLogger);
      }).not.toThrow();
    });

    test('DefaultLogger 应该是单例', () => {
      // 多次引用应该是同一个实例
      DefaultLogger.configure({ minLevel: 'debug' });
      DefaultLogger.info('Test 1');

      const config1 = DefaultLogger.getConfig();
      
      // 再次使用
      DefaultLogger.info('Test 2');
      
      const config2 = DefaultLogger.getConfig();

      // 配置应该相同
      expect(config1.minLevel).toBe(config2.minLevel);
    });
  });
});

