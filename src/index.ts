/*
 * @Author: richen
 * @Date: 2020-11-20 17:40:48
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2021-06-22 10:26:38
 * @License: BSD (3-Clause)
 * @Copyright (c) - <richenlin(at)gmail.com>
 */
import fs from "fs";
import util from "util";
import * as helper from "koatty_lib";

const fsOpen = util.promisify(fs.open);
const fsAppend = util.promisify(fs.appendFile);
const fsClose = util.promisify(fs.close);

const styles: any = {
    'bold': ['\x1B[1m', '\x1B[22m'],
    'italic': ['\x1B[3m', '\x1B[23m'],
    'underline': ['\x1B[4m', '\x1B[24m'],
    'inverse': ['\x1B[7m', '\x1B[27m'],

    'white': ['\x1B[37m', '\x1B[39m'],
    'grey': ['\x1B[90m', '\x1B[39m'],
    'black': ['\x1B[30m', '\x1B[39m'],
    'blue': ['\x1B[34m', '\x1B[39m'],
    'cyan': ['\x1B[36m', '\x1B[39m'],
    'green': ['\x1B[32m', '\x1B[39m'],
    'magenta': ['\x1B[35m', '\x1B[39m'],
    'red': ['\x1B[31m', '\x1B[39m'],
    'yellow': ['\x1B[33m', '\x1B[39m'],

    'whiteBG': ['\x1B[47m', '\x1B[49m'],
    'greyBG': ['\x1B[49;5;8m', '\x1B[49m'],
    'blackBG': ['\x1B[40m', '\x1B[49m'],
    'blueBG': ['\x1B[44m', '\x1B[49m'],
    'cyanBG': ['\x1B[46m', '\x1B[49m'],
    'greenBG': ['\x1B[42m', '\x1B[49m'],
    'magentaBG': ['\x1B[45m', '\x1B[49m'],
    'redBG': ['\x1B[41m', '\x1B[49m'],
    'yellowBG': ['\x1B[43m', '\x1B[49m']
};
// console.log('\x1B[47m\x1B[30m%s\x1B[39m\x1B[49m', 'hello') //白底黑色字
// 日志级别
export type LogLevelType = "DEBUG" | "INFO" | "WARN" | "ERROR";
const LogLevelObj: any = {
    "DEBUG": 0,
    "INFO": 1,
    "WARN": 2,
    "ERROR": 3
};

interface LoggerOpt {
    logLevel?: LogLevelType;
    logConsole?: boolean;
    logFile?: boolean;
    logFileLevel?: LogLevelType;
    logFilePath?: string;
}

/**
 * Logger
 *
 * @class Logger
 */
export class Logger {
    // 控制台日志级别
    private logLevel = "INFO";
    // 默认打开控制台日志
    private logConsole = true;
    // 空对象
    private emptyObj: any = {};
    // 文件日志开关
    private logFile = false;
    // 文件日志级别
    private logFileLevel = "WARN";
    // 文件日志路径
    private logFilePath: string;

    /**
     * Creates an instance of Logger.
     * @param {LoggerOpt} [opt]
     * @memberof Logger
     */
    constructor(opt ?: LoggerOpt) {
        if (process.env.LOGS_LEVEL && LogLevelObj[process.env.LOGS_LEVEL]) {
            this.logLevel = process.env.LOGS_LEVEL;
            this.logFileLevel = process.env.LOGS_LEVEL;
        }
        if (process.env.NODE_ENV === 'production') {
            this.logConsole = false;
            this.logFile = true;
            this.logFileLevel = "INFO";
        }
        if (process.env.LOGS_WRITE) {
            this.logFile = !!process.env.LOGS_WRITE;
        }
        if (process.env.LOGS_PATH) {
            this.logFilePath = process.env.LOGS_PATH;
        }
        if (!helper.isTrueEmpty(opt)) {
            this.logLevel = opt.logLevel ?? this.logLevel;
            this.logConsole = opt.logConsole ?? this.logConsole;
            this.logFile = opt.logFile ?? this.logFile;
            this.logFileLevel = opt.logFileLevel ?? this.logFileLevel;
            this.logFilePath = opt.logFilePath ?? this.logFilePath;
        }
    }

    /**
     * getLevel
     */
     public getLevel() {
        return this.logLevel;
    }
    
    /**
     * setLevel
     */
     public setLevel(level: LogLevelType) {
        this.logLevel = level;
    }

    /**
     * getLogConsole
     */
     public getLogConsole() {
        return this.logConsole;
    }

    /**
     * setLogConsole
     */
    public setLogConsole(t: boolean) {
        this.logConsole = t;
    }

    /**
     * getLogFile
     */
     public getLogFile() {
        return this.logFile;
    }

    /**
     * setLogFile
     */
    public setLogFile(t: boolean) {
        this.logFile = t;
    }

    /**
     * getLogFileLevel
     */
     public getLogFileLevel() {
        return this.logFileLevel;
    }

    /**
     * setLogFileLevel
     */
    public setLogFileLevel(level: LogLevelType) {
        this.logFileLevel = level;
    }

    /**
     * getLogFilePath
     */
     public getLogFilePath() {
        return this.logFilePath;
    }

    /**
     * setLogPath
     */
    public setLogFilePath(path: string) {
        this.logFilePath = path;
    }

