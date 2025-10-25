import { BufferedLogger } from '../src/buffered_logger';

console.log('测试 BufferedLogger 在没有设置 flushCallback 时的行为\n');

// 场景1: 创建 BufferedLogger 但不设置 flushCallback
console.log('场景1: 启用缓冲,但不设置 flushCallback');
const bufferedLogger1 = new BufferedLogger({
  enableBuffer: true,
  maxBufferSize: 5,
  flushInterval: 1000
});

bufferedLogger1.addLog({ level: 'info', name: 'test', args: ['日志1: 这条日志会被缓冲'], timestamp: Date.now() });
bufferedLogger1.addLog({ level: 'info', name: 'test', args: ['日志2: 这条日志会被缓冲'], timestamp: Date.now() });
bufferedLogger1.addLog({ level: 'error', name: 'test', args: ['日志3: error级别会立即刷新'], timestamp: Date.now() });

console.log('\n等待1.5秒,看定时器是否会刷新缓冲区...\n');

setTimeout(() => {
  console.log('\n场景2: 禁用缓冲,不设置 flushCallback');
  const bufferedLogger2 = new BufferedLogger({
    enableBuffer: false
  });
  
  bufferedLogger2.addLog({ level: 'info', name: 'test', args: ['日志4: 禁用缓冲,立即输出'], timestamp: Date.now() });
  bufferedLogger2.addLog({ level: 'warning', name: 'test', args: ['日志5: 禁用缓冲,立即输出'], timestamp: Date.now() });
  
  console.log('\n场景3: 手动刷新缓冲区');
  const bufferedLogger3 = new BufferedLogger({
    enableBuffer: true,
    maxBufferSize: 10
  });
  
  bufferedLogger3.addLog({ level: 'info', name: 'test', args: ['日志6: 等待手动刷新'], timestamp: Date.now() });
  bufferedLogger3.addLog({ level: 'debug', name: 'test', args: ['日志7: 等待手动刷新'], timestamp: Date.now() });
  
  console.log('调用 flush()...');
  bufferedLogger3.flush().then(() => {
    console.log('flush() 完成\n');
    
    console.log('测试完成');
    bufferedLogger1.stop();
    bufferedLogger2.stop();
    bufferedLogger3.stop();
    process.exit(0);
  });
}, 1500);
