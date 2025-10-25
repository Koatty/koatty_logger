/*
 * @Description: Log level filter implementation
 * @Usage: Filter logs by minimum level
 * @Author: richen
 * @Date: 2025-10-12
 * @LastEditTime: 2025-10-12
 */
import { LogLevelType } from './interface';

/**
 * 日志级别过滤器
 */
export class LogLevelFilter {
  private minLevel: LogLevelType;
  private readonly levelPriority: Record<LogLevelType, number> = {
    debug: 0,
    info: 1,
    warning: 2,
    error: 3
  };

  constructor(minLevel: LogLevelType = 'info') {
    this.minLevel = minLevel;
  }

  /**
   * 设置最小日志级别
   */
  setMinLevel(level: LogLevelType): void {
    this.minLevel = level;
  }

  /**
   * 判断是否应该记录此级别的日志
   */
  shouldLog(level: LogLevelType): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  /**
   * 获取当前最小级别
   */
  getMinLevel(): LogLevelType {
    return this.minLevel;
  }
}