    /**
     * 格式化
     *
     * @private
     * @param {LogLevelType} level
     * @param {string} name
     * @param {any[]} args
     * @returns {any[]} 
     * @memberof Logger
     */
    private format(level: LogLevelType, name: string, args: any[]) {
        try {
            // tslint:disable-next-line: one-variable-per-declaration
            let params: any[] = [];
            args.forEach((item: any) => {
                if (helper.isError(item)) {
                    if (item.stack) {
                        params.push(item.stack);
                    } else {
                        params.push(item);
                    }
                } else if (helper.isArray(item)) {
                    params = [...params, ...item];
                } else if (helper.isObject(item)) {
                    params.push(JSON.stringify(item));
                } else {
                    params.push(item);
                }
            });

            params = [`[${helper.dateTime('', '')}]`, `[${name !== '' ? name.toUpperCase() : level}]`, ...params];
            if (level === "DEBUG") {
                Error.captureStackTrace(this.emptyObj);
                const matchResult = (this.emptyObj.stack).match(/\(.*?\)/g) || [];
                params.push(matchResult[3] || "");
            }

            return params;
        } catch (e) {
            // console.error(e.stack);
            return [];
        }
    }

    /**
     * print console
     *
     * @private
     * @param {LogLevelType} level
     * @param {string} name
     * @param {string} color
     * @param {any[]} args
     * @memberof Logger
     */
    private print(level: LogLevelType, name: string, color: string, args: any[]) {
        try {
            const logLevel = this.getLevel();
            if (LogLevelObj[level] < LogLevelObj[logLevel]) {
                return
            }
            let formatted = false;
            // print console
            if (this.getLogConsole()) {
                args = this.format(level, name, args);
                formatted = true;
                color = color || 'grey';
                const style = styles[color] || styles.grey;
                console.log.apply(null, [style[0], ...args, style[1]]);
            }
            // record log files
            if (this.getLogFile()) {
                this.writeLogFile(level, name, args, formatted);
            }
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * write log file
     *
     * @private
     * @param {LogLevelType} level
     * @param {string} name
     * @param {any[]} msgs
     * @param {boolean} [formatted=false]
     * @returns {*}  {Promise<any>}
     * @memberof Logger
     */
    private async writeLogFile(level: LogLevelType, name: string, msgs: any[], formatted = false): Promise<any> {
        try {
            const logFilePath = this.getLogFilePath();
            if (!helper.isDir(logFilePath)) {
                await helper.mkDir(logFilePath);
            }
            let params = msgs;
            if (!formatted) {
                params = this.format(level, name, msgs);
            }
            name = name !== "" ? name : level;
            const file = `${logFilePath}${helper.sep}${name ? `${name}_` : ''}${helper.dateTime('', 'YYYY-MM-DD')}.log`;
            const fd = await fsOpen(file, 'a');
            // tslint:disable-next-line: no-null-keyword
            await fsAppend(fd, `${util.format.apply(null, params)}\n`, 'utf8');
            await fsClose(fd);
            // tslint:disable-next-line: no-null-keyword
            return null;
        } catch (err) {
            console.error(err);
            // tslint:disable-next-line: no-null-keyword
            return null;
        }
    }

    /**
     * log Debug
     *
     * @returns {*} 
     * @memberof Logger
     */
    public Debug(...args: any[]) {
        return this.print("DEBUG", "", "blue", args);
    }

    /**
     * log Info
     *
     * @returns {*} 
     * @memberof Logger
     */
    public Info(...args: any[]) {
        return this.print("INFO", "", "white", args);
    }

    /**
     * log Warn
     *
     * @returns {*} 
     * @memberof Logger
     */
    public Warn(...args: any[]) {
        return this.print("WARN", "", "yellow", args);
    }

    /**
     * log Success
     *
     * @returns {*} 
     * @memberof Logger
     */
    public Success(...args: any[]) {
        return this.print("INFO", "", "green", args);
    }

    /**
     * log Error
     * 
     * @returns {*} 
     * @memberof Logger
     */
    public Error(...args: any[]) {
        return this.print("ERROR", "", "red", args);
    }

    /**
     * log Custom
     * 
     * Logger.Custom('msg')
     * 
     * Logger.Custom('name', 'msg')
     * 
     * Logger.Custom('name', 'color', 'msg')
     * 
     * Logger.Custom('name', 'color', 'msg1', 'msg2'...)
     *
     * @param {...any[]} args
     * @returns {*} 
     * @memberof Logger
     */
    public Custom(...args: any[]) {
        // tslint:disable-next-line: one-variable-per-declaration
        let name = "", color = "white", msgs = [];
        if (args.length > 2) {
            name = args[0];
            color = args[1];
            msgs = args.slice(2);
        } else if (args.length === 2) {
            name = args[0];
            msgs = args.slice(1);
        } else {
            msgs = args;
        }
        return this.print("INFO", name, color, msgs);
    }

    /**
     * write log file
     *
     * @param {...any[]} args
     * @returns {*} 
     * @memberof Logger
     */
    public Write(...args: any[]) {
        // tslint:disable-next-line: one-variable-per-declaration
        let name = "", msgs = [];
        if (args.length >= 2) {
            name = args[0];
            msgs = args.slice(1);
        } else {
            msgs = args;
        }
        return this.writeLogFile("INFO", name, msgs);
    }
}
/**
 * DefaultLogger
 */
export const DefaultLogger = new Logger();