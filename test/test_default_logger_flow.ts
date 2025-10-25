import { DefaultLogger } from '../src/default_logger';

console.log('=== 测试 DefaultLogger 开箱即用 ===\n');

// 不做任何配置,直接使用
console.log('测试: 不配置,直接使用 DefaultLogger');
DefaultLogger.info('测试1: info 日志');
DefaultLogger.warn('测试2: warn 日志');
DefaultLogger.error('测试3: error 日志');
DefaultLogger.debug('测试4: debug 日志');

// 检查内部状态
const stats = DefaultLogger.getStats();
console.log('\n统计信息:', JSON.stringify(stats, null, 2));

// 等待一段时间后检查
setTimeout(() => {
  console.log('\n=== 1秒后 ===');
  const stats2 = DefaultLogger.getStats();
  console.log('统计信息:', JSON.stringify(stats2, null, 2));
  
  // 手动刷新
  DefaultLogger.flush().then(() => {
    console.log('\n刷新完成');
    
    setTimeout(() => {
      console.log('\n=== 测试完成 ===');
      DefaultLogger.stop();
      process.exit(0);
    }, 500);
  });
}, 1000);
