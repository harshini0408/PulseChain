import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import type { Offer, Facility, BloodUnit } from "@pulsechain/shared";

const sesClient = new SESClient({});

export interface SendOfferNotificationParams {
  toEmail: string;
  facility: Facility;
  unit: BloodUnit;
  offer: Offer;
}

export async function sendOfferNotification(params: SendOfferNotificationParams): Promise<boolean> {
  const fromEmail = process.env.SES_FROM;

  if (!fromEmail) {
    console.log(
      `[SES MOCK] Email notification sent to ${params.toEmail} for Offer ${params.offer.offerId} (Unit ${params.unit.unitId}, Group ${params.unit.bloodGroup} ${params.unit.component}). Claim by: ${params.offer.claimBy}`
    );
    return true;
  }

  try {
    const subject = `[URGENT] PulseChain Blood Offer: ${params.unit.bloodGroup} ${params.unit.component} Available`;
    const bodyText = `
PulseChain Emergency Expiry-Rescue Alert

Dear ${params.facility.name},

A compatible blood unit has been offered to your facility:
- Unit ID: ${params.unit.unitId}
- Blood Group: ${params.unit.bloodGroup}
- Component: ${params.unit.component}
- Volume: ${params.unit.volumeMl} ml
- Expiry Window: ${params.unit.expiresAt}
- Offer Rank: #${params.offer.rank} (Score: ${params.offer.score})
- Reason: ${params.offer.reason}

Claim Window Closes: ${params.offer.claimBy}

Please log in to your PulseChain Inbox to Claim or Decline this offer immediately:
Offer ID: ${params.offer.offerId}
    `.trim();

    await sesClient.send(
      new SendEmailCommand({
        Source: fromEmail,
        Destination: {
          ToAddresses: [params.toEmail],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: "UTF-8",
          },
          Body: {
            Text: {
              Data: bodyText,
              Charset: "UTF-8",
            },
          },
        },
      })
    );
    return true;
  } catch (err) {
    console.warn(`[SES] Failed to send email to ${params.toEmail}:`, err);
    return false;
  }
}
