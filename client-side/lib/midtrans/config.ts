// @ts-ignore - midtrans-client doesn't have type definitions
const midtransClient = require("midtrans-client");

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
const clientKey =
  process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || process.env.MIDTRANS_CLIENT_KEY || "";

// Initialize Snap API client for Midtrans
export const snap = new midtransClient.Snap({
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
  clientKey,
});

export const coreApi = new midtransClient.CoreApi({
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
  clientKey,
});

export const MIDTRANS_CONFIG = {
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
  clientKey,
};