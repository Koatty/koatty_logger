/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2021-11-04 20:31:43
 * @LastEditTime: 2025-04-23 14:34:05
 */
import * as helper from "koatty_lib";


export interface ShieldFieldRes {
  res: string;
  start: string;
  end: string;
}
/**
 * ShieldField
 *
 * @export
 * @param {string} str
 * @returns {*}  {ShieldFieldRes}
 */
export function ShieldField(str: string): ShieldFieldRes {
  const l = str.length;
  let start, end, res;
  if (l < 4) {
    // 规则1：小于4个字符时，完全替换为*
    start = "*";
    end = "";
    res = "*".repeat(l);
  } else if (l === 4) {
    // 规则2：4个字符时，替换为 A**B
    start = str.charAt(0);
    end = str.charAt(3);
    res = `${start}**${end}`;
  } else {
    // 规则3：大于4个字符时，替换为 AB*CD，*的个数根据字符串长度决定
    start = str.substring(0, 2);
    end = str.substring(l - 2);
    const starCount = l - 4; // 总长度减去保留的4个字符
    res = `${start}${"*".repeat(starCount)}${end}`;
  }
  return { res, start, end }
}

/**
 * 处理值的内部函数
 * @param value 需要处理的值
 * @param sensFields 敏感字段集合
 * @param cache 缓存对象
 * @returns 处理后的值
 */
function processValue(value: any, sensFields: Set<string>, cache: WeakMap<any, any>): any {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => processValue(item, sensFields, cache));
  }

  if (typeof value === 'object') {
    if (cache.has(value)) {
      return cache.get(value);
    }

    const result: { [key: string]: any } = Array.isArray(value) ? [] : {};
    cache.set(value, result);

    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        if (sensFields.has(key)) {
          if (typeof value[key] === 'string') {
            result[key] = ShieldField(value[key]).res;
          } else {
            result[key] = processValue(value[key], sensFields, cache);
          }
        } else {
          result[key] = processValue(value[key], sensFields, cache);
        }
      }
    }

    return result;
  }

  return value;
}

/**
 * ShieldLog - 使用迭代方式处理敏感信息
 *
 * @export
 * @param {*} splat - 需要处理的数据
 * @param {Set<string>} fields - 敏感字段集合
 * @param {string} [keyName] - 当前字段名
 * @returns {*} 处理后的数据
 */
export function ShieldLog(data: any, sensFields: Set<string>): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const cache = new WeakMap();
  return processValue(data, sensFields, cache);
}

/**
 * ShieldLogJSON - 使用JSON.stringify的replacer参数进行一次性处理
 * 这是一个替代方案，适用于不需要保留对象原型的情况
 *
 * @export
 * @param {*} splat - 需要处理的数据
 * @param {Set<string>} fields - 敏感字段集合
 * @returns {*} 处理后的数据
 */
export function ShieldLogJSON(splat: any, fields: Set<string>): any {
  // 如果没有敏感字段，直接返回原始数据
  if (fields.size === 0) {
    return splat;
  }

  // 处理空值
  if (!splat) return splat;

  // 处理错误对象
  if (helper.isError(splat)) {
    return splat.message;
  }

  // 使用JSON.stringify的replacer参数进行一次性处理
  const replacer = (key: string, value: any) => {
    // 检查是否是敏感字段
    if (fields.has(key)) {
      return ShieldField(String(value)).res;
    }
    return value;
  };

  // 将对象转换为JSON字符串，然后解析回对象
  const jsonString = JSON.stringify(splat, replacer);
  return JSON.parse(jsonString);
}