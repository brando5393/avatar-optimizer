import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import { Construct } from "constructs";
import { DOMAIN_NAME, HOSTED_ZONE_ID } from "./constants";

/** WAF's rate-based rules evaluate over a fixed 5-minute window. */
const WAF_RATE_LIMIT_PER_5_MIN = 2000;

/**
 * Serves the SvelteKit static build at https://picperfecto.com: a private
 * S3 bucket (Block Public Access on, no website hosting endpoint) behind a
 * CloudFront distribution using Origin Access Control, an ACM certificate
 * validated via the existing Route 53 zone, and the apex A/AAAA alias
 * records pointing at that distribution.
 *
 * This stack only provisions infrastructure — it does not upload the built
 * site. That's a separate step (see docs/architecture.md's "Publishing the
 * frontend" section): `npm run build` in frontend/, then sync the output to
 * `siteBucket` and invalidate `distribution`, using the names in this
 * stack's CfnOutputs. Keeping asset upload out of `cdk synth`/`cdk deploy`
 * means this stack synthesizes the same way whether or not a build exists
 * yet, matching how CI validates every stack today.
 *
 * Fronted by an AWS WAF Web ACL (managed rule groups + a per-IP rate-based
 * rule) per docs/architecture.md's "Edge/security" row and cost-DoS
 * mitigation list — this carries a real flat monthly cost (~$5 base + $1 per
 * rule) on top of usage, already accounted for in that doc's cost estimate.
 *
 * Routing the API's Lambda Function URLs through this same distribution is
 * also called for in that "Edge/security" row but deliberately not included
 * here yet — that changes CORS and URL structure on stacks already live in
 * production, so it's a separate, larger change to confirm before building.
 */
export class FrontendStack extends Stack {
  public readonly siteBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "Zone", {
      hostedZoneId: HOSTED_ZONE_ID,
      zoneName: DOMAIN_NAME,
    });

    // CloudFront requires the certificate to live in us-east-1 — this stack
    // is deployed there (see bin/picperfecto.ts's default region), so a
    // plain regional certificate is correct here, no cross-region construct
    // needed.
    const certificate = new acm.Certificate(this, "SiteCertificate", {
      domainName: DOMAIN_NAME,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // Same DESTROY/auto-delete posture as CoreStack: the built site is
    // trivially regenerable (`npm run build` + re-sync), and one-click
    // teardown is a stated requirement for this project — see
    // docs/architecture.md.
    this.siteBucket = new s3.Bucket(this, "SiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // WAFv2 Web ACLs for CloudFront must be created with CLOUDFRONT scope in
    // us-east-1 — this stack already deploys there, same reasoning as the
    // certificate above.
    const webAcl = new wafv2.CfnWebACL(this, "SiteWebAcl", {
      scope: "CLOUDFRONT",
      defaultAction: { allow: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: "PicPerfectoSiteWebAcl",
      },
      rules: [
        {
          name: "AWS-AWSManagedRulesCommonRuleSet",
          priority: 0,
          overrideAction: { none: {} },
          statement: { managedRuleGroupStatement: { vendorName: "AWS", name: "AWSManagedRulesCommonRuleSet" } },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "CommonRuleSet",
          },
        },
        {
          name: "AWS-AWSManagedRulesKnownBadInputsRuleSet",
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: { vendorName: "AWS", name: "AWSManagedRulesKnownBadInputsRuleSet" },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "KnownBadInputs",
          },
        },
        {
          name: "RateLimitPerIp",
          priority: 2,
          action: { block: {} },
          statement: {
            rateBasedStatement: { limit: WAF_RATE_LIMIT_PER_5_MIN, aggregateKeyType: "IP" },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "RateLimitPerIp",
          },
        },
      ],
    });

    this.distribution = new cloudfront.Distribution(this, "SiteDistribution", {
      domainNames: [DOMAIN_NAME],
      certificate,
      webAclId: webAcl.attrArn,
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      errorResponses: [
        // SvelteKit's static adapter (frontend/svelte.config.js) emits a
        // 200.html SPA fallback for client-side routes like /upload and
        // /recover. S3 (via OAC) returns 403 for a key that doesn't exist
        // there, not 404, so both need to resolve to that fallback with a
        // real 200 status rather than surfacing S3's error body.
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: "/200.html" },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: "/200.html" },
      ],
    });

    const aliasTarget = route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution));
    new route53.ARecord(this, "SiteAliasRecordV4", { zone: hostedZone, target: aliasTarget });
    new route53.AaaaRecord(this, "SiteAliasRecordV6", { zone: hostedZone, target: aliasTarget });

    new CfnOutput(this, "SiteBucketName", { value: this.siteBucket.bucketName });
    new CfnOutput(this, "DistributionId", { value: this.distribution.distributionId });
    new CfnOutput(this, "DistributionDomainName", { value: this.distribution.distributionDomainName });
  }
}
