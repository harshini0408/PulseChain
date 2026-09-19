/**
 * backend/src/lib/mobilisation-notifications.ts
 *
 * Dispatches secure community mobilisation requests via Amazon SES.
 * When donor-tier activation selects a community or college donor pool,
 * this library emails the pool contact with a time-limited one-time link.
 *
 * Requirements:
 * - Uses existing SES configuration (SES_SENDER_EMAIL, AWS_REGION, FRONTEND_URL)
 * - Safe demo handling for .invalid email addresses (clearly flagged as skipped, not sent)
 * - Links to ${FRONTEND_URL}/mobilise/<token>
 */

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import type { Component, BloodGroup } from "@pulsechain/shared";

const REGION = process.env.AWS_REGION || "ap-south-1";
const SENDER_EMAIL = process.env.SES_SENDER_EMAIL || "harshiniyogaraj04@gmail.com";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

let sesClient: SESClient | null = null;

function getSesClient(): SESClient {
  if (!sesClient) {
    sesClient = new SESClient({ region: REGION });
  }
  return sesClient;
}

export interface MobilisationNotificationParams {
  token: string;
  poolId: string;
  poolName: string;
  contactName: string;
  contactEmail: string;
  component: Component;
  bloodGroup: BloodGroup;
  unitsRequested: number;
  hospitalName: string;
  hospitalCity: string;
}

export interface MobilisationNotificationResult {
  sent: boolean;
  skipped?: boolean;
  messageId?: string;
  reason?: string;
  error?: string;
}

export async function sendMobilisationEmailNotification(
  params: MobilisationNotificationParams,
): Promise<MobilisationNotificationResult> {
  const { contactEmail, contactName, poolName, token, component, bloodGroup, hospitalName, hospitalCity } = params;

  // 1. Check for demo / sandbox dummy addresses ending in .invalid
  if (!contactEmail || contactEmail.endsWith(".invalid")) {
    console.log(
      `[Mobilisation SES] Demo address detected for pool ${poolName} (${params.poolId}): "${contactEmail}". Skipping SES send (demo mode).`,
    );
    return {
      sent: false,
      skipped: true,
      reason: `Demo dummy domain (.invalid) skipped to respect SES sandbox`,
    };
  }

  const mobiliseUrl = `${FRONTEND_URL}/mobilise/${encodeURIComponent(token)}`;
  const subject = `[PulseChain Emergency] Community Mobilisation Needed: ${bloodGroup} ${component} for ${hospitalName}`;

  const textBody = `
PULSECHAIN COMMUNITY MOBILISATION REQUEST
=========================================

Dear ${contactName || poolName},

An emergency blood requirement cannot be satisfied from institutional surplus stock.
PulseChain has identified ${poolName} as an eligible donor pool to assist:

Required Blood Group: ${bloodGroup}
Component:            ${component}
Units Needed:         ${params.unitsRequested}
Requesting Hospital:  ${hospitalName}
Location:             ${hospitalCity}

Can your community help mobilise eligible members to donate?

To acknowledge this request and inform the regional coordinator that your community is reaching out to members, please open this secure link:
${mobiliseUrl}

Note: No account, password, or login is required. This link is single-use and time-limited.
`.trim();

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
  <div style="background-color: #dc2626; color: white; padding: 14px 18px; border-radius: 8px; font-weight: bold; font-size: 16px; letter-spacing: -0.01em;">
    PulseChain Community Mobilisation Request
  </div>
  <div style="padding: 20px 0;">
    <p style="font-size: 15px; color: #1e293b; line-height: 1.5;">Dear <strong>${contactName || poolName}</strong>,</p>
    <p style="font-size: 14px; color: #475569; line-height: 1.5;">
      An urgent blood requirement cannot be met by regional blood bank inventory. PulseChain has identified <strong>${poolName}</strong> as a nearby matching donor pool:
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 40%;">Blood Group:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #dc2626; font-size: 16px;">${bloodGroup}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Component:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${component}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Units Requested:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${params.unitsRequested}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Requesting Hospital:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${hospitalName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">City / Corridor:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${hospitalCity}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 14px; color: #334155; margin: 20px 0 16px 0;">
      Can your community help mobilise eligible members to donate?
    </p>

    <div style="margin: 24px 0;">
      <a href="${mobiliseUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
        Acknowledge Request &amp; Mobilise Members
      </a>
    </div>

    <p style="font-size: 12px; color: #94a3b8; line-height: 1.4; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
      No account, password, or login is required. This secure link is single-use and time-limited.
    </p>
  </div>
</div>
`.trim();

  try {
    const client = getSesClient();
    const res = await client.send(
      new SendEmailCommand({
        Source: SENDER_EMAIL,
        Destination: {
          ToAddresses: [contactEmail],
        },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: textBody, Charset: "UTF-8" },
            Html: { Data: htmlBody, Charset: "UTF-8" },
          },
        },
      }),
    );

    console.log(`[Mobilisation SES] Email successfully sent to ${contactEmail} (MessageId: ${res.MessageId})`);
    return { sent: true, messageId: res.MessageId };
  } catch (err: any) {
    console.error(`[Mobilisation SES] Failed to send email to ${contactEmail}:`, err?.message || err);
    return { sent: false, error: err?.message || "SES send failure" };
  }
}
