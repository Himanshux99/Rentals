"use client";
import { createAuthClient } from "better-auth/react";
import { phoneNumberClient } from "better-auth/client/plugins";

// Browser side of auth. Components call these three functions, never the library.
const client = createAuthClient({ plugins: [phoneNumberClient()] });

export function signInWithGoogle(callbackURL = "/seller") {
  return client.signIn.social({ provider: "google", callbackURL, errorCallbackURL: "/login?error=1" });
}

export async function sendOtp(phoneNumber: string) {
  const { error } = await client.phoneNumber.sendOtp({ phoneNumber });
  return error ? { error: error.message ?? "Could not send the code" } : {};
}

export async function verifyOtp(phoneNumber: string, code: string) {
  const { error } = await client.phoneNumber.verify({ phoneNumber, code, updatePhoneNumber: true, disableSession: true });
  return error ? { error: error.message ?? "Wrong code" } : {};
}
