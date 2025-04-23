/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2023-01-07 14:57:03
 * @LastEditTime: 2025-04-16 13:50:00
 */

// LogColor
export type LogColor = "white" | "blue" | "yellow" | "red";
// 日志级别
export type LogLevelType = "debug" | "info" | "warning" | "error";


/**
 * Log level mapping object.
 * Defines the severity levels for logging with corresponding numeric values.
 * - debug: 7 (lowest severity)
 * - info: 6
 * - warning: 4
 * - error: 3 (highest severity)
 */
export const LogLevelObj: Record<LogLevelType, number> = {
  "debug": 7,
  "info": 6,
  "warning": 4,
  "error": 3
};

/**
 * Interface for logger configuration options
 * @interface LoggerOpt
 * @property {LogLevelType} [logLevel] - The level of logging to be used
 * @property {string} [logFilePath] - The file path where logs will be written
 * @property {Set<string>} [sensFields] - Set of sensitive fields to be masked in logs
 */
export interface LoggerOpt {
  logLevel?: LogLevelType;
  logFilePath?: string;
  sensFields?: Set<string>;
}

