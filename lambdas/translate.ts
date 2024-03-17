import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import * as AWS from 'aws-sdk';

const ddbDocClient = createDynamoDBDocumentClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
        console.log("Event: ", event);
        const parameters = event?.pathParameters;
        const MovieId = parameters?.MovieId ? parseInt(parameters.MovieId) : undefined;
        const reviewerName = parameters?.reviewerName ? parameters?.reviewerName : undefined;
        const queryStringParameters = event?.queryStringParameters;
        const language = queryStringParameters?.language ? queryStringParameters.language : 'en';

        if (!MovieId) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ Message: "Missing movie Id" }),
            };
        }

        const params: QueryCommandInput = {
            TableName: process.env.TABLE_NAME,
            KeyConditionExpression: "MovieId = :MovieId AND ReviewerName = :ReviewerName",
            ExpressionAttributeValues: {
                ":MovieId": MovieId,
                ":ReviewerName": reviewerName
            }
        };

        const commandOutput = await ddbDocClient.send(new QueryCommand(params));

        if (!commandOutput.Items || commandOutput.Items.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ Message: "No movie reviews found for the given MovieId" }),
            };
        }

        // Extract the content to translate
        const contentToTranslate = commandOutput.Items[0]?.Content;

        if (!contentToTranslate) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ Message: "No content found for translation" }),
            };
        }

        // Translate the content
        const translate = new AWS.Translate();
        const translateParams: AWS.Translate.Types.TranslateTextRequest = {
            Text: contentToTranslate,
            SourceLanguageCode: 'en',
            TargetLanguageCode: language?.toString(),
        };

        const translatedMessage = await translate.translateText(translateParams).promise();

        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ data: translatedMessage }),
        };
    } catch (error: any) {
        console.log(JSON.stringify(error));
        return {
            statusCode: 500,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ error }),
        };
    }
};

function createDynamoDBDocumentClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION });
    const marshallOptions = {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
        wrapNumbers: false,
    };
    const translateConfig = { marshallOptions, unmarshallOptions };
    return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
