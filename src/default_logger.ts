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
    // 默认不启用缓冲,确保开箱即用时日志立即输出
    // 用户可以通过 configure() 方法启用缓冲以获得更好的性能
    buffer: {
      enableBuffer: false,  // 开箱即用:立即输出,无延迟
      maxBufferSize: 100,
      flushInterval: 1000,
      flushOnLevel: 'error'
    },
    minLevel: 'info'  // 默认日志级别
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
   * @param hotReload - 是否热更新(不重新创建实例),默认 true
   * @example
   * ```typescript
   * // 在使用前配置
   * DefaultLogger.configure({
   *   minLevel: 'debug',
   *   logFilePath: './logs/app.log'
   * });
   * 
   * // 运行时动态调整
   * DefaultLogger.configure({
   *   minLevel: 'error'  // 只记录错误日志
   * });
   * 
   * // 启用高性能缓冲模式
   * DefaultLogger.configure({
   *   buffer: {
   *     enableBuffer: true,
   *     maxBufferSize: 200,
   *     flushInterval: 500
   *   }
   * });
   * ```
   */
  configure(config: Partial<LoggerConfig>, hotReload: boolean = true): void {
    // 合并配置
    this._config = {
      ...this._config,
      ...config,
      buffer: {
        ...this._config.buffer,
        ...config.buffer
      }
    };

    // 如果已经初始化，支持热更新或重新创建
    if (this._initialized && this._instance && !this._initFailed) {
      try {
        if (hotReload) {
          // 热更新模式:直接更新现有实例的配置
          if (config.minLevel !== undefined && 'setMinLevel' in this._instance) {
            this._instance.setMinLevel(config.minLevel);
          }
          if (config.logLevel !== undefined && 'setLevel' in this._instance) {
            this._instance.setLevel(config.logLevel);
          }
          if (config.logFilePath !== undefined && 'setLogFilePath' in this._instance) {
            this._instance.setLogFilePath(config.logFilePath);
          }
          if (config.sensFields !== undefined && 'resetSensFields' in this._instance) {
            this._instance.resetSensFields(Array.from(config.sensFields));
          }
          if (config.buffer !== undefined && 'configureBuffering' in this._instance) {
            this._instance.configureBuffering(config.buffer);
          }
          if (config.sampling !== undefined && 'configureSampling' in this._instance) {
            // 配置采样率
            if (config.sampling.sampleRates) {
              config.sampling.sampleRates.forEach((rate, key) => {
                this._instance!.configureSampling(key, rate);
              });
            }
          }
        } else {
          // 完全重新创建实例
          if ('destroy' in this._instance && typeof this._instance.destroy === 'function') {
            this._instance.destroy();
          }
          
          this._initialized = false;
          this._instance = null;
          this.getInstance();
        }
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
    if (this._instance && 'resetSensFields' in this._instance) {
      this._instance.resetSensFields(fields);
    }
  }

  /**
   * 启用缓冲模式 - 高性能场景
   * @param config - 缓冲配置,可选
   */
  enableBuffering(config?: { maxBufferSize?: number; flushInterval?: number; flushOnLevel?: 'error' | 'warn' | 'info' | 'debug' }): void {
    const bufferConfig = {
      enableBuffer: true,
      maxBufferSize: config?.maxBufferSize ?? 100,
      flushInterval: config?.flushInterval ?? 1000,
      flushOnLevel: config?.flushOnLevel ?? ('error' as const)
    };
    this.configure({ buffer: bufferConfig });
  }

  /**
   * 禁用缓冲模式 - 实时输出
   */
  disableBuffering(): void {
    this.configure({ buffer: { enableBuffer: false } });
  }

  /**
   * 设置采样率
   * @param key - 采样键
   * @param rate - 采样率 (0-1)
   */
  setSamplingRate(key: string, rate: number): void {
    if (this._instance && 'configureSampling' in this._instance) {
      this._instance.configureSampling(key, rate);
    } else {
      // 保存到配置中,等待实例创建
      if (!this._config.sampling) {
        this._config.sampling = { sampleRates: new Map() };
      }
      if (!this._config.sampling.sampleRates) {
        this._config.sampling.sampleRates = new Map();
      }
      this._config.sampling.sampleRates.set(key, rate);
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

  Fatal(...args: any[]): void {
    this.getInstance().Fatal(...args);
  }

  fatal(...args: any[]): void {
    this.getInstance().fatal(...args);
  }

  /**
   * 记录 fatal 日志并优雅退出
   * @param message - 错误信息
   * @param exitCode - 退出码,默认 1
   * @param error - 错误对象(可选)
   */
  async fatalAndExit(
    message: string,
    exitCode?: number,
    error?: Error
  ): Promise<never> {
    const instance = this.getInstance();
    if ('fatalAndExit' in instance) {
      return await instance.fatalAndExit(message, exitCode, error);
    }
    // Fallback
    console.error('[FATAL]', message, error);
    process.exit(exitCode || 1);
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
 * ## 特性
 * - ✅ **开箱即用**: 无需配置,直接调用即可
 * - ✅ **动态配置**: 运行时可随时调整日志级别、路径、缓冲等
 * - ✅ **容错降级**: 初始化失败自动降级到 console 输出
 * - ✅ **全局单例**: 配置一次,全局生效
 * 
 * ## 基础使用（开箱即用）
 * ```typescript
 * import { DefaultLogger } from 'koatty_logger';
 * 
 * // 直接使用 - 无需任何配置
 * DefaultLogger.info('Application started');
 * DefaultLogger.error('Something went wrong', error);
 * DefaultLogger.debug('Debug info', { userId: 123 });
 * ```
 * 
 * ## 配置使用
 * ```typescript
 * // 方式1: 使用 configure() 方法
 * DefaultLogger.configure({
 *   minLevel: 'debug',
 *   logFilePath: './logs/app.log',
 *   sensFields: new Set(['password', 'token'])
 * });
 * 
 * // 方式2: 使用便捷方法
 * DefaultLogger.setMinLevel('debug');
 * DefaultLogger.setLogPath('./logs/app.log');
 * DefaultLogger.setSensitiveFields(['password', 'token']);
 * ```
 * 
 * ## 动态调整
 * ```typescript
 * // 运行时动态调整日志级别
 * DefaultLogger.setMinLevel('error');  // 只记录错误
 * 
 * // 动态启用高性能缓冲模式
 * DefaultLogger.enableBuffering({
 *   maxBufferSize: 200,
 *   flushInterval: 500
 * });
 * 
 * // 动态禁用缓冲,实时输出
 * DefaultLogger.disableBuffering();
 * 
 * // 设置采样率
 * DefaultLogger.setSamplingRate('api-request', 0.1);
 * ```
 * 
 * ## 高级用法
 * 如果需要更精细的控制,请使用 `new Logger()`:
 * ```typescript
 * import { Logger } from 'koatty_logger';
 * 
 * const customLogger = new Logger({
 *   logLevel: 'debug',
 *   logFilePath: './logs/custom.log',
 *   buffer: { enableBuffer: true, maxBufferSize: 500 },
 *   sampling: { sampleRates: new Map([['high-freq', 0.01]]) }
 * });
 * ```
 */
export const DefaultLogger = new DefaultLoggerClass();


