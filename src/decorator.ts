/*
 * @Description: Log property decorator integrated with koatty-container
 * @Usage: Use registerLogDecorator(decoratorManager.property) then @Log() or @Log(options)
 * @Author: richen
 * @Date: 2025-02-03
 */
import { Logger, LoggerOpt, getDefaultLogger } from "./logger";

/**
 * Minimal interface for property decorator manager (avoids depending on koatty_container).
 * Pass decoratorManager.property from koatty_container when calling registerLogDecorator.
 */
export interface IPropertyDecoratorManagerLike {
  registerWrapper(
    decoratorType: string,
    wrapperFunction: (
      originalDescriptor: PropertyDescriptor | undefined,
      config: any,
      propertyName: string,
      target: any
    ) => PropertyDescriptor
  ): void;
  registerDecorator(
    target: any,
    propertyKey: string | symbol,
    metadata: { wrapperTypes: string[]; config?: any },
    originalDescriptor?: PropertyDescriptor
  ): PropertyDescriptor;
}

const LOG_DECORATOR_TYPE = "Log";

/** Cache for custom Logger instances: (constructor, propertyName) -> Logger */
const customLoggerCache = new WeakMap<object, Map<string, Logger>>();

function getOrCreateCustomLogger(ctor: object, propertyName: string, config: LoggerOpt): Logger {
  let map = customLoggerCache.get(ctor);
  if (!map) {
    map = new Map<string, Logger>();
    customLoggerCache.set(ctor, map);
  }
  let logger = map.get(propertyName);
  if (!logger) {
    const opt: LoggerOpt = { ...config };
    if (opt.sensFields && Array.isArray(opt.sensFields)) {
      opt.sensFields = new Set(opt.sensFields as unknown as string[]);
    }
    logger = new Logger(opt);
    map.set(propertyName, logger);
  }
  return logger;
}

/**
 * Property wrapper for "Log" decorator type.
 * - config undefined/empty: return DefaultLogger
 * - config provided: return a Logger instance per (class, property), cached
 */
function logPropertyWrapper(
  _originalDescriptor: PropertyDescriptor | undefined,
  config: LoggerOpt | undefined,
  propertyName: string,
  target: any
): PropertyDescriptor {
  const key = String(propertyName);
  const privateKey = `_log_${key}`;
  return {
    get(this: any): Logger {
      if ((this as any)[privateKey] !== undefined) {
        return (this as any)[privateKey];
      }
      if (!config || (typeof config === "object" && Object.keys(config).length === 0)) {
        return getDefaultLogger();
      }
      const ctor = this?.constructor ?? target?.constructor;
      if (!ctor) {
        return new Logger(config);
      }
      return getOrCreateCustomLogger(ctor, key, config);
    },
    set(this: any, value: any) {
      (this as any)[privateKey] = value;
    },
    enumerable: true,
    configurable: true
  };
}

let storedPropertyManager: IPropertyDecoratorManagerLike | null = null;

/**
 * Register the "Log" decorator with koatty-container's property manager.
 * Call once at app startup, e.g. registerLogDecorator(decoratorManager.property).
 *
 * @param propertyManager - PropertyDecoratorManager from decoratorManager.property
 */
export function registerLogDecorator(propertyManager: IPropertyDecoratorManagerLike): void {
  if (!propertyManager || typeof propertyManager.registerWrapper !== "function") {
    return;
  }
  try {
    propertyManager.registerWrapper(LOG_DECORATOR_TYPE, logPropertyWrapper);
    storedPropertyManager = propertyManager;
  } catch {
    // Avoid breaking app if container API differs
  }
}

/**
 * Unregister the stored property manager (e.g. for tests).
 */
export function unregisterLogDecorator(): void {
  storedPropertyManager = null;
}

/**
 * Property decorator: inject a logger instance.
 * - @Log() uses the global DefaultLogger.
 * - @Log(options) uses a dedicated Logger instance with the given options (cached per class+property).
 *
 * Requires registerLogDecorator(decoratorManager.property) to be called first;
 * otherwise the decorator is a no-op so existing code is not broken.
 *
 * @param options - Optional LoggerOpt for a custom Logger instance
 * @example
 * ```ts
 * registerLogDecorator(decoratorManager.property);
 *
 * class UserController {
 *   \@Log()
 *   logger: any;
 *
 *   \@Log({ logLevel: 'debug' })
 *   debugLogger: any;
 * }
 * ```
 */
export function Log(options?: LoggerOpt): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void | PropertyDescriptor => {
    const pm = storedPropertyManager;
    if (!pm || typeof pm.registerDecorator !== "function") {
      return;
    }
    try {
      return pm.registerDecorator(target, propertyKey, {
        wrapperTypes: [LOG_DECORATOR_TYPE],
        config: options
      });
    } catch {
      return;
    }
  };
}
