/*
 * @Author: richen
 * @Date: 2020-11-20 17:40:48
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-04-24 11:59:00
 * @License: BSD (3-Clause)
 * @Copyright (c) - <richenlin(at)gmail.com>
 */
import fs from "fs";
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
    handleExceptions: true,
    json: true,
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '7d',
    colorize: false,
    timestamp: true,
    createDirectory: true,
    zippedArchive: true,
    dirname: './logs',
    auditFile: './logs/.audit.json'
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

      // 处理参数
      const processedArgs = ShieldLog(args, this.sensFields);

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
  private _createLogTemplate(_level: LogLevelType, _name: string): string {
    // 修改模板格式，使其与 format 方法兼容
    // 格式为: [时间戳] [级别] 消息
    return `[%s] [%s] %s`;
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
      // 缓存转换结果
      const upperLevel = level.toUpperCase();
      label = label ? `${label}` : `${upperLevel}`;

      // 获取或创建模板
      const templateKey = `${level}:${upperLevel}`;
      let template = this.logTemplates.get(templateKey);

      if (!template) {
        template = this._createLogTemplate(level as LogLevelType, upperLevel);
        this.logTemplates.set(templateKey, template);
      }

      // 不再重复处理敏感信息，因为 args 已经在 printLog 中处理过
      const params = [timestamp, label, ...args];
      // if (level === "DEBUG") {
      //   Error.captureStackTrace(this.emptyObj);
      //   const matchResult = (this.emptyObj.stack.slice(this.emptyObj.stack.lastIndexOf("koatty_logger"))).match(/\(.*?\)/g) || [];
      //   params.push(matchResult.join("  "));
      // }

      return util.format.apply(null, [template, ...params]);
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

    // 提取公共的日志格式配置
    const logFormat = combine(
      timestamp(),
      printf((info: any) => {
        const { level, message, timestamp } = info;
        // 直接使用 format 方法，避免对 message 进行额外处理
        return this.format(level, level.toUpperCase(), timestamp, message);
      })
    );

    if (this.logFilePath != "") {
      const logDir = this.logFilePath || defaultTransportsOpt.File.dirname;

      // 确保日志目录存在
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // 使用相对路径，避免路径重复
      const filename = 'log-%DATE%.log';
      const fileTransports = new DailyRotateFile({
        level: this.logLevel,
        filename: filename,
        dirname: logDir,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true,
        json: false,
        format: logFormat,
      });

      trans.push(fileTransports);
    }

    // 添加控制台输出
    const consoleTransports = new transports.Console({
      level: this.logLevel,
      format: logFormat,
    });
    trans.push(consoleTransports);

    // 创建logger实例
    const logger = createLogger({
      levels: LogLevelObj,
      transports: trans,
      exitOnError: false,
      handleExceptions: true,
      handleRejections: true,
    });

    return logger;
  }

}
