type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

function serializeLogValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeLogValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serializeLogValue(entry)])
    );
  }

  return value;
}

function serializeLogContext(context: LogContext) {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, serializeLogValue(value)])
  );
}

function writeLog(level: LogLevel, message: string, context: LogContext) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: "proven-app",
    ...serializeLogContext(context),
  };

  const payload = JSON.stringify(entry);
  switch (level) {
    case "debug":
    case "info":
      console.log(payload);
      break;
    case "warn":
      console.warn(payload);
      break;
    case "error":
      console.error(payload);
      break;
    default:
      console.log(payload);
  }
}

export function createLogger(defaultContext: LogContext = {}) {
  return {
    child(context: LogContext) {
      return createLogger({
        ...defaultContext,
        ...context,
      });
    },
    debug(message: string, context: LogContext = {}) {
      writeLog("debug", message, {
        ...defaultContext,
        ...context,
      });
    },
    info(message: string, context: LogContext = {}) {
      writeLog("info", message, {
        ...defaultContext,
        ...context,
      });
    },
    warn(message: string, context: LogContext = {}) {
      writeLog("warn", message, {
        ...defaultContext,
        ...context,
      });
    },
    error(message: string, context: LogContext = {}) {
      writeLog("error", message, {
        ...defaultContext,
        ...context,
      });
    },
  };
}
