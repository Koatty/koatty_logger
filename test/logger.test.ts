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
  return jest.fn().mockImplementation(() => {
    const listeners: Record<string, Function[]> = {};
    return {
      debug: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
      close: jest.fn(),
      on: jest.fn().mockImplementation((event: string, callback: Function) => {
        if (!listeners[event]) {
          listeners[event] = [];
        }
        listeners[event].push(callback);
        return this;
      }),
      emit: jest.fn().mockImplementation((event: string, ...args: any[]) => {
        if (listeners[event]) {
          listeners[event].forEach(callback => callback(...args));
        }
        return true;
      })
    };
  });
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

}); 