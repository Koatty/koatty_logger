/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2023-01-07 14:57:03
 * @LastEditTime: 2023-01-09 17:47:02
 */
import { transports } from "winston";

// LogColor
export type LogColor = "white" | "blue" | "yellow" | "red";
// 日志级别
export type LogLevelType = "debug" | "info" | "warning" | "error";
// LogTrans
export interface LogTrans {
  Console?: transports.ConsoleTransportInstance;
  File?: transports.FileTransportInstance;
}

/**
 * Logger interface
 *
 * @export
 * @interface ILogger
 */
export interface ILogger {
  /**
   * log Debug
   *
   * @returns {*} 
   * @memberof Logger
   */
  Debug(...args: any[]): void;

  /**
   * log Info
   *
   * @returns {*} 
   * @memberof Logger
   */
  Info(...args: any[]): void;

  /**
   * log Warn
   *
   * @returns {*} 
   * @memberof Logger
   */
  Warn(...args: any[]): void;


  /**
   * log Error
   * 
   * @returns {*} 
   * @memberof Logger
   */
  Error(...args: any[]): void;

  /**
   * log Custom
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
  Log(...msg: any[]): void;
  Log(name: LogLevelType | string, ...msg: any[]): void;
  Log(name: LogLevelType | string, color: LogColor, ...msg: any[]): void;
}
