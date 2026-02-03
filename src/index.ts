/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2021-12-18 20:03:31
 * @LastEditTime: 2024-10-31 16:32:08
 */
import { Logger, getDefaultLogger } from "./logger";
// export
export * from "./logger";
export * from "./interface";
export * from "./decorator";

//DefaultLogger
export const DefaultLogger: Logger = getDefaultLogger();