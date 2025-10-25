/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2021-12-18 20:03:31
 * @LastEditTime: 2025-10-25
 */
import { Logger } from "./logger";
import { LoggerConfig } from "./types";

// ============ 导出核心类和接口 ============
export * from "./logger";
export * from "./interface";

// ============ 导出增强功能组件 ============
export * from "./buffered_logger";
export * from "./sampling";
export * from "./level_filter";

// ============ 导出类型定义 ============
export type { BufferConfig, SamplingConfig, LoggerConfig, LogStats } from "./types";

// ============ 导出默认日志器 ============
export { DefaultLogger } from "./default_logger";

/**
 * 创建日志器的工厂函数
 * Logger 现在已整合所有增强功能，可根据配置自动启用
 */
export function createLogger(config?: LoggerConfig): Logger {
  return new Logger(config);
}