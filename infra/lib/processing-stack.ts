import * as path from "node:path";
import { Duration, Stack, StackProps } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

const DOMAIN_NAME = "picperfecto.com";
const BACKEND_HANDLERS_DIR = path.join(__dirname, "..", "..", "backend", "src", "handlers");

export interface ProcessingStackProps extends StackProps {
  uploadsBucket: s3.Bucket;
  outputsBucket: s3.Bucket;
  sessionsTable: dynamodb.Table;
  /** Created in CoreStack — see the comment there for why. */
  processingQueue: sqs.Queue;
}

/**
 * The actual product: upload -> moderate -> resize/filter -> download.
 * Three Lambdas (generate-upload-url, process-upload, get-session) consuming
 * the SQS queue CoreStack wires to the uploads bucket. Only process-upload
 * needs Docker to bundle correctly, because it pulls in `sharp` (a native
 * module) — the other two are plain esbuild bundles like ContactStack's.
 */
export class ProcessingStack extends Stack {
  public readonly generateUploadUrlUrl: string;
  public readonly getSessionUrl: string;

  constructor(scope: Construct, id: string, props: ProcessingStackProps) {
    super(scope, id, props);

    const { uploadsBucket, outputsBucket, sessionsTable, processingQueue } = props;

    const commonEnv = {
      UPLOADS_BUCKET: uploadsBucket.bucketName,
      OUTPUTS_BUCKET: outputsBucket.bucketName,
      SESSIONS_TABLE: sessionsTable.tableName,
      ALLOWED_ORIGIN: `https://${DOMAIN_NAME}`,
    };

    const corsForFunctionUrl = (methods: lambda.HttpMethod[]) => ({
      allowedOrigins: [`https://${DOMAIN_NAME}`, "http://localhost:5173"],
      allowedMethods: methods,
      allowedHeaders: ["content-type"],
      maxAge: Duration.hours(1),
    });

    // --- generate-upload-url ---
    const generateUploadUrlFn = new NodejsFunction(this, "GenerateUploadUrlHandler", {
      entry: path.join(BACKEND_HANDLERS_DIR, "generate-upload-url.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: Duration.seconds(15),
      memorySize: 256,
      environment: commonEnv,
    });
    uploadsBucket.grantPut(generateUploadUrlFn);
    sessionsTable.grantWriteData(generateUploadUrlFn);
    const generateUploadUrlFnUrl = generateUploadUrlFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: corsForFunctionUrl([lambda.HttpMethod.POST]),
    });
    this.generateUploadUrlUrl = generateUploadUrlFnUrl.url;

    // --- process-upload ---
    // nodeModules + forceDockerBundling: esbuild treats sharp as external
    // and CDK npm-installs it inside a Lambda-matching Docker image, so the
    // deployment package gets the correct linux-arm64 native binary rather
    // than whatever platform `cdk synth` happens to run on.
    const processUploadFn = new NodejsFunction(this, "ProcessUploadHandler", {
      entry: path.join(BACKEND_HANDLERS_DIR, "process-upload.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: Duration.seconds(90),
      memorySize: 1536,
      environment: commonEnv,
      bundling: {
        nodeModules: ["sharp"],
        forceDockerBundling: true,
      },
    });
    uploadsBucket.grantRead(processUploadFn);
    uploadsBucket.grantDelete(processUploadFn);
    outputsBucket.grantPut(processUploadFn);
    sessionsTable.grantWriteData(processUploadFn);
    // Rekognition's detection APIs have no resource-level permissions —
    // AWS only supports "*" here, this isn't an over-broad grant on our part.
    processUploadFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["rekognition:DetectModerationLabels"],
        resources: ["*"],
      }),
    );
    processUploadFn.addEventSource(
      new lambdaEventSources.SqsEventSource(processingQueue, {
        batchSize: 5,
        reportBatchItemFailures: true,
      }),
    );

    // --- get-session ---
    const getSessionFn = new NodejsFunction(this, "GetSessionHandler", {
      entry: path.join(BACKEND_HANDLERS_DIR, "get-session.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: Duration.seconds(15),
      memorySize: 256,
      environment: commonEnv,
    });
    sessionsTable.grantReadData(getSessionFn);
    outputsBucket.grantRead(getSessionFn);
    const getSessionFnUrl = getSessionFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: corsForFunctionUrl([lambda.HttpMethod.GET]),
    });
    this.getSessionUrl = getSessionFnUrl.url;
  }
}
