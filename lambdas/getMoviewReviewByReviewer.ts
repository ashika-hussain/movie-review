import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { createDynamoDBDocumentClient } from "../shared/common"
const ddbDocClient = createDynamoDBDocumentClient();
export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {     // Note change
    try {
      console.log("Event: ", event);
      const parameters  = event?.pathParameters;
      const reviewerName = parameters?.reviewerName ? parameters.reviewerName : undefined;


      if (!reviewerName) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing reviewer Name" }),
      };
    }
    const commandOutput = await ddbDocClient.send(new ScanCommand({
        TableName: process.env.TABLE_NAME,
        FilterExpression: "ReviewerName = :reviewerName",
        ExpressionAttributeValues: {
            ":reviewerName": reviewerName
        }
    }
    )
    )
  

  if (!commandOutput.Items || commandOutput.Items.length === 0) {
    return {
      statusCode: 404,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ Message: "No movie reviews found for this reviewer." }),
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