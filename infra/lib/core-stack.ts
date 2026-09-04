import { Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

/** Every object in either bucket, and every session record, lives this long. */
export const RETENTION = Duration.days(3);

/**
 * Storage and session-table foundation for the app: private S3 buckets for
 * uploaded originals and processed outputs (72h lifecycle expiry), and a
 * DynamoDB table mapping recovery-code sessions to their objects (TTL
 * mirrors the bucket lifecycle so both expire together).
 *
 * Deliberately RemovalPolicy.DESTROY on everything here: this project's
 * data is designed to be ephemeral, and easy teardown/pause is a stated
 * requirement (see docs/architecture.md).
 */
export class CoreStack extends Stack {
  public readonly uploadsBucket: s3.Bucket;
  public readonly outputsBucket: s3.Bucket;
  public readonly sessionsTable: dynamodb.Table;
  public readonly processingQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.uploadsBucket = new s3.Bucket(this, "UploadsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      lifecycleRules: [{ expiration: RETENTION }],
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.POST],
          allowedOrigins: ["https://picperfecto.com", "http://localhost:5173"],
          allowedHeaders: ["*"],
        },
      ],
    });

    this.outputsBucket = new s3.Bucket(this, "OutputsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      lifecycleRules: [{ expiration: RETENTION }],
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: ["https://picperfecto.com", "http://localhost:5173"],
          allowedHeaders: ["*"],
        },
      ],
    });

    this.sessionsTable = new dynamodb.Table(this, "SessionsTable", {
      partitionKey: { name: "sessionToken", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: "expiresAt",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Lives here rather than in ProcessingStack: addEventNotification()
    // below adds a resource to *this* stack (whichever stack owns the
    // bucket), so if the queue lived in ProcessingStack instead, CoreStack
    // would need ProcessingStack's queue ARN while ProcessingStack also
    // needs CoreStack's bucket ARN for IAM grants — a dependency cycle
    // CloudFormation can't express across stacks.
    const processingDLQ = new sqs.Queue(this, "ProcessingDLQ", { retentionPeriod: Duration.days(3) });
    this.processingQueue = new sqs.Queue(this, "ProcessingQueue", {
      visibilityTimeout: Duration.seconds(120),
      deadLetterQueue: { queue: processingDLQ, maxReceiveCount: 3 },
    });
    this.uploadsBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.SqsDestination(this.processingQueue));
  }
}
