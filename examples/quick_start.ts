/*
 * @Description: 快速开始示例 - 3分钟掌握 koatty_logger
 * @Author: richen
 * @Date: 2025-10-25
 */

import { DefaultLogger } from '../src/default_logger';
import { Logger } from '../src/logger';

console.log('='.repeat(60));
console.log('koatty_logger 快速开始示例');
console.log('='.repeat(60));

// ============================================================
// 第1步: 开箱即用 - 零配置
// ============================================================
console.log('\n【第1步】开箱即用 - 零配置');
console.log('-'.repeat(60));

DefaultLogger.info('应用启动成功');
DefaultLogger.warn('这是一条警告');
DefaultLogger.error('这是一条错误');

console.log('\n✅ 就这么简单!无需任何配置');

// ============================================================
// 第2步: 可选配置 - 设置日志级别和文件
// ============================================================
setTimeout(() => {
  console.log('\n【第2步】可选配置 - 设置日志级别和文件');
  console.log('-'.repeat(60));

  DefaultLogger.configure({
    minLevel: 'debug',
    logFilePath: './logs/app.log'
  });

  DefaultLogger.debug('现在可以看到 debug 日志了');
  DefaultLogger.info('日志会同时输出到文件和控制台');

  console.log('\n✅ 一行配置,全局生效');

  // ============================================================
  // 第3步: 动态调整 - 运行时修改配置
  // ============================================================
  setTimeout(() => {
    console.log('\n【第3步】动态调整 - 运行时修改配置');
    console.log('-'.repeat(60));

    // 只记录错误
    DefaultLogger.setMinLevel('error');
    DefaultLogger.info('这条不会显示');
    DefaultLogger.error('只有错误会显示');

    // 恢复
    DefaultLogger.setMinLevel('info');
    DefaultLogger.info('现在又可以看到 info 了');

    console.log('\n✅ 无需重启,动态调整');

    // ============================================================
    // 第4步: 高级用法 - 使用独立 Logger 实例
    // ============================================================
    setTimeout(() => {
      console.log('\n【第4步】高级用法 - 独立 Logger 实例');
      console.log('-'.repeat(60));

      // 创建独立的日志器
      const auditLogger = new Logger({
        logLevel: 'info',
        logFilePath: './logs/audit.log',
        buffer: {
          enableBuffer: true,
          maxBufferSize: 100
        }
      });

      auditLogger.info('审计日志记录');
      DefaultLogger.info('应用日志记录');

      console.log('\n✅ 独立配置,互不干扰');

      // ============================================================
      // 总结
      // ============================================================
      setTimeout(() => {
        console.log('\n' + '='.repeat(60));
        console.log('总结');
        console.log('='.repeat(60));

        console.log('\n【推荐用法】');
        console.log('  • 90% 的场景: 使用 DefaultLogger');
        console.log('  • 10% 的场景: 使用 new Logger()');

        console.log('\n【核心特性】');
        console.log('  ✅ 开箱即用,零配置');
        console.log('  ✅ 动态调整,无需重启');
        console.log('  ✅ 安全脱敏,保护隐私');
        console.log('  ✅ 高性能缓冲,批量写入');
        console.log('  ✅ 路径安全,注入防护');

        console.log('\n【下一步】');
        console.log('  1. 查看完整示例: examples/default_logger_comprehensive.ts');
        console.log('  2. 阅读使用指南: docs/DefaultLogger_Usage.md');
        console.log('  3. 查看 API 文档: README.md');

        console.log('\n' + '='.repeat(60));
        console.log('快速开始完成!祝您使用愉快 🎉');
        console.log('='.repeat(60));

        // 清理
        Promise.all([
          DefaultLogger.flush(),
          auditLogger.flush()
        ]).then(() => {
          return Promise.all([
            DefaultLogger.stop(),
            auditLogger.destroy()
          ]);
        }).then(() => {
          process.exit(0);
        });
      }, 1000);
    }, 1000);
  }, 1000);
}, 1000);

