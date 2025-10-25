import { DefaultLogger } from '../src/default_logger';
import * as fs from 'fs';
import * as path from 'path';

console.log('=== 详细测试 DefaultLogger ===\n');

// 清理旧的日志文件
const logDir = path.join(process.cwd(), 'logs');
const logFile = path.join(logDir, 'default_test.log');
if (fs.existsSync(logFile)) {
  fs.unlinkSync(logFile);
  console.log('已清理旧日志文件\n');
}

// 测试1: 默认配置(启用缓冲),不设置日志文件
console.log('测试1: 默认配置(启用缓冲),仅console输出');
DefaultLogger.info('测试1: info日志');
DefaultLogger.warn('测试1: warn日志');
DefaultLogger.error('测试1: error日志');

// 检查统计信息
setTimeout(() => {
  const stats = DefaultLogger.getStats();
  console.log('\n缓冲区状态:', JSON.stringify(stats?.buffer, null, 2));
  
  console.log('\n测试2: 配置日志文件路径');
  DefaultLogger.configure({
    logFilePath: './logs/default_test.log',
    buffer: {
      enableBuffer: true,
      maxBufferSize: 5,
      flushInterval: 500
    }
  });
  
  DefaultLogger.info('测试2: 写入文件的info日志');
  DefaultLogger.warn('测试2: 写入文件的warn日志');
  
  setTimeout(() => {
    const stats2 = DefaultLogger.getStats();
    console.log('\n配置后缓冲区状态:', JSON.stringify(stats2?.buffer, null, 2));
    
    // 手动刷新
    console.log('\n手动刷新缓冲区...');
    DefaultLogger.flush().then(() => {
      console.log('刷新完成');
      
      // 检查日志文件是否存在
      setTimeout(() => {
        if (fs.existsSync(logFile)) {
          const content = fs.readFileSync(logFile, 'utf-8');
          console.log('\n日志文件内容:');
          console.log(content);
        } else {
          console.log('\n❌ 日志文件不存在!');
        }
        
        // 测试3: 禁用缓冲
        console.log('\n测试3: 禁用缓冲,立即写入');
        DefaultLogger.configure({
          logFilePath: './logs/default_test.log',
          buffer: {
            enableBuffer: false
          }
        });
        
        DefaultLogger.info('测试3: 立即写入的info日志');
        DefaultLogger.error('测试3: 立即写入的error日志');
        
        setTimeout(() => {
          if (fs.existsSync(logFile)) {
            const content = fs.readFileSync(logFile, 'utf-8');
            console.log('\n最终日志文件内容:');
            console.log(content);
          }
          
          console.log('\n=== 测试完成 ===');
          process.exit(0);
        }, 1000);
      }, 500);
    });
  }, 1000);
}, 1000);
