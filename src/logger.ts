/*
 * @Author: richen
 * @Date: 2020-11-20 17:40:48
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2024-10-31 16:30:52
 * @License: BSD (3-Clause)
 * @Copyright (c) - <richenlin(at)gmail.com>
 */
import {Helper} from "koatty_lib";
import util from "util";
import { createLogger, format, transports, Logger as wLogger } from "winston";
import { ILogger, LogEntry, LogLevelType, LogTrans } from "./interface";
import { ShieldLog } from "./shield";
import { BufferedLogger } from "./buffered_logger";
import { SamplingLogger } from "./sampling";
import { LogLevelFilter } from "./level_filter";
import type { BufferConfig, LogStats } from "./types";
import path from "path";
const DailyRotateFile = Helper.safeRequire("winston-daily-rotate-file");
const { combine, timestamp, printf } = format;

const LogLevelObj: any = {
  "debug": 7,
  "info": 6,
  "warning": 4,
  "error": 3,
  "fatal": 0  // 最高优先级,用于致命错误
};
export interface LoggerOpt {
  logLevel?: LogLevelType;
  logFilePath?: string;
  sensFields?: Set<string>;
  
  // ============ 增强功能配置 ============
  /** 缓冲配置 */
  buffer?: import('./types').BufferConfig;
  
  /** 采样配置 */
  sampling?: import('./types').SamplingConfig;
  
  /** 最小日志级别 - 用于级别过滤 */
  minLevel?: LogLevelType;
}

// defaultLoggerOpt
const defaultLoggerOpt = {
  File: {
    level: "info",
    filename: "./logs/log.log",
    handleExceptions: true,
    json: true,
    datePattern: 'YYYY-MM-DD-HH',
    // zippedArchive: true,
    maxSize: '20m',
    // maxFiles: '7d',
    colorize: false,
    timestamp: true
  },
  Console: {
    level: "debug",
    handleExceptions: true,
    json: true,
    colorize: true,
    timestamp: true
  }
};

/**
 * Logger
 *
 * @class Logger
 */
export class Logger implements ILogger {
  // 日志级别
  private logLevel: LogLevelType = "debug";
  // 默认打开日志
  private enableLog = true;
  // 日志对象
  private emptyObj: any = {};
  private logger: wLogger;
  private transports: LogTrans = {};
  // 文件日志
  private logFilePath = "";
  // 脱敏字段
  private sensFields: Set<string> = new Set();
  // 基础日志目录，用于安全验证
  private readonly baseLogDir = path.resolve(process.cwd(), "logs");

  // ============ 增强功能属性 ============
  private bufferedLogger?: BufferedLogger;
  private samplingLogger?: SamplingLogger;
  private levelFilter?: LogLevelFilter;
  private enableEnhancedBuffering: boolean = false;
  private isDestroyed: boolean = false;

  /**
   * Creates an instance of Logger.
   * @param {LoggerOpt} [opt]
   * @memberof Logger
   */
  constructor(opt?: LoggerOpt) {
    const level = (process.env.LOGS_LEVEL || "").toLowerCase();
    if (level && LogLevelObj[level]) {
      this.logLevel = <LogLevelType>level;
    }

    if (process.env.LOGS_PATH) {
      this.logFilePath = process.env.LOGS_PATH;
    }
    if (!Helper.isTrueEmpty(opt) && opt) {
      this.logLevel = opt.logLevel ?? this.logLevel;
      this.logFilePath = opt.logFilePath ?? this.logFilePath;
      this.sensFields = opt.sensFields ?? this.sensFields;

      // ============ 初始化增强功能 ============
      // 初始化缓冲功能
      if (opt.buffer) {
        this.bufferedLogger = new BufferedLogger(opt.buffer);
        this.bufferedLogger.setFlushCallback((entries) => {
          this.flushEnhancedEntries(entries);
        });
        this.enableEnhancedBuffering = opt.buffer.enableBuffer !== false;
      }

      // 初始化采样功能
      if (opt.sampling) {
        this.samplingLogger = new SamplingLogger();
        if (opt.sampling.sampleRates) {
          opt.sampling.sampleRates.forEach((rate, key) => {
            this.samplingLogger!.setSampleRate(key, rate);
          });
        }
      }

      // 初始化级别过滤
      if (opt.minLevel) {
        this.levelFilter = new LogLevelFilter(opt.minLevel);
      }
    }

    this.logger = this.createLogger();
  }

