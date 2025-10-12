/*
 * @Description: Enhanced logger with buffering, sampling, and level filtering
 * @Usage: Advanced logger with performance optimization features
 * @Author: richen
 * @Date: 2025-10-12
 * @LastEditTime: 2025-10-12
 */
import { Logger, LoggerOpt } from './logger';
import { BufferedLogger } from './buffered_logger';
import { SamplingLogger } from './sampling';
import { LogLevelFilter } from './level_filter';
import { LoggerConfig, LogEntry, LogStats, BufferConfig } from './types';

/**
 * 增强的日志器
 * 集成批量处理、采样、级别过滤功能
 * 
 * @description
 * EnhancedLogger 完全兼容 Logger，继承了所有 Logger 的公共方法：
 * - enable(b: boolean): 启用/禁用日志
 * - getLevel(): 获取日志级别
 * - setLevel(level): 设置日志级别（已增强）
 * - getLogFilePath(): 获取日志文件路径
 * - setLogFilePath(path): 设置日志文件路径
 * - getSensFields(): 获取敏感字段
 * - setSensFields(fields): 设置敏感字段
 * - clearSensFields(): 清除敏感字段
 * - resetSensFields(fields): 重置敏感字段
 * - enableBatch(enabled): 启用/禁用批量写入
 * - setBatchConfig(config): 设置批量配置
 * - getBatchConfig(): 获取批量配置
 * - getBatchStatus(): 获取批量状态
 * - flushBatch(): 刷新批量日志
 * - destroy(): 销毁日志器（已增强）
 * 
 * 新增功能：
 * - 高级缓冲控制（自动根据环境调整）
 * - 日志采样（减少高频日志）
 * - 级别过滤（动态控制输出级别）
 * - 统计信息（getStats）
 */
export class EnhancedLogger extends Logger {
  private bufferedLogger: BufferedLogger;
  private samplingLogger: SamplingLogger;
  private levelFilter: LogLevelFilter;
  private enableBuffering: boolean;

  constructor(config: LoggerConfig = {}) {
    // 将 LoggerConfig 转换为 LoggerOpt
    const loggerOpt: LoggerOpt = {
      logLevel: config.minLevel as any || 'info',
      logFilePath: config.logFilePath,
      sensFields: config.sensFields,
      batchConfig: config.batchConfig
    };
    
    super(loggerOpt);

    // 初始化缓冲处理器
    this.bufferedLogger = new BufferedLogger(config.buffer);
    this.bufferedLogger.setFlushCallback((entries: LogEntry[]) => {
      this.flushEntries(entries);
    });

    // 初始化采样器
    this.samplingLogger = new SamplingLogger();
    if (config.sampling?.sampleRates) {
      config.sampling.sampleRates.forEach((rate, key) => {
        this.samplingLogger.setSampleRate(key, rate);
      });
    }

    // 初始化级别过滤器
    const minLevel = config.minLevel || 
      (process.env.LOG_LEVEL as any) ||
      (process.env.NODE_ENV === 'test' ? 'debug' : 'info');
    this.levelFilter = new LogLevelFilter(minLevel);

    // 在测试和开发环境禁用批量写入，确保日志实时性
    const isDevOrTest = process.env.NODE_ENV === 'test' || 
                        process.env.NODE_ENV === 'development';
    this.enableBuffering = config.buffer?.enableBuffer !== false && !isDevOrTest;
  }

  /**
   * 批量刷新日志
   */
  private flushEntries(entries: LogEntry[]): void {
    for (const entry of entries) {
      const { level, args } = entry;
      
      // 调用父类的原生方法
      switch (level) {
        case 'debug':
          super.Debug(...args);
          break;
        case 'info':
          super.Info(...args);
          break;
        case 'warning':
          super.Warn(...args);
          break;
        case 'error':
          super.Error(...args);
          break;
      }
    }
  }

