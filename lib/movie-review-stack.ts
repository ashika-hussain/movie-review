import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdanode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { generateBatch } from "../shared/util";
import { movieReviews } from '../seed/reviews';
import * as apig from "aws-cdk-lib/aws-apigateway";
import { AuthAppStack } from './auth-app-stack';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

type AuthProps = {
  userPoolId: string;
  userPoolClientId: string;
};
export class MovieReviewStack extends cdk.Stack {
  private auth: apig.IResource;
  private userPoolId: string;
  private userPoolClientId: string;

  constructor(scope: Construct, id: string, props: AuthProps) {
    super(scope, id);


    const moviesTable = new dynamodb.Table(this, "MoviesTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "MovieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "ReviewerName", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "MovieReviews",
    });
    moviesTable.addLocalSecondaryIndex({
      indexName: 'ReviewerDateIndex',
      sortKey: { name: 'ReviewDate', type: dynamodb.AttributeType.STRING }
    });
    
    new custom.AwsCustomResource(this, "moviesddbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [moviesTable.tableName]: generateBatch(movieReviews),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("moviesddbInitData"), //.of(Date.now().toString()),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [moviesTable.tableArn],
      }),
    });
    const getMovieReviewByIdFn = new lambdanode.NodejsFunction(
      this,
      "GetMovieReviewByIdFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/getMovieReviewById.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: moviesTable.tableName,
          REGION: 'eu-west-1',
        },
      }
    );

    const getMovieReviewByParameter = new lambdanode.NodejsFunction(
      this,
      "GetMovieReviewByReviewerName",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/getMoviewReviewByParameter.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: moviesTable.tableName,
          REGION: 'eu-west-1',
        },
      }
    )

    const getReviewsByReviewer = new lambdanode.NodejsFunction(
      this,
      "GetReviewByReviewer",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/getMoviewReviewByReviewer.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: moviesTable.tableName,
          REGION: 'eu-west-1',
        },

      }
    )
    const addnewReview = new lambdanode.NodejsFunction(this, "addnewReview", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/addMovieReview.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: moviesTable.tableName,
        USER_POOL_ID: props.userPoolId,
        CLIENT_ID: props.userPoolClientId,
        REGION: "eu-west-1",
      },
    });


    const updateMovieReview = new lambdanode.NodejsFunction(this, "updateMovieReview", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/updateMovieReview.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: moviesTable.tableName,
        USER_POOL_ID: props.userPoolId,
        CLIENT_ID: props.userPoolClientId,
        REGION: "eu-west-1",
      },
    });

    const authorizerFn = new lambdanode.NodejsFunction(this, "AuthorizerFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/auth/authorizer.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        USER_POOL_ID: props.userPoolId,
        CLIENT_ID: props.userPoolClientId,
        REGION: cdk.Aws.REGION,
      },
    });

    const requestAuthorizer = new apig.RequestAuthorizer(
      this,
      "RequestAuthorizer",
      {
        identitySources: [apig.IdentitySource.header("cookie")],
        handler: authorizerFn,
        resultsCacheTtl: cdk.Duration.minutes(0),
      }
    );

    const translateReview = new lambdanode.NodejsFunction(
      this,
      "GetTranslatedReview",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/translate.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: moviesTable.tableName,
          REGION: 'eu-west-1',
        },

      }
    )

    translateReview.role?.attachInlinePolicy(new Policy(this, 'TranslateTextPolicy', {
      statements: [
        new PolicyStatement({
          actions: ['translate:TranslateText'],
          resources: ['*'], // Consider restricting to specific resources if possible
        }),
      ],
    }))
    
    moviesTable.grantReadData(getMovieReviewByIdFn)
    moviesTable.grantReadData(getMovieReviewByParameter)
    moviesTable.grantReadData(getReviewsByReviewer)
    moviesTable.grantReadWriteData(addnewReview)
    moviesTable.grantReadWriteData(updateMovieReview)
    moviesTable.grantReadData(translateReview)

    const api = new apig.RestApi(this, "RestAPI", {
      description: "demo api",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    const moviesEndpoint = api.root.addResource("movies");
    const movieEndpoint = moviesEndpoint.addResource("{MovieId}");
    const reviewEndpoint = movieEndpoint.addResource("reviews")
    const reviewerEndPoint = reviewEndpoint.addResource("{parameter}")

    const addEndPoint = moviesEndpoint.addResource("reviews")


    const reviewMainEndPoint = api.root.addResource("reviews");
    const reviewerMainEndPoint = reviewMainEndPoint.addResource("{reviewerName}")
    const translateEndPont = reviewerMainEndPoint.addResource("{MovieId}").addResource("translation")

    reviewEndpoint.addMethod( "GET", new apig.LambdaIntegration(getMovieReviewByIdFn),{
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    });
    reviewerEndPoint.addMethod("GET", new apig.LambdaIntegration(getMovieReviewByParameter, {proxy: true}))
    reviewerMainEndPoint.addMethod("GET", new apig.LambdaIntegration(getReviewsByReviewer, {proxy: true}))
    addEndPoint.addMethod("POST", new apig.LambdaIntegration(addnewReview, {proxy: true}),{
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    });
    reviewerEndPoint. addMethod("PUT", new apig.LambdaIntegration(updateMovieReview, {proxy:true}),{
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    })

    translateEndPont.addMethod("GET", new apig.LambdaIntegration(translateReview,{proxy: true}))
    
    
  }
}
