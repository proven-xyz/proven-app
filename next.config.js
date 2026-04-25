const { withSentryConfig } = require("@sentry/nextjs");
const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

const sentryWebpackPluginOptions = {
  silent: !process.env.CI,
  ...(process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT
    ? {
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        widenClientFileUpload: true,
      }
    : {}),
};

module.exports = withSentryConfig(
  withNextIntl(nextConfig),
  sentryWebpackPluginOptions
);
