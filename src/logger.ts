/*
 * @Author: richen
 * @Date: 2020-11-20 17:40:48
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2023-01-09 22:37:25
 * @License: BSD (3-Clause)
 * @Copyright (c) - <richenlin(at)gmail.com>
 */
import util from "util";
import * as helper from "koatty_lib";
import { ShieldLog } from "./shield";
import { ILogger, LogLevelType, LogTrans } from "./interface";
import { format, Logger as wLogger, transports, createLogger } from "winston";
const DailyRotateFile = helper.safeRequire("winston-daily-rotate-file");
const { combine, timestamp, label, printf } = format;

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
  private logFilePath = "./logs/";
  // 脱敏字段
  private sensFields: Set<string> = new Set();

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
    if (!helper.isTrueEmpty(opt)) {
      this.logLevel = opt.logLevel ?? this.logLevel;
      this.logFilePath = opt.logFilePath ?? this.logFilePath;
      this.sensFields = opt.sensFields ?? this.sensFields;
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
    this.logFilePath = f;
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
   * log Debug
   *
   * @returns {*} 
   * @memberof Logger
   */
  public Debug(...args: any[]) {
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
   * log Warn
   *
   * @returns {*} 
   * @memberof Logger
   */
  public Warn(...args: any[]) {
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
      name = name !== '' ? name.toUpperCase() : level.toUpperCase();
      // format
      args.unshift(name);
      this.logger[level](args);
    } catch (e) {
      console.error(e);
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
      if (level === "debug") {
        Error.captureStackTrace(this.emptyObj);
        const matchResult = (this.emptyObj.stack.slice(this.emptyObj.stack.lastIndexOf("koatty_logger"))).match(/\(.*?\)/g) || [];
        params.push(matchResult.join("  "));
      }

      return util.format.apply(null, params);
    } catch (e) {
      // console.error(e.stack);
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
        printf(({ level, message, label, timestamp }) => {
          return this.format(level, label, timestamp, message);
        }),
      ),
    });
  }

}

