# FM-004: Validate config at startup, so the app refuses to start with a bad `.env`

**Type:** Task    **Phase:** 0 (Foundations)    **Estimate:** S

## Summary
Read and check every environment variable in one place when the app starts. If one is missing or malformed, the app stops immediately with a clear message that names the variable. The rest of the code reads config from a typed `ConfigService` instead of `process.env`.

## Background / Why
Right now the app reads `process.env.DATABASE_URL` directly, with no checks. In FM-003 we saw what goes wrong: the e2e test ran without `.env`, `DATABASE_URL` was empty, and the failure was a confusing `SASL: client password must be a string` from deep inside the Postgres driver. Nothing said "`DATABASE_URL` is missing".

Problems with reading `process.env` directly:
- **Late, confusing errors.** A missing or mistyped variable fails far from the cause, sometimes only on the first request in production.
- **No types.** Every value is `string | undefined`, so `PORT` is a string and a typo like `process.env.DATABSE_URL` compiles fine.
- **`.env` loading is duplicated.** `main.ts` and `vitest.config.e2e.ts` each have their own `loadEnvFile()` block, and the worker (FM-008) would need a third.

This ticket fixes all three. The PRD (section on environments) requires every variable to be listed in `.env.example`, and this makes the app enforce it.

## Scope (what to do)
1. **Install `zod`** (explained and approved before installing). It's a library for describing the shape of data and checking it. The PRD already uses it to validate AI output, so it's not a new tool for the project.
2. **Create `src/config/env.ts`** with:
   - A Zod schema for every variable:
     | Variable | Rule | Default |
     | --- | --- | --- |
     | `NODE_ENV` | One of `development`, `test`, `production` | `development` |
     | `PORT` | Whole number from 1 to 65535 (converted from the string) | `3000` |
     | `DATABASE_URL` | Required, a URL starting with `postgresql://` or `postgres://` | none |
     | `REDIS_URL` | Required, a URL starting with `redis://` | none |
   - `parseEnv(raw)`: a pure function that checks an object against the schema and returns the typed result. If anything is wrong, it throws **one** error listing **every** problem, for example `Invalid environment: DATABASE_URL is required; PORT must be a number`.
   - `Env`: the TypeScript type inferred from the schema, so the types and the rules can't drift apart.
3. **Create `src/config/config.service.ts` and `config.module.ts`:**
   - `ConfigService` loads `.env` if the file exists (moving the `try { process.loadEnvFile() }` block here), calls `parseEnv(process.env)`, and exposes the result as `readonly env: Env`.
   - `ConfigModule` is global, like `PrismaModule`, and is imported in `AppModule`.
4. **Use it:**
   - `PrismaService` injects `ConfigService` and reads `config.env.DATABASE_URL`.
   - `main.ts` reads `PORT` from `ConfigService` (via `app.get(ConfigService)`), and its `loadEnvFile()` block is removed.
   - The `loadEnvFile()` block in `vitest.config.e2e.ts` is removed, because the app now loads `.env` itself.
   - After this, nothing in `src/` outside `src/config/` reads `process.env`.
5. **Unit tests** in `src/config/env.spec.ts` for `parseEnv`:
   - a valid object returns typed values (`PORT` is the number `3000`, not `"3000"`)
   - defaults are filled in when `NODE_ENV` and `PORT` are missing
   - a missing `DATABASE_URL` throws, and the message names it
   - two bad variables produce one error that names both
6. **Update `.env.example`** to list `NODE_ENV` and `PORT` with their defaults, so it lists every variable.

## Acceptance criteria
- [x] With a correct `.env`, `npm run start:dev` starts as before.
- [x] Deleting `DATABASE_URL` from `.env` makes the app stop at startup with a message naming `DATABASE_URL`.
- [x] Setting `PORT=abc` makes the app stop with a message naming `PORT`.
- [x] Error messages name variables but never print their values (they can contain passwords).
- [x] No file in `src/` outside `src/config/` reads `process.env`.
- [x] `vitest.config.e2e.ts` no longer loads `.env` itself, and `npm run test:e2e` still passes.
- [x] `npm run lint`, `npm run build`, `npm test` and `npm run test:e2e` pass, including the new `env.spec.ts`.
- [x] `.env.example` lists all four variables.

## Technical notes
- **Fail fast:** the cheapest moment to find a config mistake is the first second of startup, before the app takes any traffic. In production (Railway), a crash at startup means the old version keeps running and the deploy is marked failed, which is what we want.
- **Why a pure `parseEnv(raw)`:** it takes an object and returns an object, with no file reading. That makes it easy to unit test with fake inputs, without touching your real `.env`. The service is the thin part that does the I/O.
- **`z.coerce.number()`:** environment variables are always strings. Coercion turns `"3000"` into `3000` before checking it's a valid port.
- **`z.infer<typeof schema>`:** produces the `Env` type from the schema. Change a rule once and the type follows.
- **Why our own small module, not `@nestjs/config`:** the official package reads values with `config.get('DATABASE_URL')`, which is stringly typed and easy to typo. With Zod we get one schema, a real type and readable errors, in about 30 lines and with no new Nest package. We can switch later if needed.
- **Never log secrets:** Zod error messages include the variable *path*. Build the message from the paths and rule descriptions only, never the received values.
- **Prisma's CLI is unaffected:** `prisma migrate` and friends still load `.env` through `prisma.config.ts`. This ticket only changes the running app.

## Out of scope
- Using `REDIS_URL` (BullMQ comes in FM-008). It's validated now so a deploy can't go out without it.
- Variables for later features (the Anthropic API key, JWT secrets). Each feature adds its own variables to the schema when it needs them.
- Secrets management in production (Railway settings, a later deploy ticket).

## How to test
```bash
npm test                      # includes the new env.spec.ts
npm run start:dev             # starts normally with your .env

# Break it on purpose, one at a time (restore .env after each):
#   - comment out DATABASE_URL  → app stops, message names DATABASE_URL
#   - set PORT=abc              → app stops, message names PORT

grep -rn "process.env" src/ --include=*.ts | grep -v "src/config/" | grep -v "src/generated/"   # prints nothing
npm run lint && npm run build && npm run test:e2e
```
