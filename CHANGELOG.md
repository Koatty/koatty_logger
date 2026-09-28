# Changelog

## 3.1.0

### Minor Changes

- Phase B 收口：fail-closed 兜底、缺失实现与验收门回归测试（koatty-hardening-and-ai-evolution-plan.md，ADR-101/102）。
  - `koatty_core`：新增 `src/security` barrel（`export * from "./security"`），`app.security` / `SecurityProfile` 与 ADR-102 的模块路径一致；此前只能从深层路径导入。
  - `koatty_router`：GraphQL introspection 改为 fail-closed —— 没有 `security.graphql` profile 时不再默认开启 introspection（此前落到 `true`），显式 `ext.introspection` / profile 仍可开启；新增 `introspectionEnabled` 可观测字段。
  - `koatty_serve`：WebSocket `maxPayload` 兜底从 `0`（ws@8 语义 = 无上限）改为 1MiB，无 profile 时也是 fail-closed；补充 SEC-12 回归测试（`minVersion` 解析 + 连接池不再给 TLSv1.0/1.1 任何协议分）。
  - `koatty_logger`：内置默认敏感字段（password/passwd/secret/token/accessToken/refreshToken/authorization/cookie/apiKey/api_key），默认脱敏；`LoggerOpt.sensFields` 与 `setSensFields()` 改为追加，`clearSensFields()` / `resetSensFields()` 可显式清空。
  - `koatty_store`：COR-09 回归测试锁定 Redis 默认端口为 6379（不是 MySQL 的 3306）。
  - `koatty_cli`：SEC-10 CLI 沙箱修补 —— `config/server.ts` 的 protocol 补丁不再在 dry-run 阶段写入，且写入前经 `resolveInside(process.cwd(), ...)` 校验，dry-run 只打印预览。

## 3.0.0

### Patch Changes

- Updated dependencies
  - koatty_lib@1.6.0

## 2.9.0

### Minor Changes

- build
- build

### Patch Changes

- Updated dependencies
- Updated dependencies
  - koatty_lib@1.5.0

## 2.8.5

### Patch Changes

- build
- Phase 1: Critical bug fixes
  - **koatty-container**: Replace global.**KOATTY_IOC** with Symbol.for to prevent global namespace pollution (TASK-1-7)
  - **koatty-logger**: Fix incorrect log level mapping - warning should map to warn, not error (TASK-1-5)
  - **koatty-typeorm**: Remove hardcoded database credentials security vulnerability (TASK-1-3)
  - **koatty-typeorm**: Fix incorrect TypeORM event name 'Stop' -> 'beforeServerStop' (TASK-1-4)

- Updated dependencies
  - koatty_lib@1.4.9

## 2.8.4

### Patch Changes

- Updated dependencies
  - koatty_lib@1.4.8

## 2.8.3

### Patch Changes

- build
- Updated dependencies
  - koatty_lib@1.4.7

## 2.8.2

### Patch Changes

- build

## 2.4.2

### Patch Changes

- patch version bump for koatty, koatty_cacheable, koatty_config, koatty_container, koatty_core, koatty_exception, koatty_graphql, koatty_lib, koatty_loader, koatty_logger, koatty_proto, koatty_router, koatty_schedule, koatty_serve, koatty_store, koatty_trace, koatty_typeorm, koatty_validation
- Updated dependencies
  - koatty_lib@1.4.6

## 2.4.1

### Patch Changes

- build

## 2.4.0

### Minor Changes

- build

## 2.3.4

### Patch Changes

- build
- Updated dependencies
  - koatty_lib@1.4.5

## 2.3.3

### Patch Changes

- build
- Updated dependencies
  - koatty_lib@1.4.4

## 2.3.2

### Patch Changes

- build
- Updated dependencies
  - koatty_lib@1.4.3

## 2.3.1

### Patch Changes

