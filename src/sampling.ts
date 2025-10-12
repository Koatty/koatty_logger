/*
 * @Description: Log sampling implementation
 * @Usage: Reduce high-frequency log volume
 * @Author: richen
 * @Date: 2025-10-12
 * @LastEditTime: 2025-10-12
 */

/**
 * 日志采样器
 * 用于减少高频日志的数量
 */
export class SamplingLogger {
  private sampleRates = new Map<string, number>();
  private counters = new Map<string, number>();

  /**
   * 设置采样率
   * @param key 日志标识
   * @param rate 采样率 (0-1)
   */
  setSampleRate(key: string, rate: number): void {
    if (rate < 0 || rate > 1) {
      throw new Error('Sample rate must be between 0 and 1');
    }
    this.sampleRates.set(key, rate);
  }

  /**
   * 判断是否应该记录此日志
   * @param key 日志标识
   * @returns true 记录，false 跳过
   */
  shouldSample(key: string): boolean {
    const rate = this.sampleRates.get(key);
    
    if (rate === undefined || rate === 1.0) {
      return true;
    }
    
    if (rate === 0.0) {
      return false;
    }

    const counter = (this.counters.get(key) || 0) + 1;
    this.counters.set(key, counter);

    const threshold = Math.floor(1 / rate);
    const shouldLog = counter % threshold === 0;

    // 重置计数器避免溢出
    if (counter >= threshold * 100) {
      this.counters.set(key, 0);
    }

    return shouldLog;
  }

  /**
   * 重置计数器
   */
  reset(): void {
    this.counters.clear();
  }

  /**
   * 获取统计信息
   */
  getStats(): Map<string, { sampleRate: number; counter: number }> {
    const stats = new Map<string, { sampleRate: number; counter: number }>();
    this.sampleRates.forEach((rate, key) => {
      stats.set(key, {
        sampleRate: rate,
        counter: this.counters.get(key) || 0
      });
    });
    return stats;
  }
}