  /**
   * enable
   */
  public enable(b = true) {
    this.enableLog = b;
  }

  /**
   * getLevel
   */
  public getLevel(): LogLevelType {
    return this.logLevel;
  }

  /**
   * setLevel
   */
  public setLevel(level: LogLevelType) {
    this.logLevel = level;
    if (this.transports.Console) {
      this.transports.Console.level = level;
    }
    if (this.transports.File) {
      this.transports.File.level = level;
    }
  }

  /**
  * getLogFilePath
  */
  public getLogFilePath() {
    return this.logFilePath;
  }

  /**
   * setLogFile
   */
  public setLogFilePath(f: string) {
    // 验证路径安全性
    const safePath = this.validateLogPath(f);
    this.logFilePath = safePath;
    this.logger.close();
    this.logger = this.createLogger();
  }

  /**
   * getSensFields
   */
  public getSensFields() {
    return this.sensFields;
  }

  /**
   * setSensFields
   */
  public setSensFields(fields: string[]) {
    this.sensFields = new Set([...this.sensFields, ...fields]);
  }

  /**
   * clearSensFields - 清理敏感字段，防止内存泄漏
   */
  public clearSensFields() {
    this.sensFields.clear();
  }

  /**
   * resetSensFields - 重置敏感字段为指定列表
   */
  public resetSensFields(fields: string[]) {
    this.sensFields.clear();
    this.sensFields = new Set(fields);
  }

  /**
   * destroy - 销毁Logger实例，释放资源
   */
  public async destroy() {
    try {
      this.isDestroyed = true;

      // 停止增强缓冲
      if (this.bufferedLogger) {
        await this.bufferedLogger.stop();
      }

      // 关闭winston logger
      if (this.logger) {
        this.logger.close();
      }

      // 清理内存引用
      this.sensFields.clear();
      this.transports = {};
      this.enableLog = false;
    } catch (e) {
      console.error('Error destroying logger:', e);
    }
  }


