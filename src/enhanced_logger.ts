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
  protected logWithFilter(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
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
        args: [message, ...args]
      };
      this.bufferedLogger.addLog(entry);
    } else {
      // 直接调用父类方法
      switch (level) {
        case 'debug':
          super.Debug(message, ...args);
          break;
        case 'info':
          super.Info(message, ...args);
          break;
        case 'warn':
          super.Warn(message, ...args);
          break;
        case 'error':
          super.Error(message, ...args);
          break;
      }
    }
  }

  /**
   * 重写日志方法
   */
  Debug(message: string, ...args: any[]): void {
    this.logWithFilter('debug', message, ...args);
  }

  Info(message: string, ...args: any[]): void {
    this.logWithFilter('info', message, ...args);
  }

  Warn(message: string, ...args: any[]): void {
    this.logWithFilter('warn', message, ...args);
  }

  Error(message: string, ...args: any[]): void {
    this.logWithFilter('error', message, ...args);
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

