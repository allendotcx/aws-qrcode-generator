import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import * as path from 'path';
import * as apigateway from '@aws-cdk/aws-apigateway';

export class AwsQrcodeGeneratorStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    //
    // API Gateway
    const qrCodeApi = new apigateway.RestApi(this, 'QRCodeGeneratorApi', {
      description: 'QR Code Generator API',
      deployOptions: {
        stageName: 'dev',
      },
      // 👇 enable CORS
      defaultCorsPreflightOptions: {
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowMethods: ['GET', 'POST'],
        allowCredentials: false,
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
      },
    });

    new cdk.CfnOutput(this, 'qrCodeApiUrl', {value: qrCodeApi.url});
    //
    // lambda function
    const qrCodeLambda = new lambda.Function(this, 'AwsQrcodeGeneratorStack', {
      functionName: "QrCodeGenerator",
      runtime: lambda.Runtime.NODEJS_14_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(3),
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/qrcodegenerator')),
      environment: {
        REGION: cdk.Stack.of(this).region,
        AVAILABILITY_ZONES: JSON.stringify(
          cdk.Stack.of(this).availabilityZones,
        ),
      },
    });

    // API Gateway-Lambda Integration
    const customIntegration = new apigateway.LambdaIntegration(qrCodeLambda, {
      passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      proxy: false,
      requestTemplates: { "application/json": "$input.body" },
      integrationResponses: [
        {
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Content-Type': "'image/png'"
          },
          statusCode: '200',
        },
      ],
    });


    // API Gateway Response
    const generator = qrCodeApi.root.addResource('qrCodeResource');
    generator.addMethod(
      'POST',
      customIntegration,
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Content-Type': true
            },
          }]
        }
      );
    }
  }
