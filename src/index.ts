/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2021-12-18 20:03:31
 * @LastEditTime: 2023-01-09 10:03:34
 */
import { ILogger } from "./interface";
import { Logger } from "./logger";
// export
export * from "./logger";
export * from "./interface";

//DefaultLogger
export const DefaultLogger: Logger = new Logger();