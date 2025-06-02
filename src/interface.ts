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

// 批量写入配置
export interface BatchConfig {
  enabled?: boolean;           // 是否启用批量写入
  maxSize?: number;           // 最大缓冲区大小（条目数）
  flushInterval?: number;     // 刷新间隔（毫秒）
  maxWaitTime?: number;       // 最大等待时间（毫秒）
}

// 日志条目接口
export interface LogEntry {
  level: LogLevelType;
  name: string;
  args: any[];
  timestamp: number;
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

  /**
   * Enable or disable logging
   * @param b - boolean flag
   */
  enable(b?: boolean): void;

  /**
   * Get current log level
   */
  getLevel(): LogLevelType;

  /**
   * Set log level
   * @param level - log level
   */
  setLevel(level: LogLevelType): void;

  /**
   * Get current log file path
   */
  getLogFilePath(): string;

  /**
   * Set log file path (with security validation)
   * @param f - file path
   */
  setLogFilePath(f: string): void;

  /**
   * Get sensitive fields
   */
  getSensFields(): Set<string>;

  /**
   * Add sensitive fields
   * @param fields - array of field names
   */
  setSensFields(fields: string[]): void;

  /**
   * Clear all sensitive fields
   */
  clearSensFields(): void;

  /**
   * Reset sensitive fields to specific list
   * @param fields - array of field names
   */
  resetSensFields(fields: string[]): void;

  /**
   * Destroy logger instance and release resources
   */
  destroy(): void;

  /**
   * Enable or disable batch writing
   * @param enabled - whether to enable batch writing
   */
  enableBatch(enabled?: boolean): void;

  /**
   * Set batch writing configuration
   * @param config - batch configuration
   */
  setBatchConfig(config: Partial<BatchConfig>): void;

  /**
   * Get current batch configuration
   */
  getBatchConfig(): BatchConfig;

  /**
   * Get batch writing status
   */
  getBatchStatus(): {
    enabled: boolean;
    bufferSize: number;
    maxSize?: number;
    timeSinceLastFlush: number;
  };

  /**
   * Flush batch buffer immediately
   */
  flushBatch(): Promise<void>;
}
