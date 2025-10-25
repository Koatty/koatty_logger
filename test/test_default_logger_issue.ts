import { DefaultLogger } from '../src/default_logger';

console.log('测试 DefaultLogger 开箱即用...');

// 测试1: 直接使用,不配置
DefaultLogger.info('测试1: 这是一条普通日志');
DefaultLogger.warn('测试1: 这是一条警告日志');
DefaultLogger.error('测试1: 这是一条错误日志');

// 等待一段时间,看日志是否输出
setTimeout(() => {
  console.log('\n测试2: 配置后使用...');
  
  DefaultLogger.configure({
    minLevel: 'debug',
    buffer: {
      enableBuffer: false  // 禁用缓冲
    }
  });
  
  DefaultLogger.info('测试2: 这是一条普通日志');
  DefaultLogger.warn('测试2: 这是一条警告日志');
  DefaultLogger.error('测试2: 这是一条错误日志');
  
  setTimeout(() => {
    console.log('\n测试完成');
    process.exit(0);
  }, 2000);
}, 2000);
