/*
 * @Description: DefaultLogger - 默认日志器单例，开箱即用，支持动态配置
 * @Usage: import { DefaultLogger } from 'koatty_logger'
 * @Author: richen
 * @Date: 2025-10-25
 * @LastEditTime: 2025-10-25
 */

import { Logger } from './logger';
import { LoggerConfig } from './types';
import { LogLevelType, ILogger } from './interface';

/**
 * DefaultLogger 类 - 单例模式，懒加载，容错
 * 
 * 设计理念：
 * 1. 开箱即用：无需显式初始化，直接调用即可
 * 2. 动态配置：支持运行时通过 configure() 方法配置
 * 3. 容错降级：初始化失败自动降级到 console 输出
 * 4. 懒加载：第一次调用日志方法时才真正创建实例
 */
class DefaultLoggerClass implements ILogger {
  private _instance: Logger | null = null;
  private _config: LoggerConfig = {
    buffer: {
      enableBuffer: true,
      maxBufferSize: 100,
      flushInterval: 1000,
      flushOnLevel: 'error'
    }
  };
  private _initialized = false;
  private _initFailed = false;

  /**
   * 获取或创建日志器实例（懒加载）
   */
  private getInstance(): Logger {
    if (this._instance) {
      return this._instance;
    }

    if (!this._initialized) {
      this._initialized = true;
      try {
        // 直接使用 Logger（已整合所有增强功能）
        this._instance = new Logger({
          logLevel: this._config.minLevel as any || this._config.logLevel as any || 'info',
          logFilePath: this._config.logFilePath,
          sensFields: this._config.sensFields,
          buffer: this._config.buffer,
          sampling: this._config.sampling,
          minLevel: this._config.minLevel
        });
      } catch (error) {
        // 初始化失败，使用 console fallback
        this._initFailed = true;
        console.error('[DefaultLogger] Failed to initialize Logger, using console fallback:', error);
        this._instance = this.createConsoleFallback();
      }
    }

    return this._instance!;
  }

  /**
   * 创建 console fallback 实例
   * 当所有初始化都失败时，提供最基本的日志输出能力
   */
  private createConsoleFallback(): any {
    const consoleFallback = {
      Debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
      Info: (...args: any[]) => console.info('[INFO]', ...args),
      Warn: (...args: any[]) => console.warn('[WARN]', ...args),
      Error: (...args: any[]) => console.error('[ERROR]', ...args),
      debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
      info: (...args: any[]) => console.info('[INFO]', ...args),
      warn: (...args: any[]) => console.warn('[WARN]', ...args),
      error: (...args: any[]) => console.error('[ERROR]', ...args),
      Log: (name: string, ...args: any[]) => console.log(`[${name.toUpperCase()}]`, ...args),
      log: (name: string, ...args: any[]) => console.log(`[${name.toUpperCase()}]`, ...args),
      
      // 配置方法（空实现）
      enable: () => { },
      getLevel: () => 'info' as LogLevelType,
      setLevel: () => { },
      getLogFilePath: () => '',
      setLogFilePath: () => { },
      getSensFields: () => new Set<string>(),
      setSensFields: () => { },
      clearSensFields: () => { },
      resetSensFields: () => { },
      destroy: async () => { }
    };

    return consoleFallback;
  }

  /**
   * 配置 DefaultLogger
   * 可以在实例化前或实例化后调用
   * 
   * @param config - 日志器配置
   * @example
   * ```typescript
   * // 在使用前配置
   * DefaultLogger.configure({
   *   minLevel: 'debug',
   *   logFilePath: './logs/app.log'
   * });
   * 
   * // 之后直接使用
   * DefaultLogger.info('Application started');
   * ```
   */
  configure(config: Partial<LoggerConfig>): void {
    // 合并配置
    this._config = {
      ...this._config,
      ...config,
      buffer: {
        ...this._config.buffer,
        ...config.buffer
      }
    };

    // 如果已经初始化，需要重新创建实例
    if (this._initialized && this._instance && !this._initFailed) {
      try {
        // 先销毁旧实例
        if ('destroy' in this._instance && typeof this._instance.destroy === 'function') {
          this._instance.destroy();
        }
        
        // 重新创建
        this._initialized = false;
        this._instance = null;
        this.getInstance();
      } catch (error) {
        console.error('[DefaultLogger] Failed to reconfigure:', error);
      }
    }
  }

  /**
   * 设置日志级别（便捷方法）
   * 等同于 configure({ minLevel: level })
   */
  setMinLevel(level: LogLevelType): void {
    this.configure({ minLevel: level });
    // 如果实例已存在，同步更新
    if (this._instance && 'setMinLevel' in this._instance) {
      this._instance.setMinLevel(level);
    }
  }

  /**
   * 获取最小日志级别（便捷方法）
   */
  getMinLevel(): LogLevelType | null {
    if (this._instance && 'getMinLevel' in this._instance) {
      return this._instance.getMinLevel();
    }
    return this._config.minLevel || null;
  }

  /**
   * 设置日志文件路径
   * 便捷方法，等同于 configure({ logFilePath: path })
   */
  setLogPath(path: string): void {
    this.configure({ logFilePath: path });
    // 如果实例已存在，同步更新
    if (this._instance && 'setLogFilePath' in this._instance) {
      this._instance.setLogFilePath(path);
    }
  }

