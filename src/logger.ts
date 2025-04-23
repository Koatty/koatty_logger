/*
 * @Author: richen
 * @Date: 2020-11-20 17:40:48
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-04-23 14:08:59
 * @License: BSD (3-Clause)
 * @Copyright (c) - <richenlin(at)gmail.com>
 */
import * as helper from "koatty_lib";
import util from "util";
import { createLogger, format, transports, Logger as wLogger } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { LoggerOpt, LogLevelObj, LogLevelType } from "./interface";
import { ShieldLog } from "./shield";
const { combine, timestamp, printf } = format;


// defaultTransportsOpt
const defaultTransportsOpt = {
  File: {
    level: "info",
    filename: "./logs/log.log",
    handleExceptions: true,
    json: true,
    datePattern: 'YYYY-MM-DD-HH',
    // zippedArchive: true,
    maxSize: '20m',
    maxFiles: '7d',
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
 * Logger class implements ILogger interface for handling logging operations.
 * Supports multiple log levels, file logging, and sensitive field masking.
 * 
 * @example
 * // 获取日志记录器实例
 * const logger = Logger.getInstance({
 *   logLevel: 'debug',
 *   logFilePath: './logs',
 *   sensFields: ['password', 'token']
 * });
 * 
 * logger.info('Hello world');
 * logger.error('Error occurred');
 * 
 * // 如果配置发生变化，将创建新实例
 * const newLogger = Logger.getInstance({
 *   logLevel: 'info',
 *   logFilePath: './logs',
 *   sensFields: ['password', 'token', 'secret']
 * });
 * 
 * // 启用批量日志处理
 * logger.setBufferOptions(20, 10000, true);
 * 
 * // 批量记录日志
 * for (let i = 0; i < 100; i++) {
 *   logger.info(`Log message ${i}`);
 * }
 * 
 * // 手动刷新缓冲区
 * logger.flushBuffer();
 * 
 * // 在应用退出时销毁日志记录器
 * logger.destroy();
 * 
 * @implements {ILogger}
 */
export class Logger {
  private static _instance: Logger;
  private static _config: LoggerOpt | undefined;

  // 日志模板缓存
  private logTemplates: Map<string, string> = new Map();
  // 日志级别对应的颜色
  private logColors: Record<LogLevelType, string> = {
    debug: "\x1b[36m", // 青色
    info: "\x1b[32m",  // 绿色
    warning: "\x1b[33m", // 黄色
    error: "\x1b[31m"  // 红色
  };
  // 重置颜色
  private resetColor = "\x1b[0m";

  // 日志缓冲相关
  private logBuffer: Array<{ level: LogLevelType, args: any[] }> = [];
  private bufferSize: number = 10; // 默认缓冲区大小
  private flushInterval: number = 5000; // 默认刷新间隔（毫秒）
  private flushTimer: NodeJS.Timeout | null = null;
  private isBuffering: boolean = false;

  /**
   * Get singleton instance of Logger
   * @param opt Logger options
   * @returns Logger instance
   */
  public static getInstance(opt?: LoggerOpt): Logger {
    // 如果没有实例，创建一个新实例
    if (!Logger._instance) {
      Logger._instance = new Logger(opt);
      Logger._config = opt;
      return Logger._instance;
    }

    // 如果提供了配置，检查配置是否发生变化
    if (opt) {
      const configChanged = Logger._hasConfigChanged(opt);
      if (configChanged) {
        // 配置发生变化，创建新实例
        Logger._instance = new Logger(opt);
        Logger._config = opt;
      }
    }

    return Logger._instance;
  }

  /**
   * 检查配置是否发生变化
   * @private
   * @param newConfig 新的配置
   * @returns 配置是否发生变化
   */
  private static _hasConfigChanged(newConfig: LoggerOpt): boolean {
    if (!Logger._config) {
      return true;
    }

    // 检查日志级别是否变化
    if (newConfig.logLevel !== Logger._config.logLevel) {
      return true;
    }

    // 检查日志文件路径是否变化
    if (newConfig.logFilePath !== Logger._config.logFilePath) {
      return true;
    }

    // 检查敏感字段是否变化
    if (newConfig.sensFields) {
      const currentFields = Array.from(Logger._config.sensFields || new Set());
      const newFields = Array.from(newConfig.sensFields);

      if (currentFields.length !== newFields.length) {
        return true;
      }

      // 检查每个字段是否都存在
      for (const field of newFields) {
        if (!currentFields.includes(field)) {
          return true;
        }
      }
    }

    return false;
  }

  // 日志级别
  private logLevel: LogLevelType = "debug";
  // 默认打开日志
  private enableLog = true;
  // 日志对象
  private emptyObj: any = {};
  private logger: wLogger;
  // 文件日志
  private logFilePath = "";
  // 脱敏字段
  private sensFields: Set<string> = new Set();

  /**
   * Creates an instance of Logger.
   * @param {LoggerOpt} [opt]
   * @memberof Logger
   */
  private constructor(opt?: LoggerOpt) {
    const level = (process.env.LOGS_LEVEL || "").toLowerCase();
    if (level && Object.prototype.hasOwnProperty.call(LogLevelObj, level)) {
      this.logLevel = level as LogLevelType;
    }

    if (process.env.LOGS_PATH) {
      this.logFilePath = process.env.LOGS_PATH;
    }
    if (!helper.isTrueEmpty(opt)) {
      this.logLevel = opt?.logLevel ?? this.logLevel;
      this.logFilePath = opt?.logFilePath ?? this.logFilePath;
      this.sensFields = opt?.sensFields ?? this.sensFields;
    }

    this.logger = this.createLogger();
  }

  /**
   * Enable or disable logging
   * @param b Whether to enable logging, defaults to true
   */
  public enable(b = true) {
    this.enableLog = b;
  }

  /**
   * Get the current log level.
   * @returns {LogLevelType} The current log level.
   */
  public getLevel(): LogLevelType {
    return this.logLevel;
  }

  /**
   * Set the log level for the logger
   * @param level The log level to set. Must be a valid LogLevelType
   * @returns void
   */
  public setLevel(level: LogLevelType) {
    if (!LogLevelObj[level]) {
      return;
    }
    this.logLevel = level;
  }

  /**
   * Gets the current log file path.
   * @returns {string} The absolute path of the log file
   */
  public getLogFilePath() {
    return this.logFilePath;
  }

  /**
   * Set the log file path and recreate logger
   * @param f The file path for logging
   */
  public setLogFilePath(f: string) {
    if (!f) {
      return;
    }
    this.logFilePath = f;
    this.logger.close();
    this.logger = this.createLogger();
  }

  /**
   * Get sensitive fields that need to be filtered from logs.
   * 
   * @returns {string[]} Array of sensitive field names
   */
  public getSensFields() {
    return this.sensFields;
  }

  /**
   * Set sensitive fields that need to be masked in logs.
   * @param fields Array of field names to be marked as sensitive
   */
  public setSensFields(fields: string[]) {
    if (!fields) return;
    this.sensFields = new Set([...this.sensFields, ...fields]);
  }

  /**
   * Output debug level log message
   * @param args The arguments to be logged
   * @returns void
   */
  public debug(...args: any[]) {
    return this.printLog("debug", "", args);
  }

  /**
   * Log information message
   * @param args The arguments to be logged
   * @returns The result of printLog operation
   */
  public info(...args: any[]) {
    return this.printLog("info", "", args);
  }

  /**
   * Log warning message
   * @param args The arguments to be logged
   * @returns The result of printLog operation
   */
  public warn(...args: any[]) {
    return this.printLog("warning", "", args);
  }

  /**
   * Log error level message
   * @param args The arguments to be logged
   * @returns void
   */
  public error(...args: any[]) {
    return this.printLog("error", "", args);
  }


  /**
   * Output debug level log message (alias for debug)
   * @param args The arguments to be logged
   * @returns void
   */
  public Debug(...args: any[]) {
    return this.debug(...args);
  }

  /**
   * Log information level message (alias for info)
   * @param args The arguments to be logged
   * @returns void
   */
  public Info(...args: any[]) {
    return this.info(...args);
  }

  /**
   * Log warning level message (alias for warn)
   * @param args The arguments to be logged
   * @returns void
   */
  public Warn(...args: any[]) {
    return this.warn(...args);
  }

  /**
   * Log error level message (alias for error)
   * @param args The arguments to be logged
   * @returns void
   */
  public Error(...args: any[]) {
    return this.error(...args);
  }

  /**
   * log
   * 
   * logger.log('msg')
   * logger.log('name', 'msg')
   * logger.log('name', 'msg1', 'msg2'...)
   *
   * @param {LogLevelType | string} name - Log level or name
   * @param {...any[]} args - Messages to log
   * @returns {*} 
   * @memberof Logger
   */
  public log(name: LogLevelType | string, ...args: any[]) {
    let level: LogLevelType = "info";
    if (Object.prototype.hasOwnProperty.call(LogLevelObj, name)) {
      level = name as LogLevelType;
      name = "";
    }
    return this.printLog(level, name, args);
  }

  /**
   * Log (alias for log)
   * 
   * Logger.Log('msg')
   * Logger.Log('name', 'msg')
   * Logger.Log('name', 'msg1', 'msg2'...)
   *
   * @param {LogLevelType | string} name - Log level or name
   * @param {...any[]} args - Messages to log
   * @returns {*} 
   * @memberof Logger
   */
  public Log(name: LogLevelType | string, ...args: any[]) {
    return this.log(name, ...args);
  }

  /**
   * 设置日志缓冲参数
   * @param size 缓冲区大小
   * @param interval 刷新间隔（毫秒）
   * @param enabled 是否启用缓冲
   */
  public setBufferOptions(size: number = 10, interval: number = 5000, enabled: boolean = true): void {
    this.bufferSize = size;
    this.flushInterval = interval;
    this.isBuffering = enabled;

    // 如果启用了缓冲，设置定时器
    if (this.isBuffering) {
      this._setupFlushTimer();
    } else {
      // 如果禁用了缓冲，立即刷新缓冲区
      this.flushBuffer();
    }
  }

  /**
   * 设置定时刷新缓冲区
   * @private
   */
  private _setupFlushTimer(): void {
    // 清除现有定时器
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // 设置新定时器
    this.flushTimer = setInterval(() => {
      this.flushBuffer();
    }, this.flushInterval);
  }

  /**
   * 刷新日志缓冲区
   */
  public flushBuffer(): void {
    if (this.logBuffer.length === 0) {
      return;
    }

    // 按日志级别分组
    const groupedLogs: Record<LogLevelType, any[][]> = {
      debug: [],
      info: [],
      warning: [],
      error: []
    };

    // 将日志按级别分组
    for (const log of this.logBuffer) {
      groupedLogs[log.level].push(log.args);
    }

    // 批量处理每个级别的日志
    for (const level of Object.keys(groupedLogs) as LogLevelType[]) {
      const logs = groupedLogs[level];
      if (logs.length > 0) {
        switch (level) {
          case "debug":
            this.logger.debug(logs);
            break;
          case "info":
            this.logger.info(logs);
            break;
          case "warning":
            this.logger.warning(logs);
            break;
          case "error":
            this.logger.error(logs);
            break;
        }
      }
    }

    // 清空缓冲区
    this.logBuffer = [];
  }

  /**
   * 在对象销毁时刷新缓冲区
   */
  public destroy(): void {
    this.flushBuffer();
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
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
      if (!this.enableLog) {
        return;
      }

      // 处理名称
      name = name !== '' ? name.toUpperCase() : level.toUpperCase();

      // 获取日志模板
      const templateKey = `${level}:${name}`;
      let template = this.logTemplates.get(templateKey);

      // 如果模板不存在，创建并缓存
      if (!template) {
        template = this._createLogTemplate(level, name);
        this.logTemplates.set(templateKey, template);
      }

      // 处理参数
      const processedArgs = ShieldLog(args, this.sensFields);

      // 如果启用了缓冲，将日志添加到缓冲区
      if (this.isBuffering) {
        // 确保 args 是一个数组
        const bufferArgs = Array.isArray(processedArgs) ? processedArgs : [processedArgs];
        this.logBuffer.push({ level, args: bufferArgs });

        // 如果缓冲区已满，立即刷新
        if (this.logBuffer.length >= this.bufferSize) {
          this.flushBuffer();
        }

        return;
      }

      // 根据日志级别选择输出方式
      switch (level) {
        case "debug":
          this.logger.debug(processedArgs);
          break;
        case "info":
          this.logger.info(processedArgs);
          break;
        case "warning":
          this.logger.warning(processedArgs);
          break;
        case "error":
          this.logger.error(processedArgs);
          break;
      }
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * 创建日志模板
   * 
   * @private
   * @param {LogLevelType} level - 日志级别
   * @param {string} _name - 日志名称
   * @returns {string} 日志模板
   * @memberof Logger
   */
  private _createLogTemplate(level: LogLevelType, _name: string): string {
    const color = this.logColors[level];
    return `${color}[%s] [%s] %s${this.resetColor}`;
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
      // 使用优化后的ShieldLog函数处理敏感信息
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
    const trans = [];
    if (this.logFilePath != "") {
      const fileTransports = new DailyRotateFile({
        level: this.logLevel,
        filename: `${(this.logFilePath || './logs/')}/log-%DATE%.log`,
        ...defaultTransportsOpt.File,
      });
      trans.push(fileTransports);
    } else {
      const cosoleTransports = new transports.Console({
        level: this.logLevel,
        // format: format.combine(
        //   format.colorize(),
        //   format.simple(),
        // ),
        ...defaultTransportsOpt.Console,
      });
      trans.push(cosoleTransports);
    }

    return createLogger({
      levels: LogLevelObj,
      transports: trans,
      format: combine(
        timestamp({
          format: "YYYY-MM-DD HH:mm:ss.SSS Z",
        }),
        format.json(),
        printf(({ level, message, label, timestamp }) => {
          return this.format(level, label, timestamp, message);
        }),
      ),
    });
  }

}
