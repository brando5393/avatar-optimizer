import * as path from "node:path";
import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as ses from "aws-cdk-lib/aws-ses";
import { Construct } from "constructs";

const DOMAIN_NAME = "picperfecto.com";
const HOSTED_ZONE_ID = "Z06376742T1BU4DRI8T25";
const MAIL_FROM_DOMAIN = `mail.${DOMAIN_NAME}`;
const CONTACT_TO_ADDRESS = "brando5393@gmail.com";
const CONTACT_FROM_ADDRESS = `no-reply@${DOMAIN_NAME}`;

// Created out-of-band alongside the Turnstile widget itself — see
// docs/architecture.md and the picperfecto-turnstile-secret-read policy.
const TURNSTILE_SECRET_ID = "picperfecto/turnstile-secret-key";
const TURNSTILE_SECRET_READ_POLICY_ARN =
  "arn:aws:iam::899111410433:policy/picperfecto-turnstile-secret-read";

/**
 * Domain-verified email sending (SES, DKIM, custom MAIL FROM, DMARC
 * monitoring) plus the Turnstile-gated contact-form Lambda that uses it.
 * No inbound mailbox exists — this is send-only, so the owner's personal
 * address is never exposed to visitors.
 */
export class ContactStack extends Stack {
  public readonly contactFormUrl: string;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "Zone", {
      hostedZoneId: HOSTED_ZONE_ID,
      zoneName: DOMAIN_NAME,
    });

    const emailIdentity = new ses.EmailIdentity(this, "EmailIdentity", {
      identity: ses.Identity.publicHostedZone(hostedZone),
      mailFromDomain: MAIL_FROM_DOMAIN,
    });

    // DMARC monitoring (p=none) — the skill-recommended starting point;
    // plan progression to p=quarantine once alignment is confirmed.
    new route53.TxtRecord(this, "DmarcRecord", {
      zone: hostedZone,
      recordName: `_dmarc.${DOMAIN_NAME}`,
      values: ["v=DMARC1; p=none;"],
    });

    const contactFn = new NodejsFunction(this, "ContactFormHandler", {
      entry: path.join(__dirname, "..", "..", "backend", "src", "handlers", "contact-form.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: Duration.seconds(10),
      memorySize: 256,
      environment: {
        CONTACT_FROM_ADDRESS,
        CONTACT_TO_ADDRESS,
        TURNSTILE_SECRET_ID,
        ALLOWED_ORIGIN: `https://${DOMAIN_NAME}`,
      },
    });

    contactFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail"],
        resources: [emailIdentity.emailIdentityArn],
      }),
    );

    contactFn.role?.addManagedPolicy(
      iam.ManagedPolicy.fromManagedPolicyArn(
        this,
        "TurnstileSecretReadPolicy",
        TURNSTILE_SECRET_READ_POLICY_ARN,
      ),
    );

    const fnUrl = contactFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: [`https://${DOMAIN_NAME}`, "http://localhost:5173"],
        allowedMethods: [lambda.HttpMethod.POST],
        allowedHeaders: ["content-type"],
        maxAge: Duration.hours(1),
      },
    });

    this.contactFormUrl = fnUrl.url;

    new CfnOutput(this, "ContactFormUrl", {
      value: this.contactFormUrl,
      description: "Set frontend/src/lib/config.ts CONTACT_API_URL to this value after deploy.",
    });
  }
}
