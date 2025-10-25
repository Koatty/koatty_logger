/*
 * @Description: Buffered logger implementation
 * @Usage: Batch log processing to reduce I/O operations
 * @Author: richen
 * @Date: 2025-10-12
 * @LastEditTime: 2025-10-12
 */
import { LogEntry, BufferConfig } from './types';

/**
 * 批量日志处理器
 * 通过缓冲和批量写入减少 I/O 操作
 */
export class BufferedLogger {
  private buffer: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private config: Required<BufferConfig>;
  private isFlushing = false;
  private droppedLogs = 0;
  private totalLogs = 0;
  private flushCallback: ((entries: LogEntry[]) => void) | null = null;

  constructor(config: BufferConfig = {}) {
    this.config = {
      maxBufferSize: config.maxBufferSize ?? 100,
      flushInterval: config.flushInterval ?? 1000,
      flushOnLevel: config.flushOnLevel ?? 'error',
      enableBuffer: config.enableBuffer ?? true
    };

    if (this.config.enableBuffer) {
      this.startFlushTimer();
    }
  }

  /**
   * 设置刷新回调
   */
  setFlushCallback(callback: (entries: LogEntry[]) => void): void {
    this.flushCallback = callback;
  }

  /**
   * 添加日志到缓冲区
   */
  addLog(entry: LogEntry): void {
    this.totalLogs++;

    // 禁用缓冲时立即写入
    if (!this.config.enableBuffer) {
      this.flushImmediately([entry]);
      return;
    }

    // 缓冲区满时强制刷新
    if (this.buffer.length >= this.config.maxBufferSize) {
      this.droppedLogs++;
      this.flush();
    }

    this.buffer.push(entry);

    // 根据级别决定是否立即刷新
    if (this.shouldFlushImmediately(entry.level)) {
      this.flush();
    }
  }

/**
 * 判断是否需要立即刷新
 */
private shouldFlushImmediately(level: string): boolean {
  const levelMap: Record<string, number> = {
    'debug': 0,
    'info': 1,
    'warn': 2,
    'warning': 2,
    'error': 3,
    'fatal': 4  // 最高优先级,总是立即刷新
  };
  const currentLevel = levelMap[level] ?? 1;
  const flushLevel = levelMap[this.config.flushOnLevel] ?? 3;
  return currentLevel >= flushLevel;
}

  /**
   * 刷新缓冲区
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) {
      return;
    }

    this.isFlushing = true;

    try {
      const entriesToFlush = this.buffer.splice(0);
      if (this.flushCallback) {
        this.flushCallback(entriesToFlush);
      } else {
        // 降级方案: 当没有回调时,直接输出到console
        entriesToFlush.forEach(entry => {
          const levelMethod = entry.level === 'error' ? 'error' : 
                             entry.level === 'warning' ? 'warn' : 
                             'log';
          console[levelMethod](`[${entry.level.toUpperCase()}]`, ...entry.args);
        });
      }
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * 立即刷新（同步）
   */
  private flushImmediately(entries: LogEntry[]): void {
    if (this.flushCallback) {
      this.flushCallback(entries);
    } else {
      // 降级方案: 当没有回调时,直接输出到console
      entries.forEach(entry => {
        const levelMethod = entry.level === 'error' ? 'error' : 
                           entry.level === 'warning' ? 'warn' : 
                           'log';
        console[levelMethod](`[${entry.level.toUpperCase()}]`, ...entry.args);
      });
    }
  }

  /**
   * 启动定时刷新
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);

    // 使用 unref() 防止阻塞进程退出
    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }

    // 进程退出时刷新日志
    if (typeof process !== 'undefined') {
      const cleanup = () => {
        this.flush();
        this.stop();
      };
      
      process.once('beforeExit', cleanup);
      process.once('SIGINT', cleanup);
      process.once('SIGTERM', cleanup);
    }
  }

  /**
   * 停止并刷新剩余日志
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    bufferSize: number;
    totalLogs: number;
    droppedLogs: number;
    droppedRate: number;
  } {
    return {
      bufferSize: this.buffer.length,
      totalLogs: this.totalLogs,
      droppedLogs: this.droppedLogs,
      droppedRate: this.totalLogs > 0 ? this.droppedLogs / this.totalLogs : 0
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<BufferConfig>): void {
    Object.assign(this.config, config);
    
    if (this.config.enableBuffer) {
      this.startFlushTimer();
    } else if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

