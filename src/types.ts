/*
 * @Description: Logger type definitions
 * @Usage: Type definitions for enhanced logger features
 * @Author: richen
 * @Date: 2025-10-12
 * @LastEditTime: 2025-10-12
 */
import { LogEntry as InterfaceLogEntry, LogLevelType } from './interface';
import { LoggerOpt } from './logger';

/**
 * 日志条目接口 (重新导出以保持一致性)
 */
export type LogEntry = InterfaceLogEntry;

/**
 * 缓冲配置接口
 */
export interface BufferConfig {
  /** 最大缓冲区大小（默认100） */
  maxBufferSize?: number;
  
  /** 刷新间隔（毫秒，默认1000） */
  flushInterval?: number;
  
  /** 立即刷新的最低级别（默认error） */
  flushOnLevel?: 'error' | 'warn' | 'info' | 'debug' | 'fatal';
  
  /** 是否启用缓冲（默认true） */
  enableBuffer?: boolean;
}

/**
 * 采样配置接口
 */
export interface SamplingConfig {
  /** 采样率 Map: key -> rate (0-1) */
  sampleRates?: Map<string, number>;
}

/**
 * 日志配置接口 - 扩展自 LoggerOpt
 */
export interface LoggerConfig extends Partial<LoggerOpt> {
  /** 缓冲配置 */
  buffer?: BufferConfig;
  
  /** 采样配置 */
  sampling?: SamplingConfig;
  
  /** 最小日志级别 */
  minLevel?: LogLevelType;
}

/**
 * 日志统计接口
 */
export interface LogStats {
  buffer: {
    bufferSize: number;
    totalLogs: number;
    droppedLogs: number;
    droppedRate: number;
  };
  sampling?: Map<string, {
    sampleRate: number;
    counter: number;
  }>;
  minLevel: LogLevelType;
}