- Updated dependencies
  - koatty_lib@1.4.2

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.3.0](https://github.com/koatty/koatty_logger/compare/v2.1.8...v2.3.0) (2025-06-02)

### Features

- batch logging support ([b15cb49](https://github.com/koatty/koatty_logger/commit/b15cb49e7a14133edfce623b2ce9b6b3b02cee66))
- enhance logger with batch processing and path validation ([fba457d](https://github.com/koatty/koatty_logger/commit/fba457d50f69be736d8eff1cd4b3dae40bf55133))

## [2.2.0](https://github.com/koatty/koatty_logger/compare/v2.1.8...v2.2.0) (2025-06-02)

### Features

- batch logging support ([b15cb49](https://github.com/koatty/koatty_logger/commit/b15cb49e7a14133edfce623b2ce9b6b3b02cee66))
- enhance logger with batch processing and path validation ([fba457d](https://github.com/koatty/koatty_logger/commit/fba457d50f69be736d8eff1cd4b3dae40bf55133))

### [2.1.8](https://github.com/koatty/koatty_logger/compare/v2.1.6...v2.1.8) (2024-11-05)

### [2.1.6](https://github.com/koatty/koatty_logger/compare/v2.1.4...v2.1.6) (2024-10-31)

### Bug Fixes

- error ([387bb84](https://github.com/koatty/koatty_logger/commit/387bb84653d085a3dfdbd728fc232a56e9f0a395))

### [2.1.4](https://github.com/koatty/koatty_logger/compare/v2.1.2...v2.1.4) (2023-12-11)

### [2.1.2](https://github.com/koatty/koatty_logger/compare/v2.1.1...v2.1.2) (2023-08-30)

### Bug Fixes

- 暂时屏蔽 stack ([b18788f](https://github.com/koatty/koatty_logger/commit/b18788f5fdbbf5019dee372c104b2c4b858862f2))

### [2.1.1](https://github.com/koatty/koatty_logger/compare/v2.1.0...v2.1.1) (2023-07-22)

## [2.1.0](https://github.com/koatty/koatty_logger/compare/v2.0.4...v2.1.0) (2023-02-21)

### Features

- add lowercase method ([286043d](https://github.com/koatty/koatty_logger/commit/286043d340d694383f19b7bb5770fd44e3046c67))

### [2.0.4](https://github.com/koatty/koatty_logger/compare/v2.0.2...v2.0.4) (2023-01-13)

### Bug Fixes

- remove default value ([041b29d](https://github.com/koatty/koatty_logger/commit/041b29d1aabd219e4f01a84eca942dc734545f70))

### [2.0.2](https://github.com/koatty/koatty_logger/compare/v2.0.0...v2.0.2) (2023-01-09)

## [2.0.0](https://github.com/koatty/koatty_logger/compare/v1.3.16...v2.0.0) (2023-01-09)

### Bug Fixes

- peerDependencies ([253f017](https://github.com/koatty/koatty_logger/commit/253f0172cd2116a56174175f3a50209fdd905c65))
- 日志接口 ([d29af82](https://github.com/koatty/koatty_logger/commit/d29af8297b49a81cf6b38f4ad9f036d4a8b0d7f7))

### [1.3.16](https://github.com/koatty/koatty_logger/compare/v1.3.15...v1.3.16) (2023-01-07)

### Bug Fixes

- 按小时分割 ([7f00b7d](https://github.com/koatty/koatty_logger/commit/7f00b7d0f56bd0321dbe2a400971827492e67223))

### [1.3.15](https://github.com/koatty/koatty_logger/compare/v1.3.14...v1.3.15) (2022-09-09)

### Bug Fixes

- add level ([bf2b6e0](https://github.com/koatty/koatty_logger/commit/bf2b6e00f33b1ebc65d373d9da045bafdb2339cb))
- upgrade deps ([3608313](https://github.com/koatty/koatty_logger/commit/3608313a6f3d5cbdb3b00da8a8b84ef3443a45f4))

### [1.3.14](https://github.com/koatty/koatty_logger/compare/v1.3.12...v1.3.14) (2022-05-26)

### [1.3.12](https://github.com/koatty/koatty_logger/compare/v1.3.10...v1.3.12) (2021-12-21)

### [1.3.10](https://github.com/koatty/koatty_logger/compare/v1.3.8...v1.3.10) (2021-12-21)

### [1.3.8](https://github.com/koatty/koatty_logger/compare/v1.3.6...v1.3.8) (2021-12-21)

### [1.3.6](https://github.com/koatty/koatty_logger/compare/v1.3.5...v1.3.6) (2021-12-20)

### [1.3.5](https://github.com/koatty/koatty_logger/compare/v1.3.4...v1.3.5) (2021-12-20)

### [1.3.4](https://github.com/koatty/koatty_logger/compare/v1.3.2...v1.3.4) (2021-12-18)

### [1.3.2](https://github.com/koatty/koatty_logger/compare/v1.3.0...v1.3.2) (2021-12-18)

## [1.3.0](https://github.com/koatty/koatty_logger/compare/v1.2.12...v1.3.0) (2021-12-18)
