// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://914d8e1432711125e94c4e021c1ac71c@o4509639675084800.ingest.us.sentry.io/4509639687536640",
  // Tracing
  tracesSampleRate: 1.0, //  Capture 100% of the transactions

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});

export { Sentry }; 