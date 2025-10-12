/*
 * @Description: Log level filter implementation
 * @Usage: Filter logs by minimum level
 * @Author: richen
 * @Date: 2025-10-12
 * @LastEditTime: 2025-10-12
 */

/**
 * 日志级别过滤器
 */
export class LogLevelFilter {
  private minLevel: 'debug' | 'info' | 'warn' | 'error';
  private readonly levelPriority = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  constructor(minLevel: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    this.minLevel = minLevel;
  }

  /**
   * 设置最小日志级别
   */
  setMinLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.minLevel = level;
  }

  /**
   * 判断是否应该记录此级别的日志
   */
  shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  /**
   * 获取当前最小级别
   */
  getMinLevel(): string {
    return this.minLevel;
  }
}

