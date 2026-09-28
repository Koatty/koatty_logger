import { Logger } from '../../src/logger';
test('formatting failures cannot recursively log or disclose raw values', () => {
  const logger=new Logger();
  const recursion=jest.spyOn((logger as any).logger,'error');
  const hostile=new Proxy({}, {ownKeys:()=>{throw new Error('secret-format-value');}});
  try {
    const value=(logger as any).format('error','test','now',[hostile]);
    expect(value).toBe('[Koatty logger: unable to format log entry]');
    expect(value).not.toContain('secret-format-value');expect(recursion).not.toHaveBeenCalled();
  }finally{recursion.mockRestore();logger.destroy();}
});
