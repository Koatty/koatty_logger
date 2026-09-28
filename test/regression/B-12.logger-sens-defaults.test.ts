/**
 * B-12 (SEC-13) regression tests: built-in log redaction fields.
 *
 * `koatty-logger` must ship the common sensitive field names by default
 * (password, passwd, secret, token, accessToken, refreshToken, authorization,
 * cookie, apiKey, api_key); users can append their own fields, and can clear or
 * reset the set explicitly.
 *
 * @ license: BSD (3-Clause)
 */
import { Logger } from "../../src/logger";

const BUILT_IN = [
  "password",
  "passwd",
  "secret",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "apiKey",
  "api_key",
];

describe("B-12: default sensitive fields", () => {
  let logger: Logger;

  afterEach(() => {
    if (logger) {
      logger.destroy();
    }
    logger = undefined as any;
  });

  test("the built-in sensitive fields are active without any configuration", () => {
    logger = new Logger();
    const fields = logger.getSensFields();
    for (const field of BUILT_IN) {
      expect(fields.has(field)).toBe(true);
    }
  });

  test("LoggerOpt.sensFields appends to the built-in set", () => {
    logger = new Logger({ sensFields: new Set(["creditCard"]) });
    const fields = logger.getSensFields();
    expect(fields.has("creditCard")).toBe(true);
    expect(fields.has("password")).toBe(true);
    expect(fields.size).toBe(BUILT_IN.length + 1);
  });

  test("setSensFields is additive and idempotent", () => {
    logger = new Logger();
    logger.setSensFields(["creditCard", "password"]);
    expect(logger.getSensFields().size).toBe(BUILT_IN.length + 1);
    logger.setSensFields(["creditCard"]);
    expect(logger.getSensFields().size).toBe(BUILT_IN.length + 1);
  });

  test("clearSensFields() removes every field (explicit opt-out)", () => {
    logger = new Logger();
    logger.clearSensFields();
    expect(logger.getSensFields().size).toBe(0);
  });

  test("resetSensFields() replaces the whole set", () => {
    logger = new Logger();
    logger.resetSensFields(["onlyThis"]);
    expect(logger.getSensFields().size).toBe(1);
    expect(logger.getSensFields().has("onlyThis")).toBe(true);
    expect(logger.getSensFields().has("password")).toBe(false);
  });

  test("every redacted field name is a non-empty string", () => {
    logger = new Logger();
    for (const field of logger.getSensFields()) {
      expect(typeof field).toBe("string");
      expect(field.length).toBeGreaterThan(0);
    }
  });
});
