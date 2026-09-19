/**
 * backend/src/lib/notifications.ts
 *
 * Dispatches urgent offer notifications via Amazon SES.
 * In sandbox mode, emails are sent to verified identities (with non-blocking error handling).
 * If SES fails, an audit row is written and offer creation continues uninterrupted.
 */

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { isoNow, type Component, type BloodGroup } from "@pulsechain/shared";
import { writeAuditEvent } from "./audit.js";

const REGION = process.env.AWS_REGION || "ap-south-1";
const SENDER_EMAIL = process.env.SES_SENDER_EMAIL || "harshiniyogaraj04@gmail.com";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://pvn1ufnvn6.execute-api.ap-south-1.amazonaws.com";

let sesClient: SESClient | null = null;

function getSesClient(): SESClient {
  if (!sesClient) {
    sesClient = new SESClient({ region: REGION });
  }
  return sesClient;
}

export interface OfferNotificationParams {
  offerId: string;
  recipientFacilityId: string;
  recipientFacilityName: string;
  recipientEmail?: string | null;
  unitId: string;
  component: Component;
  bloodGroup: BloodGroup | string;
  volumeMl?: number;
  originFacilityName: string;
  distanceKm: number;
  hoursRemaining: number;
  reason: string;
  claimBy: string;
}

export async function sendOfferEmailNotification(
  params: OfferNotificationParams,
): Promise<{ sent: boolean; messageId?: string; error?: string }> {
  // If no email configured or fake domain that cannot be verified in sandbox
  const recipientEmail = params.recipientEmail;
  if (!recipientEmail || recipientEmail.endsWith(".invalid")) {
    // In demo sandbox, redirect or map demo facilities to verified target if configured
    console.log(`[Notification] Recipient ${params.recipientFacilityId} has invalid/sandbox email: ${recipientEmail}. Skipping raw send.`);
    return { sent: false, error: "Sandbox unverified address" };
  }

  const subject = `[PulseChain URGENT] Blood Offer: ${params.component} ${params.bloodGroup} (${params.distanceKm} km away)`;
  const inboxUrl = `${FRONTEND_URL}/hospital/inbox`;

  const textBody = `
PULSECHAIN URGENT BLOOD OFFER
=============================

A surplus blood unit matching your facility's requirements is currently available:

Unit ID:          ${params.unitId}
Component:        ${params.component}
Blood Group:      ${params.bloodGroup}
Volume:           ${params.volumeMl ?? 250} mL
Origin Facility:  ${params.originFacilityName}
Distance:         ${params.distanceKm} km
Hours to Expiry:  ~${params.hoursRemaining.toFixed(1)} hours
Match Rationale:  ${params.reason}

Claim Window Closes: ${params.claimBy}

Review and claim this unit immediately at:
${inboxUrl}
`.trim();

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
  <div style="background-color: #dc2626; color: white; padding: 12px 16px; border-radius: 6px; font-weight: bold; font-size: 16px;">
    PulseChain Urgent Blood Offer
  </div>
  <div style="padding: 16px 0;">
    <p>A surplus blood unit has crossed its local expiry threshold and has been offered to <strong>${params.recipientFacilityName}</strong>.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 6px 0; color: #64748b;">Unit ID:</td><td style="font-weight: 600;">${params.unitId}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;">Component:</td><td style="font-weight: 600;">${params.component}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;">Blood Group:</td><td style="font-weight: 600; color: #dc2626;">${params.bloodGroup}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;">Distance:</td><td style="font-weight: 600;">${params.distanceKm} km</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;">Hours to Expiry:</td><td style="font-weight: 600;">${params.hoursRemaining.toFixed(1)} h</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;">Match Rationale:</td><td><em>${params.reason}</em></td></tr>
    </table>
    <div style="margin-top: 24px;">
      <a href="${inboxUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Open Hospital Inbox &amp; Claim
      </a>
    </div>
  </div>
</div>
`.trim();

  try {
    const client = getSesClient();
    const res = await client.send(
      new SendEmailCommand({
        Source: SENDER_EMAIL,
        Destination: {
          ToAddresses: [recipientEmail],
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

    console.log(`[Notification] Successfully sent offer email to ${recipientEmail} (MessageId: ${res.MessageId})`);
    return { sent: true, messageId: res.MessageId };
  } catch (err: any) {
    console.warn(`[Notification] SES send error for ${recipientEmail}: ${err.message}`);
    // Record audit event so failures are tracked without stopping offer creation
    await writeAuditEvent({
      eventType: "OFFER_NOTIFICATION_FAILED",
      subjectType: "UNIT",
      subjectId: params.unitId,
      timestamp: isoNow(),
      details: {
        recipientFacilityId: params.recipientFacilityId,
        recipientEmail,
        error: err.message,
      },
    }).catch(() => {});

    return { sent: false, error: err.message };
  }
}
