/*
 * @Description: DefaultLogger 综合示例 - 开箱即用与动态配置
 * @Author: richen
 * @Date: 2025-10-25
 */

import { DefaultLogger } from '../src/default_logger';

console.log('='.repeat(60));
console.log('DefaultLogger 综合示例');
console.log('='.repeat(60));

// ============================================================
// 场景 1: 开箱即用 - 无需任何配置
// ============================================================
console.log('\n【场景 1】开箱即用 - 直接调用,无需配置');
console.log('-'.repeat(60));

DefaultLogger.info('应用启动成功');
DefaultLogger.debug('这是调试信息');
DefaultLogger.warn('这是警告信息');
DefaultLogger.error('这是错误信息', new Error('示例错误'));

console.log('\n✅ 优势: 零配置,立即可用');

// ============================================================
// 场景 2: 基础配置 - 设置日志级别和文件路径
// ============================================================
setTimeout(() => {
  console.log('\n【场景 2】基础配置 - 设置日志级别和文件路径');
  console.log('-'.repeat(60));

  // 方式1: 使用 configure() 方法
  DefaultLogger.configure({
    minLevel: 'debug',
    logFilePath: './logs/app.log',
    sensFields: new Set(['password', 'token', 'secret'])
  });

  DefaultLogger.debug('现在可以看到 debug 日志了');
  DefaultLogger.info('用户登录', {
    username: 'john',
    password: 'secret123',  // 会被脱敏
    email: 'john@example.com'
  });

  console.log('\n✅ 优势: 一次配置,全局生效');

  // ============================================================
  // 场景 3: 动态调整 - 运行时修改配置
  // ============================================================
  setTimeout(() => {
    console.log('\n【场景 3】动态调整 - 运行时修改日志级别');
    console.log('-'.repeat(60));

    // 动态调整为只记录错误
    DefaultLogger.setMinLevel('error');
    
    DefaultLogger.debug('这条 debug 不会显示');
    DefaultLogger.info('这条 info 不会显示');
    DefaultLogger.warn('这条 warn 不会显示');
    DefaultLogger.error('只有 error 会显示');

    console.log('\n✅ 优势: 无需重启,动态调整');

    // ============================================================
    // 场景 4: 便捷方法 - 快速配置
    // ============================================================
    setTimeout(() => {
      console.log('\n【场景 4】便捷方法 - 快速配置');
      console.log('-'.repeat(60));

      // 恢复为 info 级别
      DefaultLogger.setMinLevel('info');

      // 使用便捷方法配置
      DefaultLogger.setLogPath('./logs/custom.log');
      DefaultLogger.setSensitiveFields(['creditCard', 'ssn']);

      DefaultLogger.info('用户支付', {
        userId: 123,
        creditCard: '1234-5678-9012-3456',  // 会被脱敏
        amount: 99.99
      });

      console.log('\n✅ 优势: API 简洁,易于使用');

      // ============================================================
      // 场景 5: 高性能模式 - 启用缓冲
      // ============================================================
      setTimeout(() => {
        console.log('\n【场景 5】高性能模式 - 启用缓冲');
        console.log('-'.repeat(60));

        // 启用缓冲模式
        DefaultLogger.enableBuffering({
          maxBufferSize: 10,
          flushInterval: 1000,
          flushOnLevel: 'error'
        });

        console.log('缓冲已启用,日志会批量写入...');
        
        for (let i = 1; i <= 5; i++) {
          DefaultLogger.info(`批量日志 ${i}`);
        }

        console.log('\n等待缓冲区刷新...');

        setTimeout(() => {
          DefaultLogger.error('错误会立即刷新缓冲区');
          
          console.log('\n✅ 优势: 高并发场景下性能提升 200-500%');

          // ============================================================
          // 场景 6: 采样日志 - 减少高频日志
          // ============================================================
          setTimeout(() => {
            console.log('\n【场景 6】采样日志 - 减少高频日志');
            console.log('-'.repeat(60));

            // 设置采样率为 20%
            DefaultLogger.setSamplingRate('api-request', 0.2);

            console.log('模拟 20 次 API 请求,只记录 20% (约 4 条)...');
            for (let i = 1; i <= 20; i++) {
              DefaultLogger.InfoSampled('api-request', `API 请求 ${i}`, {
                method: 'GET',
                url: `/api/users/${i}`
              });
            }

            console.log('\n✅ 优势: 减少日志洪流,保持系统性能');

            // ============================================================
            // 场景 7: 实时模式 - 禁用缓冲
            // ============================================================
            setTimeout(() => {
              console.log('\n【场景 7】实时模式 - 禁用缓冲');
              console.log('-'.repeat(60));

              // 禁用缓冲,恢复实时输出
              DefaultLogger.disableBuffering();

              DefaultLogger.info('实时输出模式,日志立即写入');
              DefaultLogger.debug('适合开发和调试场景');

              console.log('\n✅ 优势: 实时输出,方便调试');

              // ============================================================
              // 场景 8: 状态查询 - 获取统计信息
              // ============================================================
              setTimeout(() => {
                console.log('\n【场景 8】状态查询 - 获取统计信息');
                console.log('-'.repeat(60));

                const stats = DefaultLogger.getStats();
                console.log('统计信息:', JSON.stringify(stats, null, 2));

                const config = DefaultLogger.getConfig();
                console.log('\n当前配置:', JSON.stringify({
                  minLevel: config.minLevel,
                  logFilePath: config.logFilePath,
                  buffer: config.buffer
                }, null, 2));

                const status = DefaultLogger.getStatus();
                console.log('\n初始化状态:', status);

                console.log('\n✅ 优势: 透明可观测,便于监控');

                // ============================================================
                // 总结
                // ============================================================
                setTimeout(() => {
                  console.log('\n' + '='.repeat(60));
                  console.log('总结: DefaultLogger vs new Logger()');
                  console.log('='.repeat(60));
                  
                  console.log('\n【DefaultLogger】- 推荐用于大多数场景');
                  console.log('  ✅ 开箱即用,零配置');
                  console.log('  ✅ 全局单例,配置统一');
                  console.log('  ✅ 动态调整,运行时配置');
                  console.log('  ✅ 便捷方法,简化使用');
                  console.log('  ✅ 适合: Web 应用、API 服务、后台任务');

                  console.log('\n【new Logger()】- 高级用法');
                  console.log('  ✅ 多实例,独立配置');
                  console.log('  ✅ 精细控制,高度定制');
                  console.log('  ✅ 隔离日志,按模块分离');
                  console.log('  ✅ 适合: 微服务、插件系统、复杂架构');

                  console.log('\n' + '='.repeat(60));
                  console.log('示例运行完成!');
                  console.log('='.repeat(60));

                  // 优雅关闭
                  DefaultLogger.flush().then(() => {
                    DefaultLogger.stop().then(() => {
                      process.exit(0);
                    });
                  });
                }, 1000);
              }, 500);
            }, 1000);
          }, 2000);
        }, 1500);
      }, 1000);
    }, 1000);
  }, 1000);
}, 1000);

