import { Logger } from "../src/logger";

// 创建日志记录器实例
const logger = Logger.getInstance({
  logLevel: 'info', // 设置日志级别
  logFilePath: './logs', // 设置日志文件路径
  sensFields: new Set(['password', 'token']) // 设置需要脱敏的字段
});

// 记录不同级别的日志
logger.info('这是一条信息日志');
logger.warn('这是一条警告日志');
logger.error('这是一条错误日志');

// 测试模板缓存功能
console.log('测试模板缓存功能:');
// 记录多条相同级别的日志，验证模板缓存是否生效
for (let i = 0; i < 5; i++) {
  logger.info(`这是第 ${i + 1} 条信息日志，应该使用相同的模板`);
}

// 测试不同类型的消息格式
console.log('测试不同类型的消息格式:');
logger.info('字符串消息');
logger.info({ 对象消息: '这是一个对象' });
logger.info(['数组消息', '这是一个数组']);

// 测试敏感信息处理
console.log('测试敏感信息处理:');
logger.info({
  username: 'testuser',
  password: 'secretpassword123',
  token: 'abc123xyz789'
});
