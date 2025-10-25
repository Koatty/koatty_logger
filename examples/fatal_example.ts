/*
 * @Description: Fatal 日志级别示例 - 解决进程退出时日志丢失问题
 * @Author: richen
 * @Date: 2025-10-25
 */

import { DefaultLogger } from '../src/default_logger';

console.log('='.repeat(60));
console.log('Fatal 日志级别示例');
console.log('='.repeat(60));

// ============================================================
// 场景 1: 基础 Fatal 日志 (同步写入,不会丢失)
// ============================================================
console.log('\n【场景 1】基础 Fatal 日志');
console.log('-'.repeat(60));

try {
  // 模拟关键操作失败
  throw new Error('Database connection failed');
} catch (error) {
  // ✅ fatal 使用同步写入,日志不会丢失
  DefaultLogger.fatal('Critical error occurred', error);
  console.log('Fatal 日志已记录(同步),进程可以安全退出');
  
  // 如果需要退出
  // process.exit(1);
}

// ============================================================
// 场景 2: 优雅退出 - 使用 fatalAndExit
// ============================================================
setTimeout(async () => {
  console.log('\n【场景 2】优雅退出 - fatalAndExit');
  console.log('-'.repeat(60));

  console.log('模拟致命错误,需要退出进程...');
  
  // ✅ fatalAndExit 会自动:
  // 1. 记录 fatal 日志(同步)
  // 2. 刷新所有缓冲
  // 3. 等待日志写入完成
  // 4. 清理资源
  // 5. 退出进程
  
  // 注释掉实际退出,避免终止示例
  // await DefaultLogger.fatalAndExit('Application cannot continue', 1);
  
  console.log('(实际场景会在此退出进程)');
  
  // ============================================================
  // 场景 3: 未捕获异常处理
  // ============================================================
  setTimeout(() => {
    console.log('\n【场景 3】未捕获异常处理');
    console.log('-'.repeat(60));

    // 设置全局异常处理器
    process.on('uncaughtException', async (error) => {
      console.log('捕获到未处理异常!');
      
      // ✅ 使用 fatal 记录,确保日志不丢失
      DefaultLogger.fatal('Uncaught exception', error);
      
      // 生产环境应该退出
      // await DefaultLogger.fatalAndExit('Uncaught exception', 1, error);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.log('捕获到未处理的 Promise 拒绝!');
      
      DefaultLogger.fatal('Unhandled promise rejection', {
        reason,
        promise: String(promise)
      });
      
      // 生产环境应该退出
      // await DefaultLogger.fatalAndExit('Unhandled rejection', 1, reason as Error);
    });

    console.log('✅ 全局异常处理器已设置');
    
    // ============================================================
    // 场景 4: 对比异步日志的问题
    // ============================================================
    setTimeout(() => {
      console.log('\n【场景 4】对比: 异步 vs 同步');
      console.log('-'.repeat(60));

      console.log('\n❌ 错误做法 - 使用异步日志 + 立即退出:');
      console.log('logger.error("Critical error");');
      console.log('process.exit(1);  // 日志可能丢失!');

      console.log('\n✅ 正确做法1 - 使用 fatal (同步):');
      console.log('logger.fatal("Critical error");');
      console.log('process.exit(1);  // 日志已写入');

      console.log('\n✅ 正确做法2 - 使用 fatalAndExit (推荐):');
      console.log('await logger.fatalAndExit("Critical error", 1);');

      console.log('\n✅ 正确做法3 - 手动 flush:');
      console.log('logger.error("Critical error");');
      console.log('await logger.flush();');
      console.log('process.exit(1);');
      
      // ============================================================
      // 场景 5: 实际应用示例
      // ============================================================
      setTimeout(async () => {
        console.log('\n【场景 5】实际应用示例');
        console.log('-'.repeat(60));

        class Application {
          async start() {
            try {
              await this.initDatabase();
              await this.startServer();
              DefaultLogger.info('Application started successfully');
            } catch (error) {
              // 致命错误,无法继续运行
              console.log('应用启动失败,记录 fatal 日志并退出');
              DefaultLogger.fatal('Failed to start application', error);
              // await DefaultLogger.fatalAndExit('Failed to start', 1, error as Error);
            }
          }

          private async initDatabase() {
            // 模拟数据库连接
            console.log('初始化数据库连接...');
            // throw new Error('Database connection timeout');
          }

          private async startServer() {
            console.log('启动服务器...');
          }
        }

        const app = new Application();
        await app.start();

        // ============================================================
        // 总结
        // ============================================================
        setTimeout(() => {
          console.log('\n' + '='.repeat(60));
          console.log('总结');
          console.log('='.repeat(60));

          console.log('\n【Fatal 日志特点】');
          console.log('  ✅ 同步写入 - 不会因进程退出而丢失');
          console.log('  ✅ 最高优先级 - 总是被记录');
          console.log('  ✅ 双重输出 - 同时写入文件和 console');
          console.log('  ✅ 立即刷新 - 触发缓冲区立即刷新');

          console.log('\n【使用场景】');
          console.log('  1. 致命错误导致进程退出');
          console.log('  2. 未捕获异常处理');
          console.log('  3. 关键资源初始化失败');
          console.log('  4. 系统无法继续运行的情况');

          console.log('\n【最佳实践】');
          console.log('  ✅ 进程退出前使用 fatal');
          console.log('  ✅ 推荐使用 fatalAndExit 优雅退出');
          console.log('  ✅ 设置全局异常处理器');
          console.log('  ✅ 避免在高频场景使用(性能考虑)');

          console.log('\n【性能说明】');
          console.log('  • Fatal 使用同步写入,比异步慢 ~100倍');
          console.log('  • 但 fatal 是低频操作,影响可接受');
          console.log('  • 仅在进程即将退出时使用');

          console.log('\n' + '='.repeat(60));
          console.log('示例运行完成!');
          console.log('='.repeat(60));

          DefaultLogger.stop().then(() => {
            process.exit(0);
          });
        }, 1000);
      }, 1000);
    }, 1000);
  }, 1000);
}, 1000);

