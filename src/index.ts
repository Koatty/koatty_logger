/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2021-12-18 20:03:31
 * @LastEditTime: 2025-10-12 16:32:08
 */
import { Logger } from "./logger";
import { EnhancedLogger } from "./enhanced_logger";
import { LoggerConfig } from "./types";

// export
export * from "./logger";
export * from "./interface";
export * from "./enhanced_logger";
export * from "./buffered_logger";
export * from "./sampling";
export * from "./level_filter";

// 导出 types，但排除 LogEntry (已在 interface.ts 中导出)
export type { BufferConfig, SamplingConfig, LoggerConfig, LogStats } from "./types";

/**
 * DefaultLogger - 默认开启批量日志处理优化的增强日志器
 * 
 * 默认配置：
 * - 启用批量写入缓冲
 * - 缓冲区大小：100 条
 * - 刷新间隔：1000ms
 * - error 级别立即刷新
 */
export const DefaultLogger: EnhancedLogger = new EnhancedLogger({
  buffer: {
    enableBuffer: true,
    maxBufferSize: 100,
    flushInterval: 1000,
    flushOnLevel: 'error'
  }
});

/**
 * 创建日志器的工厂函数
 */
export function createLogger(config?: LoggerConfig): EnhancedLogger | Logger {
  // 如果配置了缓冲/采样/级别过滤，使用增强版
  if (config?.buffer || config?.sampling || config?.minLevel) {
    return new EnhancedLogger(config);
  }
  
  // 否则使用默认版本
  return new Logger(config);
}