  /**
   * 设置敏感字段
   * 便捷方法，等同于 configure({ sensFields: new Set(fields) })
   */
  setSensitiveFields(fields: string[]): void {
    this.configure({ sensFields: new Set(fields) });
    // 如果实例已存在，同步更新
    if (this._instance && 'setSensFields' in this._instance) {
      this._instance.setSensFields(fields);
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): LoggerConfig {
    return { ...this._config };
  }

  /**
   * 检查是否初始化成功
   */
  isInitialized(): boolean {
    return this._initialized && !this._initFailed;
  }

  /**
   * 获取初始化状态
   */
  getStatus(): { initialized: boolean; failed: boolean; usingFallback: boolean } {
    return {
      initialized: this._initialized,
      failed: this._initFailed,
      usingFallback: this._initFailed
    };
  }

  // ============ ILogger 接口实现 - 代理到实际实例 ============

  Debug(...args: any[]): void {
    this.getInstance().Debug(...args);
  }

  Info(...args: any[]): void {
    this.getInstance().Info(...args);
  }

  Warn(...args: any[]): void {
    this.getInstance().Warn(...args);
  }

  Error(...args: any[]): void {
    this.getInstance().Error(...args);
  }

  debug(...args: any[]): void {
    this.getInstance().debug(...args);
  }

  info(...args: any[]): void {
    this.getInstance().info(...args);
  }

  warn(...args: any[]): void {
    this.getInstance().warn(...args);
  }

  error(...args: any[]): void {
    this.getInstance().error(...args);
  }

  Log(name: string, ...args: any[]): void {
    this.getInstance().Log(name, ...args);
  }

  log(name: string, ...args: any[]): void {
    this.getInstance().log(name, ...args);
  }

  enable(b?: boolean): void {
    this.getInstance().enable(b);
  }

  getLevel(): LogLevelType {
    return this.getInstance().getLevel();
  }

  setLevel(level: LogLevelType): void {
    this.getInstance().setLevel(level);
  }

  getLogFilePath(): string {
    return this.getInstance().getLogFilePath();
  }

  setLogFilePath(f: string): void {
    this.getInstance().setLogFilePath(f);
  }

  getSensFields(): Set<string> {
    return this.getInstance().getSensFields();
  }

  setSensFields(fields: string[]): void {
    this.getInstance().setSensFields(fields);
  }

  clearSensFields(): void {
    this.getInstance().clearSensFields();
  }

  resetSensFields(fields: string[]): void {
    this.getInstance().resetSensFields(fields);
  }

  async destroy(): Promise<void> {
    if (this._instance && 'destroy' in this._instance) {
      await this._instance.destroy();
    }
    this._instance = null;
    this._initialized = false;
    this._initFailed = false;
  }

  // ============ 增强功能方法 ============

  /**
   * 采样日志方法
   */
  DebugSampled(key: string, message: string, ...args: any[]): void {
    const instance = this.getInstance() as any;
    if ('DebugSampled' in instance) {
      instance.DebugSampled(key, message, ...args);
    } else {
      instance.Debug(message, ...args);
    }
  }

  InfoSampled(key: string, message: string, ...args: any[]): void {
    const instance = this.getInstance() as any;
    if ('InfoSampled' in instance) {
      instance.InfoSampled(key, message, ...args);
    } else {
      instance.Info(message, ...args);
    }
  }

  WarnSampled(key: string, message: string, ...args: any[]): void {
    const instance = this.getInstance() as any;
    if ('WarnSampled' in instance) {
      instance.WarnSampled(key, message, ...args);
    } else {
      instance.Warn(message, ...args);
    }
  }

  ErrorSampled(key: string, message: string, ...args: any[]): void {
    const instance = this.getInstance() as any;
    if ('ErrorSampled' in instance) {
      instance.ErrorSampled(key, message, ...args);
    } else {
      instance.Error(message, ...args);
    }
  }

  /**
   * 配置缓冲
   */
  configureBuffering(config: any): void {
    const instance = this.getInstance();
    if ('configureBuffering' in instance) {
      instance.configureBuffering(config);
    }
  }

  /**
   * 配置采样
   */
  configureSampling(key: string, rate: number): void {
    const instance = this.getInstance();
    if ('configureSampling' in instance) {
      instance.configureSampling(key, rate);
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): any {
    const instance = this.getInstance();
    if ('getStats' in instance) {
      return instance.getStats();
    }
    return null;
  }

  /**
   * 手动刷新缓冲区
   */
  async flush(): Promise<void> {
    const instance = this.getInstance();
    if ('flush' in instance) {
      await instance.flush();
    }
  }

  /**
   * 停止日志器
   */
  async stop(): Promise<void> {
    const instance = this.getInstance();
    if ('stop' in instance) {
      await instance.stop();
    }
  }
}

/**
 * 导出默认日志器单例
 * 
 * 使用方式：
 * ```typescript
 * import { DefaultLogger } from 'koatty_logger';
 * 
 * // 直接使用（开箱即用）
 * DefaultLogger.info('Application started');
 * 
 * // 配置后使用
 * DefaultLogger.configure({
 *   minLevel: 'debug',
 *   logFilePath: './logs/app.log',
 *   sensFields: new Set(['password', 'token'])
 * });
 * DefaultLogger.debug('Debug info');
 * 
 * // 或使用便捷方法
 * DefaultLogger.setLogLevel('debug');
 * DefaultLogger.setLogFilePath('./logs/app.log');
 * DefaultLogger.setSensitiveFields(['password', 'token']);
 * ```
 */
export const DefaultLogger = new DefaultLoggerClass();


