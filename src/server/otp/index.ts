import "server-only";
import { env } from "../env";

/** Delivers a code. Creating, storing and checking it is the auth library's job. */
export type OtpSender = { send(phone: string, code: string): Promise<void> };

const consoleSender: OtpSender = {
  async send(phone, code) {
    console.log(`\n[otp] ${phone} -> ${code}\n`);
  },
};

// MSG91 OTP API with a DLT-registered template that has one ##OTP## variable.
const msg91Sender: OtpSender = {
  async send(phone, code) {
    const res = await fetch("https://control.msg91.com/api/v5/otp?" + new URLSearchParams({
      template_id: env.MSG91_TEMPLATE_ID!,
      mobile: phone.replace(/^\+/, ""),
      otp: code,
    }), { method: "POST", headers: { authkey: env.MSG91_AUTH_KEY! } });
    if (!res.ok) throw new Error(`MSG91 send failed: ${res.status} ${await res.text()}`);
  },
};

export const otp: OtpSender = env.OTP_DRIVER === "msg91" ? msg91Sender : consoleSender;
