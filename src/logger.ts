/*
 * @Author: richen
 * @Date: 2020-11-20 17:40:48
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2021-12-21 11:40:42
 * @License: BSD (3-Clause)
 * @Copyright (c) - <richenlin(at)gmail.com>
 */
import fs from "fs";
import util, { promisify } from "util";
import * as helper from "koatty_lib";
import { ShieldLog } from "./shield";
import { ILogger } from "./index";

const fsOpen = promisify(fs.open);
const fsAppend = promisify(fs.appendFile);
const fsClose = promisify(fs.close);


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
    sensFields?: Set<string>;
}

/**
 * Logger
 *
 * @class Logger
 */
export class Logger implements ILogger {
    // 控制台日志级别
    private logLevel: LogLevelType = "INFO";
    // 默认打开控制台日志
    private logConsole = true;
    // 空对象
    private emptyObj: any = {};
    // 文件日志开关
    private logFile = false;
    // 文件日志级别
    private logFileLevel: LogLevelType = "WARN";
    // 文件日志路径
    private logFilePath = "./logs";
    // 脱敏字段
    private sensFields: Set<string> = new Set();

    /**
     * Creates an instance of Logger.
     * @param {LoggerOpt} [opt]
     * @memberof Logger
     */
    constructor(opt?: LoggerOpt) {
        if (process.env.LOGS_LEVEL && LogLevelObj[process.env.LOGS_LEVEL]) {
            this.logLevel = <LogLevelType>process.env.LOGS_LEVEL;
            this.logFileLevel = <LogLevelType>process.env.LOGS_LEVEL;
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
            this.sensFields = opt.sensFields ?? this.sensFields;
        }
    }

    /**
     * getLevel
     */
    public getLevel(): LogLevelType {
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
     * getSensFields
     */
    public getSensFields() {
        return this.sensFields;
    }

    /**
     * setSensFields
     */
    public setSensFields(fields: string[]) {
        this.sensFields = new Set([...this.sensFields, ...fields]);
    }

    /**
     * 格式化
     *
     * @private
     * @param {LogLevelType} level
     * @param {string} name
     * @param {any[]|string} args
     * @returns {string} 
     * @memberof Logger
     */
    private format(level: LogLevelType, name: string, args: any[] | string): string {
        try {
            const params = [`[${helper.dateTime('', '')}]`, `[${name}]`, ...ShieldLog(args, this.sensFields)];
            if (level === "DEBUG") {
                Error.captureStackTrace(this.emptyObj);
                const matchResult = (this.emptyObj.stack).match(/\(.*?\)/g) || [];
                params.push(matchResult[3] || "");
            }

            return util.format.apply(null, params);
        } catch (e) {
            // console.error(e.stack);
            return "";
        }
    }

    /**
     * print console
     *
     * @private
     * @param {LogLevelType} level
     * @param {string} name
     * @param {string} color
     * @param {any[]|string} args
     * @memberof Logger
     */
    private print(level: LogLevelType, name: string, color: string, args: any[] | string) {
        try {
            name = name !== '' ? name.toUpperCase() : level;
            const logLevel = this.getLevel();
            if (LogLevelObj[level] < LogLevelObj[logLevel]) {
                return
            }
            let formatted = false;
            // print console
            if (this.logConsole) {
                args = this.format(level, name, args);
                formatted = true;
                color = color || 'grey';
                const style = styles[color] || styles.grey;

                console.log(`${style[0]}${args}${style[1]}`);
            }
            // record log files
            if (this.logFile) {
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
    private async writeLogFile(level: LogLevelType, name: string, msgs: any[] | string, formatted = false): Promise<any> {
        try {
            name = name !== '' ? name.toUpperCase() : level;
            const logFilePath = this.logFilePath;
            if (!helper.isDir(logFilePath)) {
                await helper.mkDir(logFilePath);
            }
            let params = msgs;
            if (!formatted) {
                params = this.format(level, name, msgs);
            }

            const file = `${logFilePath}${helper.sep}${name ? `${name}_` : ''}${helper.dateTime('', 'YYYY-MM-DD')}.log`;
            const fd = await fsOpen(file, 'a');
            // tslint:disable-next-line: no-null-keyword
            await fsAppend(fd, `${params}\n`, 'utf8');
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
     * log Error
     * 
     * @returns {*} 
     * @memberof Logger
     */
    public Error(...args: any[]) {
        return this.print("ERROR", "", "red", args);
    }

    /**
     * log Log
     * 
     * Logger.Log('msg')
     * 
     * Logger.Log('name', 'msg')
     * 
     * Logger.Log('name', 'color', 'msg')
     * 
     * Logger.Log('name', 'color', 'msg1', 'msg2'...)
     *
     * @param {...any[]} args
     * @returns {*} 
     * @memberof Logger
     */
    public Log(...args: any[]) {
        // tslint:disable-next-line: one-variable-per-declaration
        let name = "", color = "white", msgs = [];
        if (args.length > 2) {
            name = args[0];
            color = args[1] || color;
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
     * alias Log
     */
    public Custom(...args: any[]) {
        return this.Log(args);
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

