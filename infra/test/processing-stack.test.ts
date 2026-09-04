import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, it } from "vitest";
import { CoreStack } from "../lib/core-stack";
import { ProcessingStack } from "../lib/processing-stack";

function synth() {
  const app = new cdk.App();
  const env = { account: "123456789012", region: "us-east-1" };
  const core = new CoreStack(app, "TestCoreStack", { env });
  const processing = new ProcessingStack(app, "TestProcessingStack", {
    env,
    uploadsBucket: core.uploadsBucket,
    outputsBucket: core.outputsBucket,
    sessionsTable: core.sessionsTable,
    processingQueue: core.processingQueue,
  });
  cdk.Tags.of(app).add("Project", "picperfecto");
  return Template.fromStack(processing);
}

describe("ProcessingStack", () => {
  it("exposes generate-upload-url and get-session as unauthenticated Function URLs restricted to picperfecto.com", () => {
    const template = synth();

    template.resourceCountIs("AWS::Lambda::Url", 2);
    template.hasResourceProperties("AWS::Lambda::Url", {
      AuthType: "NONE",
      Cors: Match.objectLike({ AllowOrigins: Match.arrayWith(["https://picperfecto.com"]) }),
    });
  });

  it("gives process-upload an SQS event source with partial batch failure reporting", () => {
    const template = synth();

    template.hasResourceProperties("AWS::Lambda::EventSourceMapping", {
      FunctionResponseTypes: ["ReportBatchItemFailures"],
      BatchSize: 5,
    });
  });

  it("scopes bucket/table IAM grants per function rather than one shared role", () => {
    const template = synth();

    // Three handlers, each getting its own Lambda service role.
    template.resourceCountIs("AWS::IAM::Role", 3);
  });

  it("grants process-upload Rekognition's DetectModerationLabels action", () => {
    const template = synth();

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({ Effect: "Allow", Action: "rekognition:DetectModerationLabels" }),
        ]),
      }),
    });
  });

  it("tags every function with Project=picperfecto", () => {
    const template = synth();

    template.allResourcesProperties("AWS::Lambda::Function", {
      Tags: Match.arrayWith([{ Key: "Project", Value: "picperfecto" }]),
    });
  });
});