  /**
   * sanitizeInput - 过滤危险字符，防止日志注入
   */
  private sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // 移除控制字符和换行符，防止日志注入
      return input.replace(/[\r\n\t\x00-\x1f\x7f]/g, ' ');
    }
    return input;
  }

  /**
   * validateLogPath - 验证日志路径安全性
   */
  private validateLogPath(logPath: string): string {
    if (!logPath) {
      throw new Error('Log path cannot be empty');
    }

    // 规范化路径
    const normalizedPath = path.normalize(logPath);

    // 如果是相对路径，基于baseLogDir解析
    const resolvedPath = path.isAbsolute(normalizedPath)
      ? normalizedPath
      : path.resolve(this.baseLogDir, normalizedPath);

    // 确保路径在允许的目录内
    if (!resolvedPath.startsWith(this.baseLogDir)) {
      throw new Error(`Log path must be within ${this.baseLogDir}`);
    }

    // 过滤危险字符
    if (/[<>:"|?*\x00-\x1f]/.test(normalizedPath)) {
      throw new Error('Log path contains invalid characters');
    }

    return resolvedPath;
  }

  /**
   * log Debug
   *
   * @returns {*} 
   * @memberof Logger
   */
  public Debug(...args: any[]) {
    return this.printLog("debug", "", args);
  }

  /**
   * debug
   */
  public debug(...args: any[]) {
    return this.printLog("debug", "", args);
  }

  /**
   * log Info
   *
   * @returns {*} 
   * @memberof Logger
   */
  public Info(...args: any[]) {
    return this.printLog("info", "", args);
  }

  /**
   * info
   */
  public info(...args: any[]) {
    return this.printLog("info", "", args);
  }

  /**
   * log Warn
   *
   * @returns {*} 
   * @memberof Logger
   */
  public Warn(...args: any[]) {
    return this.printLog("warning", "", args);
  }

  /**
   * warn
   */
  public warn(...args: any[]) {
    return this.printLog("warning", "", args);
  }

  /**
   * log Error
   * 
   * @returns {*} 
   * @memberof Logger
   */
  public Error(...args: any[]) {
    return this.printLog("error", "", args);
  }
  /**
   * error
   */
  public error(...args: any[]) {
    return this.printLog("error", "", args);
  }

  /**
   * Fatal - 致命错误 (同步写入,确保不丢失)
   * 用于记录导致进程退出的严重错误
   * 
   * @param {...any[]} args
   * @memberof Logger
   */
  public Fatal(...args: any[]) {
    return this.printLogSync("fatal", "", args);
  }

  /**
   * fatal - 致命错误 (同步写入,确保不丢失)
   */
  public fatal(...args: any[]) {
    return this.printLogSync("fatal", "", args);
  }

  /**
   * log Log
   * 
   * Logger.Log('msg')
   * 
   * Logger.Log('name', 'msg')
   * 
   * Logger.Log('name', 'msg1', 'msg2'...)
   *
   * @param {...any[]} args
   * @returns {*} 
   * @memberof Logger
   */
  public Log(name: LogLevelType | string, ...args: any[]) {
    // tslint:disable-next-line: one-variable-per-declaration
    let level = "info";
    if (LogLevelObj[name]) {
      level = name;
      name = "";
    }
    return this.printLog(<LogLevelType>level, name, args);
  }

  /**
   * log
   */
  public log(name: LogLevelType | string, ...args: any[]) {
    let level = "info";
    if (LogLevelObj[name]) {
      level = name;
      name = "";
    }
    return this.printLog(<LogLevelType>level, name, args);
  }

  /**
   * print console
   *
   * @private
   * @param {LogLevelType} level
   * @param {string} name
   * @param {any[]|string} args
   * @memberof Logger
   */
  private printLog(level: LogLevelType, name: string, args: any[]) {
    try {
      if (!this.enableLog || this.isDestroyed) {
        return;
      }

      // ============ 增强功能：级别过滤 ============
      if (this.levelFilter && !this.levelFilter.shouldLog(level)) {
        return;
      }

      // ============ 增强功能：使用缓冲 ============
      if (this.enableEnhancedBuffering && this.bufferedLogger) {
        const entry: LogEntry = {
          level,
          name,
          timestamp: Date.now(),
          args
        };
        this.bufferedLogger.addLog(entry);
      } 
      // ============ 默认异步写入 ============
      else {
        this.writeLogAsync(level, name, args);
      }
    } catch (e) {
      // 确保错误能输出,即使winston未初始化
      console.error('[Logger Error in printLog]', e);
      // 同时尝试输出原始日志内容
      if (args && args.length > 0) {
        console.error(`[${level.toUpperCase()}]`, ...args);
      }
    }
  }

  /**
   * printLogSync - 同步日志打印 (用于 fatal 等关键日志)
   */
  private printLogSync(level: LogLevelType, name: string, args: any[]) {
    try {
      if (!this.enableLog || this.isDestroyed) {
        return;
      }

      // 级别过滤
      if (this.levelFilter && !this.levelFilter.shouldLog(level)) {
        return;
      }

      // fatal 级别强制同步写入,不使用缓冲
      this.writeLogSync(level, name, args);
      
      // 如果有缓冲,立即同步刷新
      if (this.bufferedLogger) {
        this.bufferedLogger.flush();
      }
      
    } catch (e) {
      console.error('[Logger Error in printLogSync]', e);
      if (args && args.length > 0) {
        console.error(`[${level.toUpperCase()}]`, ...args);
      }
    }
  }

  /**
   * writeLogSync - 同步写入日志 (用于 fatal 等关键日志)
   * 
   * 注意: 同步写入会阻塞事件循环,仅用于进程即将退出的场景
   */
  private writeLogSync(level: LogLevelType, name: string, args: any[]) {
    try {
      const logName = name !== '' ? name.toUpperCase() : level.toUpperCase();
      
      // 对输入参数进行安全过滤
      const sanitizedArgs = args.map(arg => this.sanitizeInput(arg));
      
      // format
      sanitizedArgs.unshift(logName);
      
      // Winston 不支持 fatal 级别,映射到 error
      const winstonLevel = level === 'fatal' ? 'error' : level;
      
      // 直接同步写入,不使用 setImmediate
      this.logger[winstonLevel](sanitizedArgs);
      
      // 同时输出到 console (确保可见)
      const consoleMethod = level === 'fatal' || level === 'error' ? 'error' : 
                            level === 'warning' ? 'warn' : 'log';
      console[consoleMethod](`[${logName}]`, ...sanitizedArgs.slice(1));
      
    } catch (error) {
      console.error('[Logger Error in writeLogSync]', error);
      console.error(`[${level.toUpperCase()}]`, ...args);
    }
  }

  /**
   * writeLogAsync - 异步写入单个日志条目
   */
  private async writeLogAsync(level: LogLevelType, name: string, args: any[]) {
    try {
      const logName = name !== '' ? name.toUpperCase() : level.toUpperCase();

      // 对输入参数进行安全过滤
      const sanitizedArgs = args.map(arg => this.sanitizeInput(arg));

      // format
      sanitizedArgs.unshift(logName);

      // Winston 不支持 fatal 级别,映射到 error
      const winstonLevel = level === 'fatal' ? 'error' : level;
      
      // Winston的日志方法本身就是异步的，我们使用Promise.resolve确保异步执行
      return new Promise<void>((resolve, reject) => {
        try {
          // 使用setImmediate确保异步执行，避免阻塞主线程
          setImmediate(() => {
            try {
              this.logger[winstonLevel](sanitizedArgs);
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        } catch (error) {
          reject(error);
        }
      }).catch(e => {
        console.error('[Logger Error in async log write]', e);
        // 输出原始日志内容作为后备
        if (args && args.length > 0) {
          console.error(`[${level.toUpperCase()}]`, ...args);
        }
      });
    } catch (e) {
      console.error('[Logger Error in writeLogAsync]', e);
      // 输出原始日志内容作为后备
      if (args && args.length > 0) {
        console.error(`[${level.toUpperCase()}]`, ...args);
      }
    }
  }

  /**
   * 格式化
   *
   * @private
   * @param {string} level
   * @param {string} label
   * @param {string} timestamp
   * @param {any[]|string} args
   * @returns {string} 
   * @memberof Logger
   */
  private format(level: string, label: string, timestamp: string, args: any[] | string): string {
    try {
      label = label ? `[${label}]` : '';
      const params = [`[${timestamp}]`, label, ...ShieldLog(args, this.sensFields)];
      // if (level === "debug") {
      //   Error.captureStackTrace(this.emptyObj);
      //   const matchResult = (this.emptyObj.stack.slice(this.emptyObj.stack.lastIndexOf("koatty_logger"))).match(/\(.*?\)/g) || [];
      //   params.push(matchResult.join("  "));
      // }

      return util.format.apply(null, params);
    } catch (e) {
      // console.error(e.stack);
      this.logger.error(e.stack);
      return "";
    }
  }

  /**
   * createLogger
   * @returns 
   */
  private createLogger(): wLogger {
    const trans: any[] = [];
    if (this.logFilePath != "") {
      defaultLoggerOpt.File.level = this.logLevel;
      defaultLoggerOpt.File.filename = `${(this.logFilePath || './logs/')}/log-%DATE%.log`;
      this.transports.File = new DailyRotateFile(defaultLoggerOpt.File);
      trans.push(this.transports.File);
    } else {
      defaultLoggerOpt.Console.level = this.logLevel;
      this.transports.Console = new transports.Console(defaultLoggerOpt.Console);
      trans.push(this.transports.Console);
    }

    return createLogger({
      levels: LogLevelObj,
      transports: trans,
      format: combine(
        timestamp({
          format: "YYYY-MM-DD HH:mm:ss.SSS Z",
        }),
        format.json(),
        printf(({ level, message, label, timestamp }: any) => {
          return this.format(level, label, timestamp, message);
        }),
      ),
    });
  }

  // ============ 增强功能方法 ============

  /**
   * 刷新增强缓冲区的日志条目
   * @private
   */
  private flushEnhancedEntries(entries: LogEntry[]): void {
    for (const entry of entries) {
      this.writeLogAsync(entry.level, entry.name, entry.args);
    }
  }

  /**
   * 配置缓冲功能
   */
  public configureBuffering(config: Partial<BufferConfig>): void {
    if (!this.bufferedLogger) {
      this.bufferedLogger = new BufferedLogger(config);
      this.bufferedLogger.setFlushCallback((entries) => {
        this.flushEnhancedEntries(entries);
      });
    } else {
      this.bufferedLogger.updateConfig(config);
    }
    this.enableEnhancedBuffering = config.enableBuffer !== false;
  }

  /**
   * 配置采样功能
   */
  public configureSampling(key: string, rate: number): void {
    if (!this.samplingLogger) {
      this.samplingLogger = new SamplingLogger();
    }
    this.samplingLogger.setSampleRate(key, rate);
  }

  /**
   * 设置最小日志级别（用于过滤）
   */
  public setMinLevel(level: LogLevelType): void {
    if (!this.levelFilter) {
      this.levelFilter = new LogLevelFilter(level);
    } else {
      this.levelFilter.setMinLevel(level);
    }
    // 同时更新基础日志级别
    this.setLevel(level);
  }

  /**
   * 获取最小日志级别
   */
  public getMinLevel(): LogLevelType | null {
    return this.levelFilter?.getMinLevel() ?? null;
  }

  /**
   * fatalAndExit - 记录 fatal 日志并优雅退出
   * 
   * @param message - 错误信息
   * @param exitCode - 退出码,默认 1
   * @param error - 错误对象(可选)
   * 
   * @example
   * await logger.fatalAndExit('Database connection failed', 1, error);
   */
  public async fatalAndExit(
    message: string, 
    exitCode: number = 1,
    error?: Error
  ): Promise<never> {
    try {
      // 1. 记录 fatal 日志 (同步)
      if (error) {
        this.fatal(message, error);
      } else {
        this.fatal(message);
      }
      
      // 2. 刷新所有缓冲
      await this.flush();
      
      // 3. 等待一小段时间确保日志写入完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 4. 关闭所有资源
      await this.destroy();
      
    } catch (e) {
      // 确保错误能输出
      console.error('[Logger Error in fatalAndExit]', e);
      console.error('[FATAL]', message, error);
    } finally {
      // 5. 退出进程
      process.exit(exitCode);
    }
  }

  /**
   * 采样日志方法 - Debug
   */
  public DebugSampled(key: string, message: string, ...args: any[]): void {
    if (this.samplingLogger?.shouldSample(key)) {
      this.Debug(message, ...args);
    }
  }

  /**
   * 采样日志方法 - Info
   */
  public InfoSampled(key: string, message: string, ...args: any[]): void {
    if (this.samplingLogger?.shouldSample(key)) {
      this.Info(message, ...args);
    }
  }

  /**
   * 采样日志方法 - Warn
   */
  public WarnSampled(key: string, message: string, ...args: any[]): void {
    if (this.samplingLogger?.shouldSample(key)) {
      this.Warn(message, ...args);
    }
  }

  /**
   * 采样日志方法 - Error
   */
  public ErrorSampled(key: string, message: string, ...args: any[]): void {
    if (this.samplingLogger?.shouldSample(key)) {
      this.Error(message, ...args);
    }
  }

  /**
   * 获取统计信息
   */
  public getStats(): LogStats | null {
    if (!this.bufferedLogger) {
      return null;
    }

    const minLevel: LogLevelType = this.levelFilter?.getMinLevel() ?? 'debug';
    return {
      buffer: this.bufferedLogger.getStats(),
      sampling: this.samplingLogger?.getStats(),
      minLevel
    };
  }

  /**
   * 手动刷新缓冲区
   */
  public async flush(): Promise<void> {
    if (this.bufferedLogger) {
      await this.bufferedLogger.flush();
    }
  }

  /**
   * 停止日志器，刷新所有待写入的日志
   */
  public async stop(): Promise<void> {
    this.isDestroyed = true;
    
    // 停止增强缓冲
    if (this.bufferedLogger) {
      await this.bufferedLogger.stop();
    }
  }

}

