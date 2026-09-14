import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, it } from "vitest";
import { FrontendStack } from "../lib/frontend-stack";

function synth() {
  const app = new cdk.App();
  const env = { account: "123456789012", region: "us-east-1" };
  const stack = new FrontendStack(app, "TestFrontendStack", { env });
  cdk.Tags.of(app).add("Project", "picperfecto");
  return Template.fromStack(stack);
}

describe("FrontendStack", () => {
  it("creates a private, encrypted, SSL-only site bucket with no public access", () => {
    const template = synth();

    template.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      BucketEncryption: Match.objectLike({
        ServerSideEncryptionConfiguration: Match.arrayWith([
          Match.objectLike({ ServerSideEncryptionByDefault: Match.objectLike({ SSEAlgorithm: "AES256" }) }),
        ]),
      }),
    });
    template.hasResourceProperties("AWS::S3::BucketPolicy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({ Effect: "Deny", Condition: { Bool: { "aws:SecureTransport": "false" } } }),
        ]),
      }),
    });
  });

  it("requests an ACM certificate for the apex domain, validated via the existing hosted zone", () => {
    const template = synth();

    template.hasResourceProperties("AWS::CertificateManager::Certificate", {
      DomainName: "picperfecto.com",
      ValidationMethod: "DNS",
    });
  });

  it("serves the site over CloudFront with the apex domain and HTTPS enforced", () => {
    const template = synth();

    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        Aliases: ["picperfecto.com"],
        DefaultRootObject: "index.html",
        DefaultCacheBehavior: Match.objectLike({ ViewerProtocolPolicy: "redirect-to-https" }),
      }),
    });
  });

  it("attaches a CloudFront-scoped WAF Web ACL with managed rule groups and a per-IP rate limit", () => {
    const template = synth();

    template.hasResourceProperties("AWS::WAFv2::WebACL", {
      Scope: "CLOUDFRONT",
      Rules: Match.arrayWith([
        Match.objectLike({
          Name: "AWS-AWSManagedRulesCommonRuleSet",
          Statement: Match.objectLike({
            ManagedRuleGroupStatement: Match.objectLike({ Name: "AWSManagedRulesCommonRuleSet" }),
          }),
        }),
        Match.objectLike({
          Name: "AWS-AWSManagedRulesKnownBadInputsRuleSet",
          Statement: Match.objectLike({
            ManagedRuleGroupStatement: Match.objectLike({ Name: "AWSManagedRulesKnownBadInputsRuleSet" }),
          }),
        }),
        Match.objectLike({
          Name: "RateLimitPerIp",
          Statement: Match.objectLike({
            RateBasedStatement: Match.objectLike({ Limit: 2000, AggregateKeyType: "IP" }),
          }),
        }),
      ]),
    });

    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        WebACLId: Match.objectLike({ "Fn::GetAtt": Match.arrayWith([Match.stringLikeRegexp("^SiteWebAcl")]) }),
      }),
    });
  });

  it("falls back to the SPA shell (200.html) with a real 200 for both 403 and 404 from the origin", () => {
    const template = synth();

    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        CustomErrorResponses: Match.arrayWith([
          Match.objectLike({ ErrorCode: 403, ResponseCode: 200, ResponsePagePath: "/200.html" }),
          Match.objectLike({ ErrorCode: 404, ResponseCode: 200, ResponsePagePath: "/200.html" }),
        ]),
      }),
    });
  });

  it("only reaches the bucket through CloudFront's Origin Access Control, never directly", () => {
    const template = synth();

    template.resourceCountIs("AWS::CloudFront::OriginAccessControl", 1);
    template.hasResourceProperties("AWS::S3::BucketPolicy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: "Allow",
            Principal: { Service: "cloudfront.amazonaws.com" },
          }),
        ]),
      }),
    });
  });

  it("points the apex A and AAAA records at the CloudFront distribution", () => {
    const template = synth();

    for (const recordType of ["A", "AAAA"]) {
      template.hasResourceProperties("AWS::Route53::RecordSet", {
        Name: "picperfecto.com.",
        Type: recordType,
        HostedZoneId: "Z06376742T1BU4DRI8T25",
        AliasTarget: Match.objectLike({
          // The distribution's own domain name, aliased rather than CNAME'd
          // so it works at the zone apex.
          DNSName: Match.objectLike({ "Fn::GetAtt": Match.arrayWith([Match.stringLikeRegexp("^SiteDistribution")]) }),
        }),
      });
    }
  });

  it("tags the stack's resources with Project=picperfecto", () => {
    const template = synth();

    template.hasResourceProperties("AWS::S3::Bucket", {
      Tags: Match.arrayWith([{ Key: "Project", Value: "picperfecto" }]),
    });
  });
});
