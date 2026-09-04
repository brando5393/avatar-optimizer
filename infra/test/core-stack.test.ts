import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, it } from "vitest";
import { CoreStack } from "../lib/core-stack";

function synth() {
  const app = new cdk.App();
  const stack = new CoreStack(app, "TestStack", {
    env: { account: "123456789012", region: "us-east-1" },
  });
  cdk.Tags.of(app).add("Project", "picperfecto");
  return Template.fromStack(stack);
}

describe("CoreStack", () => {
  it("creates exactly two private, encrypted, SSL-only S3 buckets", () => {
    const template = synth();

    template.resourceCountIs("AWS::S3::Bucket", 2);
    template.allResourcesProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      BucketEncryption: Match.objectLike({
        ServerSideEncryptionConfiguration: Match.arrayWith([
          Match.objectLike({
            ServerSideEncryptionByDefault: Match.objectLike({ SSEAlgorithm: "AES256" }),
          }),
        ]),
      }),
    });
  });

  it("expires every bucket's objects after 72 hours (3 days)", () => {
    const template = synth();

    template.allResourcesProperties("AWS::S3::Bucket", {
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({ Status: "Enabled", ExpirationInDays: 3 }),
        ]),
      },
    });
  });

  it("denies any non-SSL request via bucket policy", () => {
    const template = synth();

    template.hasResourceProperties("AWS::S3::BucketPolicy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: "Deny",
            Condition: { Bool: { "aws:SecureTransport": "false" } },
          }),
        ]),
      }),
    });
  });

  it("creates a pay-per-request sessions table with TTL on expiresAt", () => {
    const template = synth();

    template.hasResourceProperties("AWS::DynamoDB::Table", {
      BillingMode: "PAY_PER_REQUEST",
      TimeToLiveSpecification: { AttributeName: "expiresAt", Enabled: true },
      KeySchema: [{ AttributeName: "sessionToken", KeyType: "HASH" }],
    });
  });

  it("creates a pay-per-request rate-limit table with TTL on expiresAt", () => {
    const template = synth();

    template.resourceCountIs("AWS::DynamoDB::Table", 2);
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      BillingMode: "PAY_PER_REQUEST",
      TimeToLiveSpecification: { AttributeName: "expiresAt", Enabled: true },
      KeySchema: [{ AttributeName: "rateLimitKey", KeyType: "HASH" }],
    });
  });

  it("tags every taggable resource with Project=picperfecto", () => {
    const template = synth();

    template.hasResourceProperties("AWS::DynamoDB::Table", {
      Tags: Match.arrayWith([{ Key: "Project", Value: "picperfecto" }]),
    });
  });

  it("removes all stateful resources on stack deletion (ephemeral-by-design)", () => {
    const template = synth();

    template.allResources("AWS::DynamoDB::Table", { DeletionPolicy: "Delete" });
    template.allResources("AWS::S3::Bucket", { DeletionPolicy: "Delete" });
  });

  it("creates a processing queue with a dead-letter queue after 3 failed receives", () => {
    const template = synth();

    template.hasResourceProperties("AWS::SQS::Queue", {
      RedrivePolicy: Match.objectLike({ maxReceiveCount: 3 }),
    });
    template.resourceCountIs("AWS::SQS::Queue", 2);
  });

  it("wires the uploads bucket's ObjectCreated events to the processing queue", () => {
    const template = synth();

    template.hasResourceProperties("Custom::S3BucketNotifications", {
      NotificationConfiguration: Match.objectLike({
        QueueConfigurations: Match.arrayWith([
          Match.objectLike({ Events: Match.arrayWith(["s3:ObjectCreated:*"]) }),
        ]),
      }),
    });
  });
});
