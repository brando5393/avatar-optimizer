import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, it } from "vitest";
import { ContactStack } from "../lib/contact-stack";
import { CoreStack } from "../lib/core-stack";

function synth() {
  const app = new cdk.App();
  const env = { account: "123456789012", region: "us-east-1" };
  const core = new CoreStack(app, "TestCoreStack", { env });
  const stack = new ContactStack(app, "TestContactStack", { env, rateLimitTable: core.rateLimitTable });
  cdk.Tags.of(app).add("Project", "picperfecto");
  return Template.fromStack(stack);
}

describe("ContactStack", () => {
  it("verifies the picperfecto.com domain identity with a custom MAIL FROM domain", () => {
    const template = synth();

    template.hasResourceProperties("AWS::SES::EmailIdentity", {
      EmailIdentity: "picperfecto.com",
      MailFromAttributes: Match.objectLike({ MailFromDomain: "mail.picperfecto.com" }),
    });
  });

  it("adds a DMARC monitoring record", () => {
    const template = synth();

    template.hasResourceProperties("AWS::Route53::RecordSet", {
      Name: "_dmarc.picperfecto.com.",
      Type: "TXT",
      ResourceRecords: Match.arrayWith([Match.stringLikeRegexp("v=DMARC1; p=none;")]),
    });
  });

  it("exposes an unauthenticated Function URL restricted to picperfecto.com by CORS", () => {
    const template = synth();

    template.hasResourceProperties("AWS::Lambda::Url", {
      AuthType: "NONE",
      Cors: Match.objectLike({
        AllowOrigins: Match.arrayWith(["https://picperfecto.com"]),
        AllowMethods: Match.arrayWith(["POST"]),
      }),
    });
  });

  it("scopes ses:SendEmail to the specific identity ARN, never a wildcard", () => {
    const template = synth();

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: "Allow",
            Action: "ses:SendEmail",
            Resource: Match.not("*"),
          }),
        ]),
      }),
    });
  });

  it("attaches the existing Turnstile secret-read policy rather than duplicating permissions", () => {
    const template = synth();

    template.hasResourceProperties("AWS::IAM::Role", {
      ManagedPolicyArns: Match.arrayWith([
        "arn:aws:iam::899111410433:policy/picperfecto-turnstile-secret-read",
      ]),
    });
  });

  it("grants the contact-form function write access to the rate-limit table", () => {
    const template = synth();

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: "Allow",
            Action: Match.arrayWith(["dynamodb:UpdateItem"]),
          }),
        ]),
      }),
    });
  });

  it("tags the stack's resources with Project=picperfecto", () => {
    const template = synth();

    template.hasResourceProperties("AWS::Lambda::Function", {
      Tags: Match.arrayWith([{ Key: "Project", Value: "picperfecto" }]),
    });
  });
});
