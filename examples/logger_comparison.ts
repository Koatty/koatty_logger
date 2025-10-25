/*
 * @Description: DefaultLogger vs new Logger() 对比示例
 * @Author: richen
 * @Date: 2025-10-25
 */

import { DefaultLogger } from '../src/default_logger';
import { Logger } from '../src/logger';

console.log('='.repeat(70));
console.log('DefaultLogger vs new Logger() - 使用场景对比');
console.log('='.repeat(70));

// ============================================================
// 场景 1: 简单 Web 应用 - 推荐使用 DefaultLogger
// ============================================================
console.log('\n【场景 1】简单 Web 应用 - 使用 DefaultLogger');
console.log('-'.repeat(70));

// 开箱即用,无需配置
DefaultLogger.info('[App] 应用启动');
DefaultLogger.info('[App] 监听端口 3000');

// 可选:配置一下
DefaultLogger.configure({
  minLevel: 'info',
  logFilePath: './logs/app.log'
});

DefaultLogger.info('[App] 配置已更新');

console.log('✅ 优势: 简单直接,全局统一,适合单体应用');

// ============================================================
// 场景 2: 微服务架构 - 推荐使用 new Logger()
// ============================================================
setTimeout(() => {
  console.log('\n【场景 2】微服务架构 - 使用 new Logger()');
  console.log('-'.repeat(70));

  // 每个服务独立的日志器
  const userServiceLogger = new Logger({
    logLevel: 'debug',
    logFilePath: './logs/user-service.log'
  });

  const orderServiceLogger = new Logger({
    logLevel: 'info',
    logFilePath: './logs/order-service.log'
  });

  const paymentServiceLogger = new Logger({
    logLevel: 'warn',
    logFilePath: './logs/payment-service.log',
    sensFields: new Set(['creditCard', 'cvv'])
  });

  userServiceLogger.info('[UserService] 用户查询');
  orderServiceLogger.info('[OrderService] 订单创建');
  paymentServiceLogger.warn('[PaymentService] 支付处理', {
    creditCard: '1234-5678-9012-3456'  // 会被脱敏
  });

  console.log('✅ 优势: 日志隔离,独立配置,便于分布式追踪');

  // ============================================================
  // 场景 3: 插件系统 - 推荐使用 new Logger()
  // ============================================================
  setTimeout(() => {
    console.log('\n【场景 3】插件系统 - 使用 new Logger()');
    console.log('-'.repeat(70));

    // 模拟插件系统
    class Plugin {
      private logger: Logger;
      
      constructor(private name: string) {
        // 每个插件有独立的日志器
        this.logger = new Logger({
          logLevel: 'debug',
          logFilePath: `./logs/plugin-${name}.log`
        });
      }

      execute() {
        this.logger.info(`[${this.name}] 插件执行开始`);
        this.logger.debug(`[${this.name}] 处理中...`);
        this.logger.info(`[${this.name}] 插件执行完成`);
      }
    }

    const pluginA = new Plugin('authentication');
    const pluginB = new Plugin('authorization');
    const pluginC = new Plugin('caching');

    pluginA.execute();
    pluginB.execute();
    pluginC.execute();

    console.log('✅ 优势: 插件隔离,避免日志混乱');

    // ============================================================
    // 场景 4: 混合使用 - DefaultLogger + 特殊Logger
    // ============================================================
    setTimeout(() => {
      console.log('\n【场景 4】混合使用 - DefaultLogger + 特殊Logger');
      console.log('-'.repeat(70));

      // 大部分代码使用 DefaultLogger
      DefaultLogger.info('[App] 处理请求');
      DefaultLogger.info('[App] 业务逻辑');

      // 关键业务使用独立Logger,启用高性能缓冲
      const auditLogger = new Logger({
        logLevel: 'info',
        logFilePath: './logs/audit.log',
        buffer: {
          enableBuffer: true,
          maxBufferSize: 500,
          flushInterval: 100,
          flushOnLevel: 'error'
        }
      });

      // 审计日志使用高性能模式
      for (let i = 1; i <= 10; i++) {
        auditLogger.info(`[Audit] 操作记录 ${i}`, {
          userId: 123,
          action: 'update',
          resource: 'user-profile'
        });
      }

      console.log('✅ 优势: 灵活组合,兼顾便利性和性能');

      // ============================================================
      // 场景 5: 动态日志级别 - DefaultLogger 更方便
      // ============================================================
      setTimeout(() => {
        console.log('\n【场景 5】动态日志级别 - DefaultLogger 更方便');
        console.log('-'.repeat(70));

        console.log('当前级别: info');
        DefaultLogger.info('[App] 这条会显示');
        DefaultLogger.debug('[App] 这条不会显示');

        console.log('\n动态调整为 debug...');
        DefaultLogger.setMinLevel('debug');
        
        DefaultLogger.info('[App] 这条会显示');
        DefaultLogger.debug('[App] 现在可以看到 debug 了');

        console.log('\n动态调整为 error...');
        DefaultLogger.setMinLevel('error');
        
        DefaultLogger.info('[App] 这条不会显示');
        DefaultLogger.error('[App] 只有 error 会显示');

        console.log('\n✅ 优势: 运行时调整,无需重启应用');

        // ============================================================
        // 总结
        // ============================================================
        setTimeout(() => {
          console.log('\n' + '='.repeat(70));
          console.log('使用建议');
          console.log('='.repeat(70));

          console.log('\n【推荐使用 DefaultLogger 的场景】');
          console.log('  1. 单体应用,统一日志管理');
          console.log('  2. 快速开发,零配置开箱即用');
          console.log('  3. 需要运行时动态调整日志级别');
          console.log('  4. Web API、后台任务、脚本工具');
          console.log('  5. 团队规模小,不需要复杂日志策略');

          console.log('\n【推荐使用 new Logger() 的场景】');
          console.log('  1. 微服务架构,每个服务独立日志');
          console.log('  2. 插件系统,需要日志隔离');
          console.log('  3. 多模块应用,不同模块不同策略');
          console.log('  4. 高性能场景,需要精细化缓冲控制');
          console.log('  5. 复杂业务,需要多个日志器实例');

          console.log('\n【混合使用策略】');
          console.log('  1. 主应用使用 DefaultLogger (简单方便)');
          console.log('  2. 关键模块使用独立 Logger (精细控制)');
          console.log('  3. 审计日志使用独立 Logger (合规要求)');
          console.log('  4. 性能敏感使用独立 Logger (缓冲优化)');

          console.log('\n' + '='.repeat(70));
          console.log('对比示例运行完成!');
          console.log('='.repeat(70));

          // 清理资源
          Promise.all([
            DefaultLogger.flush(),
            auditLogger.flush()
          ]).then(() => {
            return Promise.all([
              DefaultLogger.stop(),
              userServiceLogger.destroy(),
              orderServiceLogger.destroy(),
              paymentServiceLogger.destroy(),
              auditLogger.destroy()
            ]);
          }).then(() => {
            process.exit(0);
          });
        }, 1000);
      }, 1000);
    }, 1000);
  }, 1000);
}, 1000);

