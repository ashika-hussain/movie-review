import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";


const ddbDocClient = createDDbDocClient();
export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
      console.log("Event: ", event);
      const body = event.body ? JSON.parse(event.body) : undefined;
      const parameters  = event?.pathParameters;
      const movieId = parameters?.MovieId ? parseInt(parameters.MovieId) : undefined;
      const reviewerName = parameters?.parameter ? parameters.parameter : undefined;
  
      if (!movieId || !reviewerName || !body) {
        return {
          statusCode: 400,
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ message: "Invalid request parameters" }),
        };
      }
  
      const updatedContent = body.content;
  
      const commandOutput = await ddbDocClient.send(
        new UpdateCommand({
          TableName: process.env.TABLE_NAME,
          Key: {
            "MovieId": movieId ,
            "ReviewerName": reviewerName 
          },
          UpdateExpression: "SET Content = :updatedContent",
          ExpressionAttributeValues: {
            ":updatedContent" : updatedContent
          }
        })
      );
  
      return {
        statusCode: 200,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Review updated" }),
      };
    } catch (error: any) {
      console.error("Error:", error);
      return {
        statusCode: 500,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ error: "Internal Server Error" }),
      };
    }
  };
  
  function createDDbDocClient() {
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