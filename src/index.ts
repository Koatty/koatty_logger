/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2021-12-18 20:03:31
 * @LastEditTime: 2022-05-26 12:47:09
 */
import { Logger, LogLevelType } from "./logger";
// export
export * from "./logger";
// LogColor
export type LogColor = "white" | "grey" | "black" | "blue" | "cyan" | "green" | "magenta" | "red" | "yellow";

/**
 * Logger interface
 *
 * @export
 * @interface ILogger
 */
export interface ILogger {
  /**
   * getLevel
   */
  getLevel(): LogLevelType;

  /**
   * setLevel
   */
  setLevel(level: LogLevelType): void;
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
   * Logger.Log('name', 'color', 'msg')
   * 
   * Logger.Log('name', 'color', 'msg1', 'msg2'...)
   *
   * @param {...any[]} args
   * @returns {*} 
   * @memberof Logger
   */
  Log(...msg: any[]): void;
  Log(name: string, ...msg: any[]): void;
  Log(name: string, color: LogColor, ...msg: any[]): void;
}

//DefaultLogger
export const DefaultLogger = new Logger();