/*
 * @Author: richen
 * @Date: 2020-11-20 17:40:48
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2024-10-31 16:30:52
 * @License: BSD (3-Clause)
 * @Copyright (c) - <richenlin(at)gmail.com>
 */
import * as helper from "koatty_lib";
import util from "util";
import { createLogger, format, transports, Logger as wLogger } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { BatchConfig, ILogger, LogEntry, LogLevelType, LogTrans } from "./interface";
import { ShieldLog } from "./shield";
import path from "path";
const { combine, timestamp, printf } = format;

const LogLevelObj: any = {
  "debug": 7,
  "info": 6,
  "warning": 4,
  "error": 3
};
export interface LoggerOpt {
  logLevel?: LogLevelType;
  logFilePath?: string;
  sensFields?: Set<string>;
  batchConfig?: BatchConfig;     // 批量写入配置
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

  // 批量写入相关属性
  private batchConfig: BatchConfig = {
    enabled: false,
    maxSize: 100,
    flushInterval: 1000,      // 1秒
    maxWaitTime: 5000         // 5秒
  };
  private logBuffer: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private lastFlushTime: number = Date.now();
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
    if (!helper.isTrueEmpty(opt) && opt) {
      this.logLevel = opt.logLevel ?? this.logLevel;
      this.logFilePath = opt.logFilePath ?? this.logFilePath;
      this.sensFields = opt.sensFields ?? this.sensFields;
      
      // 配置批量写入
      if (opt.batchConfig) {
        this.batchConfig = { ...this.batchConfig, ...opt.batchConfig };
      }
    }

    this.logger = this.createLogger();
    
    // 如果启用批量写入，开始定时器
    if (this.batchConfig.enabled) {
      this.startBatchTimer();
    }
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
  public destroy() {
    try {
      this.isDestroyed = true;

      // 停止批量写入定时器
      this.stopBatchTimer();

      // 异步刷新缓冲区，但不等待完成（避免阻塞销毁流程）
      if (this.logBuffer.length > 0) {
        this.flushBatch().catch(e => {
          console.error('Error flushing logs during destroy:', e);
        });
      }

      // 关闭winston logger
      if (this.logger) {
        this.logger.close();
      }

      // 清理内存引用
      this.sensFields.clear();
      this.transports = {};
      this.enableLog = false;
      this.logBuffer = [];
    } catch (e) {
      console.error('Error destroying logger:', e);
    }
  }

  /**
   * enableBatch - 启用/禁用批量写入
   */
  public enableBatch(enabled: boolean = true) {
    if (enabled && !this.batchConfig.enabled) {
      this.batchConfig.enabled = true;
      this.startBatchTimer();
    } else if (!enabled && this.batchConfig.enabled) {
      this.batchConfig.enabled = false;
      this.stopBatchTimer();
      // 异步刷新剩余的日志
      this.flushBatch().catch(e => {
        console.error('Error flushing logs when disabling batch:', e);
      });
    }
  }

  /**
   * setBatchConfig - 设置批量写入配置
   */
  public setBatchConfig(config: Partial<BatchConfig>) {
    const wasEnabled = this.batchConfig.enabled;
    this.batchConfig = { ...this.batchConfig, ...config };

    // 如果配置改变，重新启动定时器
    if (this.batchConfig.enabled && wasEnabled) {
      this.stopBatchTimer();
      this.startBatchTimer();
    } else if (this.batchConfig.enabled && !wasEnabled) {
      this.startBatchTimer();
    } else if (!this.batchConfig.enabled && wasEnabled) {
      this.stopBatchTimer();
      this.flushBatch().catch(e => {
        console.error('Error flushing logs when disabling batch via config:', e);
      });
    }
  }

  /**
   * getBatchConfig - 获取批量写入配置
   */
  public getBatchConfig(): BatchConfig {
    return { ...this.batchConfig };
  }

  /**
   * getBatchStatus - 获取批量写入状态
   */
  public getBatchStatus() {
    return {
      enabled: this.batchConfig.enabled || false,
      bufferSize: this.logBuffer.length,
      maxSize: this.batchConfig.maxSize,
      timeSinceLastFlush: Date.now() - this.lastFlushTime
    };
  }

  /**
   * flushBatch - 立即刷新批量写入缓冲区
   */
  public async flushBatch(): Promise<void> {
    if (this.logBuffer.length === 0 || this.isDestroyed) {
      return;
    }

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];
    this.lastFlushTime = Date.now();