  /**
   * 内部日志方法（protected 以避免与父类冲突）
   */
  protected logWithFilter(level: 'debug' | 'info' | 'warn' | 'error', args: any[]): void {
    // 级别过滤
    if (!this.levelFilter.shouldLog(level)) {
      return;
    }

    // 转换 warn 为 warning 以匹配 LogLevelType
    const logLevel: 'debug' | 'info' | 'warning' | 'error' = 
      level === 'warn' ? 'warning' : level as any;

    // 启用缓冲时添加到缓冲区
    if (this.enableBuffering) {
      const entry: LogEntry = {
        level: logLevel,
        name: '',
        timestamp: Date.now(),
        args: args
      };
      this.bufferedLogger.addLog(entry);
    } else {
      // 直接调用父类方法
      switch (level) {
        case 'debug':
          super.Debug(...args);
          break;
        case 'info':
          super.Info(...args);
          break;
        case 'warn':
          super.Warn(...args);
          break;
        case 'error':
          super.Error(...args);
          break;
      }
    }
  }

  /**
   * 重写日志方法 - 保持与父类相同的签名
   */
  Debug(...args: any[]): void {
    this.logWithFilter('debug', args);
  }

  Info(...args: any[]): void {
    this.logWithFilter('info', args);
  }

  Warn(...args: any[]): void {
    this.logWithFilter('warn', args);
  }

  Error(...args: any[]): void {
    this.logWithFilter('error', args);
  }

  /**
   * 小写方法别名 - 保持与父类相同的签名
   */
  debug(...args: any[]): void {
    this.logWithFilter('debug', args);
  }

  info(...args: any[]): void {
    this.logWithFilter('info', args);
  }

  warn(...args: any[]): void {
    this.logWithFilter('warn', args);
  }

  error(...args: any[]): void {
    this.logWithFilter('error', args);
  }

  /**
   * 通用日志方法 - 保持与父类相同的签名
   */
  Log(name: string, ...args: any[]): void {
    // 转换 name 为日志级别
    const level = name.toLowerCase() as 'debug' | 'info' | 'warn' | 'warning' | 'error';
    
    // 处理 warning 映射
    if (level === 'warning' || level === 'warn') {
      this.logWithFilter('warn', args);
    } else if (level === 'debug' || level === 'info' || level === 'error') {
      this.logWithFilter(level, args);
    } else {
      // 如果不是标准级别，直接调用父类方法
      super.Log(name, ...args);
    }
  }

  log(name: string, ...args: any[]): void {
    this.Log(name, ...args);
  }

  /**
   * 采样日志方法
   */
  DebugSampled(key: string, message: string, ...args: any[]): void {
    if (this.samplingLogger.shouldSample(key)) {
      this.Debug(message, ...args);
    }
  }

  InfoSampled(key: string, message: string, ...args: any[]): void {
    if (this.samplingLogger.shouldSample(key)) {
      this.Info(message, ...args);
    }
  }

  WarnSampled(key: string, message: string, ...args: any[]): void {
    if (this.samplingLogger.shouldSample(key)) {
      this.Warn(message, ...args);
    }
  }

  ErrorSampled(key: string, message: string, ...args: any[]): void {
    if (this.samplingLogger.shouldSample(key)) {
      this.Error(message, ...args);
    }
  }

  /**
   * 配置方法
   */
  configureBuffering(config: Partial<BufferConfig>): void {
    this.bufferedLogger.updateConfig(config);
    this.enableBuffering = config.enableBuffer !== false;
  }

  configureSampling(key: string, rate: number): void {
    this.samplingLogger.setSampleRate(key, rate);
  }

  setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.levelFilter.setMinLevel(level);
    // 同时设置父类的日志级别
    super.setLevel(level as any);
  }

  /**
   * 获取统计信息
   */
  getStats(): LogStats {
    return {
      buffer: this.bufferedLogger.getStats(),
      sampling: this.samplingLogger.getStats(),
      minLevel: this.levelFilter.getMinLevel()
    };
  }

  /**
   * 手动刷新
   */
  async flush(): Promise<void> {
    await this.bufferedLogger.flush();
  }

  /**
   * 停止日志器
   */
  async stop(): Promise<void> {
    await this.bufferedLogger.stop();
  }

  /**
   * 重写 destroy 方法
   */
  destroy(): void {
    // 先停止 buffered logger
    this.bufferedLogger.stop().catch(e => {
      console.error('Error stopping buffered logger:', e);
    });
    // 然后调用父类的 destroy
    super.destroy();
  }
}

