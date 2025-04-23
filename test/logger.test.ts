import * as fs from 'fs';
import * as path from 'path';
import { LogLevelType, LoggerOpt } from '../src/interface';
import { Logger } from '../src/logger';

// 模拟winston的Logger
jest.mock('winston', () => {
  const mFormat = {
    combine: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn()
  };
  const mTransports = {
    Console: jest.fn()
  };
  return {
    createLogger: jest.fn().mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
      close: jest.fn()
    }),
    format: mFormat,
    transports: mTransports
  };
});

// 模拟winston-daily-rotate-file
jest.mock('winston-daily-rotate-file', () => {
  return jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    close: jest.fn()
  }));
});

// 模拟koatty_lib
jest.mock('koatty_lib', () => {
  return {
    isTrueEmpty: jest.fn().mockReturnValue(false),
    isError: jest.fn().mockImplementation((obj) => obj instanceof Error),
  };
});

describe('Logger', () => {
  let logger: Logger;
  const testConfig: LoggerOpt = {
    logLevel: 'debug' as LogLevelType,
    logFilePath: './logs',
    sensFields: new Set(['password', 'token'])
  };

  beforeEach(() => {
    // 清理之前的实例
    (Logger as any)._instance = null;
    (Logger as any)._config = null;
    logger = Logger.getInstance(testConfig);
    // 使用假定时器
    jest.useFakeTimers();
  });

  afterEach(() => {
    // 清理测试文件
    const logDir = './logs';
    if (fs.existsSync(logDir)) {
      fs.readdirSync(logDir).forEach(file => {
        fs.unlinkSync(path.join(logDir, file));
      });
      fs.rmdirSync(logDir);
    }
    // 清理日志实例
    if (logger) {
      logger.destroy();
    }
    // 清理定时器
    jest.useRealTimers();
  });

  // 测试单例模式
  describe('Singleton Pattern', () => {
    test('should return the same instance when getInstance is called multiple times', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('should create a new instance when configuration changes', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance({
        ...testConfig,
        logLevel: 'info'
      });
      expect(instance1).not.toBe(instance2);
    });
  });

  // 测试日志级别
  describe('Log Levels', () => {
    test('should set and get log level', () => {
      logger.setLevel('info');
      expect(logger.getLevel()).toBe('info');
    });

    test('should not set invalid log level', () => {
      const originalLevel = logger.getLevel();
      logger.setLevel('invalid' as LogLevelType);
      expect(logger.getLevel()).toBe(originalLevel);
    });
  });

  // 测试日志文件路径
  describe('Log File Path', () => {
    test('should set and get log file path', () => {
      const path = './test-logs';
      logger.setLogFilePath(path);
      expect(logger.getLogFilePath()).toBe(path);
    });

    test('should not set empty log file path', () => {
      const originalPath = logger.getLogFilePath();
      logger.setLogFilePath('');
      expect(logger.getLogFilePath()).toBe(originalPath);
    });
  });

  // 测试敏感字段
  describe('Sensitive Fields', () => {
    test('should set and get sensitive fields', () => {
      const fields = ['password', 'token', 'secret'];
      logger.setSensFields(fields);
      expect(Array.from(logger.getSensFields())).toEqual(expect.arrayContaining(fields));
    });

    test('should not set empty sensitive fields', () => {
      const originalFields = Array.from(logger.getSensFields());
      logger.setSensFields([]);
      expect(Array.from(logger.getSensFields())).toEqual(originalFields);
    });
  });

  // 测试日志方法
  describe('Log Methods', () => {
    test('should log debug message', () => {
      const spy = jest.spyOn(logger as any, 'printLog');
      logger.debug('test message');
      expect(spy).toHaveBeenCalledWith('debug', '', ['test message']);
    });

    test('should log info message', () => {
      const spy = jest.spyOn(logger as any, 'printLog');
      logger.info('test message');
      expect(spy).toHaveBeenCalledWith('info', '', ['test message']);
    });

    test('should log warning message', () => {
      const spy = jest.spyOn(logger as any, 'printLog');
      logger.warn('test message');
      expect(spy).toHaveBeenCalledWith('warning', '', ['test message']);
    });

    test('should log error message', () => {
      const spy = jest.spyOn(logger as any, 'printLog');
      logger.error('test message');
      expect(spy).toHaveBeenCalledWith('error', '', ['test message']);
    });
  });

  // 测试日志缓冲
  describe('Log Buffering', () => {
    test('should buffer logs when buffering is enabled', () => {
      logger.setBufferOptions(5, 1000, true);
      logger.info('message 1');
      logger.info('message 2');
      logger.info('message 3');
      expect((logger as any).logBuffer.length).toBe(3);
      logger.flushBuffer();
      expect((logger as any).logBuffer.length).toBe(0);
    });

    test('should automatically flush buffer when it reaches the size limit', () => {
      logger.setBufferOptions(2, 1000, true);
      logger.info('message 1');
      logger.info('message 2');
      logger.info('message 3');
      expect((logger as any).logBuffer.length).toBe(1);
    });

    test('should destroy logger and flush buffer', () => {
      logger.setBufferOptions(5, 1000, true);
      logger.info('message 1');
      logger.info('message 2');
      logger.destroy();
      expect((logger as any).logBuffer.length).toBe(0);
    });
  });

  // 测试敏感信息处理
  describe('Sensitive Information Handling', () => {
    test('should mask sensitive fields in logs', () => {
      // 启用缓冲
      logger.setBufferOptions(5, 1000, true);

      const sensitiveData = {
        username: 'test',
        password: 'secret123',
        token: 'abc123'
      };
      logger.info(sensitiveData);

      const buffer = (logger as any).logBuffer;
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer[0].args[0]).toHaveProperty('password');
      expect(buffer[0].args[0].password).not.toBe('secret123');
      expect(buffer[0].args[0].password).toBe('se*****23');  // 长度为9，保留4个字符，5个星号
      expect(buffer[0].args[0].token).toBe('ab**23');      // 长度为6，保留4个字符，2个星号
    });

    test('should handle short sensitive fields correctly', () => {
      logger.setBufferOptions(5, 1000, true);
      // 添加短字符串敏感字段
      logger.setSensFields(['pin', 'code', 'key']);

      const shortSensitiveData = {
        pin: '12',
        code: 'a',
        key: 'xyz'
      };
      logger.info(shortSensitiveData);

      const buffer = (logger as any).logBuffer;
      expect(buffer.length).toBeGreaterThan(0);
      // 规则1：所有小于4个字符的字符串都应该完全替换为 *
      expect(buffer[0].args[0].code).toBe('*');      // 长度为1
      expect(buffer[0].args[0].pin).toBe('**');      // 长度为2
      expect(buffer[0].args[0].key).toBe('***');     // 长度为3
    });

    test('should handle medium sensitive fields correctly', () => {
      logger.setBufferOptions(5, 1000, true);
      // 添加中等长度字符串敏感字段
      logger.setSensFields(['pin', 'code']);

      const mediumSensitiveData = {
        pin: '1234',
        code: 'abcd'
      };
      logger.info(mediumSensitiveData);

      const buffer = (logger as any).logBuffer;
      expect(buffer.length).toBeGreaterThan(0);
      // 规则2：4个字符时，替换为 A**B
      expect(buffer[0].args[0].pin).toBe('1**4');
      expect(buffer[0].args[0].code).toBe('a**d');
    });

    test('should handle long sensitive fields correctly', () => {
      logger.setBufferOptions(5, 1000, true);

      const longSensitiveData = {
        password: 'verylongpassword123',
        token: 'abcdefghijklmnop',
        secret: '123456789'
      };
      logger.setSensFields(['password', 'token', 'secret']);
      logger.info(longSensitiveData);

      const buffer = (logger as any).logBuffer;
      expect(buffer.length).toBeGreaterThan(0);
      // 规则3：大于等于5个字符时，替换为 AB*CD，*的个数根据字符串长度决定
      expect(buffer[0].args[0].password).toBe('ve***************23');  // 长度为17，保留4个字符，13个星号
      expect(buffer[0].args[0].token).toBe('ab************op');     // 长度为16，保留4个字符，12个星号
      expect(buffer[0].args[0].secret).toBe('12*****89');          // 长度为9，保留4个字符，5个星号
    });
  });
}); 