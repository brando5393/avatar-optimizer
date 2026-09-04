#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { Tags } from "aws-cdk-lib";
import { ContactStack } from "../lib/contact-stack";
import { CoreStack } from "../lib/core-stack";
import { ProcessingStack } from "../lib/processing-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
};

const coreStack = new CoreStack(app, "PicPerfectoCoreStack", { env });
new ContactStack(app, "PicPerfectoContactStack", { env });
new ProcessingStack(app, "PicPerfectoProcessingStack", {
  env,
  uploadsBucket: coreStack.uploadsBucket,
  outputsBucket: coreStack.outputsBucket,
  sessionsTable: coreStack.sessionsTable,
  processingQueue: coreStack.processingQueue,
});

// Every resource this app owns must carry this tag: it is how the resource
// shows up in the picperfecto-optimizer Resource Group, how spend is
// attributed in Cost Explorer, and how a future teardown finds everything
// that belongs to this project. See docs/architecture.md.
Tags.of(app).add("Project", "picperfecto");