    // 异步批量处理日志 - 避免阻塞主线程
    return new Promise<void>((resolve) => {
      setImmediate(() => {
        try {
          // 批量写入所有日志
          logsToFlush.forEach(entry => {
            this.writeLogEntry(entry);
          });
          resolve();
        } catch (e) {
          console.error('Error in batch flush:', e);
          resolve(); // 即使出错也要resolve，避免阻塞
        }
      });
    });
  }

  /**
   * startBatchTimer - 启动批量写入定时器
   */
  private startBatchTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      const now = Date.now();
      const timeSinceLastFlush = now - this.lastFlushTime;

      // 检查是否需要刷新（超时或缓冲区满）
      if (this.logBuffer.length > 0 &&
        (timeSinceLastFlush >= this.batchConfig.maxWaitTime! ||
          this.logBuffer.length >= this.batchConfig.maxSize!)) {
        // 异步刷新，不阻塞定时器
        this.flushBatch().catch(e => {
          console.error('Error in timer flush:', e);
        });
      }
    }, this.batchConfig.flushInterval);
  }

  /**
   * stopBatchTimer - 停止批量写入定时器
   */
  private stopBatchTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * addToBuffer - 添加日志到缓冲区
   */
  private addToBuffer(level: LogLevelType, name: string, args: any[]) {
    if (this.isDestroyed) {
      return;
    }

    const logEntry: LogEntry = {
      level,
      name,
      args,
      timestamp: Date.now()
    };

    this.logBuffer.push(logEntry);

    // 如果缓冲区达到最大大小，立即异步刷新
    if (this.logBuffer.length >= this.batchConfig.maxSize!) {
      this.flushBatch().catch(e => {
        console.error('Error in immediate flush:', e);
      });
    }
  }

  /**
   * writeLogEntry - 写入单个日志条目
   */
  private writeLogEntry(entry: LogEntry) {
    try {
      const { level, name, args } = entry;
      const logName = name !== '' ? name.toUpperCase() : level.toUpperCase();

      // 对输入参数进行安全过滤
      const sanitizedArgs = args.map(arg => this.sanitizeInput(arg));

      // format
      sanitizedArgs.unshift(logName);

      // 批量写入时直接调用winston（在批量刷新时已经是异步的）
      this.logger[level](sanitizedArgs);
    } catch (e) {
      console.error('Error writing log entry:', e);
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
   * log Fatal - for critical errors that cause application termination
   * Automatically exits the process after logging
   * 
   * @returns {*} 
   * @memberof Logger
   */
  public Fatal(...args: any[]) {
    // Flush any buffered logs first
    if (this.batchConfig.enabled) {
      this.flushBatch().catch(() => {}); // Don't wait, just try to flush
    }
    // Print to console.error directly to ensure visibility
    console.error('\x1b[31m[FATAL]\x1b[0m', ...args);
    this.printLog("error", "FATAL", args);
    // Give a tiny delay for logs to be written
    setImmediate(() => process.exit(1));
  }
  /**
   * fatal
   */
  public fatal(...args: any[]) {
    // Flush any buffered logs first
    if (this.batchConfig.enabled) {
      this.flushBatch().catch(() => {}); // Don't wait, just try to flush
    }
    // Print to console.error directly to ensure visibility
    console.error('\x1b[31m[FATAL]\x1b[0m', ...args);
    this.printLog("error", "FATAL", args);
    // Give a tiny delay for logs to be written
    setImmediate(() => process.exit(1));
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

      // 如果启用批量写入，添加到缓冲区
      if (this.batchConfig.enabled) {
        this.addToBuffer(level, name, args);
      } else {
        // 默认异步写入
        this.writeLogAsync(level, name, args);
      }
    } catch (e) {
      console.error('Error in printLog:', e);
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

      // Winston的日志方法本身就是异步的，我们使用Promise.resolve确保异步执行
      return new Promise<void>((resolve, reject) => {
        try {
          // 使用setImmediate确保异步执行，避免阻塞主线程
          setImmediate(() => {
            try {
              this.logger[level](sanitizedArgs);
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        } catch (error) {
          reject(error);
        }
      }).catch(e => {
        console.error('Error in async log write:', e);
      });
    } catch (e) {
      console.error('Error in writeLogAsync:', e);
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

}

let defaultLoggerInstance: Logger | null = null;

/**
 * Get the default logger singleton (used by @Log() decorator to avoid circular dependency).
 * @internal
 */
export function getDefaultLogger(): Logger {
  if (!defaultLoggerInstance) {
    defaultLoggerInstance = new Logger();
  }
  return defaultLoggerInstance;
}

