/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2021-11-04 20:31:43
 * @LastEditTime: 2023-01-08 14:50:16
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
  const strArr = Object.assign([], str);
  const l = strArr.length;
  let start, end, res;
  if (l <= 1) {
    start = "*";
    end = "";
    res = "*";
  } else if (l == 2) {
    start = strArr.slice(1).join("");
    end = "*";
    res = `${start}${end}`;
  } else {
    let num = Math.floor(l / 3);
    const mo = Math.floor(l % 3);
    let startNum = num;
    if (mo > 0) {
      num = num + 1;
    }
    if (startNum > 4) {
      num = num + (startNum - 4);
      startNum = 4;
    }
    const endNum = l - num - startNum;
    if (endNum > 4) {
      num = num + (endNum - 4);
      // endNum = 4;
    }
    // console.log(startNum, num, endNum)
    start = strArr.slice(0, startNum).join("");
    end = strArr.slice(num + startNum).join("");
    res = `${start}${"*".repeat(num)}${end}`;
  }
  return { res, start, end }
}

/**
 * ShieldLog
 *
 * @export
 * @param {*} splat
 * @param {Set<string>} fields
 * @param {string} [keyName]
 * @param {number} [depth=0] 递归深度
 * @param {number} [maxDepth=10] 最大递归深度
 * @returns {*}  {*}
 */
export function ShieldLog(splat: any, fields: Set<string>, keyName?: string, depth: number = 0, maxDepth: number = 10): any {
  if (fields.size === 0) {
    return splat;
  }
  if (!splat) return splat;

  // 防止过深递归
  if (depth > maxDepth) {
    return '[Object: too deep]';
  }

  if (Array.isArray(splat)) {
    // 使用map代替for循环，更简洁高效
    return splat.map(item => ShieldLog(item, fields, undefined, depth + 1, maxDepth));
  }

  if (helper.isError(splat)) {
    return splat.message;
  }
  if (typeof splat !== "object") {
    if (fields.has(keyName || "")) {
      return ShieldField(splat).res;
    }
    return `${splat}`;
  }

  // 优化对象克隆：使用Object.create保持原型链，避免constructor调用
  const cloneSplat = Object.create(Object.getPrototypeOf(splat));

  // 使用Object.keys代替for...in，避免原型链属性
  for (const key of Object.keys(splat)) {
    // 递归拷贝
    cloneSplat[key] = ShieldLog(splat[key], fields, key, depth + 1, maxDepth);
  }

  return cloneSplat;
}