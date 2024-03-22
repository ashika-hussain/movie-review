import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { createDynamoDBDocumentClient } from "../shared/common.js"
const ddbDocClient = createDynamoDBDocumentClient();
export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {     // Note change
    try {
      console.log("Event: ", event);
      const parameters  = event?.pathParameters;
      const MovieId = parameters?.MovieId ? parseInt(parameters.MovieId) : undefined;
      const queryStringParameters = event?.queryStringParameters;
      const minRating = queryStringParameters?.minRating ? parseInt(queryStringParameters.minRating): undefined

      if (!MovieId) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing movie Id" }),
      };
    }
    let commandOutput;
    const params : QueryCommandInput= {
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: "MovieId = :MovieId",
        ExpressionAttributeValues: {
            ":MovieId": MovieId
        }
    };

    params.ExpressionAttributeValues ??= {};

    if (minRating) {
        params.FilterExpression = "Rating >= :minRating";
        params.ExpressionAttributeValues[":minRating"] = minRating
        
    }

  commandOutput = await ddbDocClient.send(new QueryCommand(params));
  if (!commandOutput.Items || commandOutput.Items.length === 0) {
    return {
      statusCode: 404,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ Message: "No movie reviews found for the given MovieId" }),
    };
  }
  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ data: commandOutput.Items }),
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
