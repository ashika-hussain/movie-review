import { marshall } from "@aws-sdk/util-dynamodb";
import { MovieReviews} from "./types";

export const generateMovieItem = (movieReviews: MovieReviews) => {
  return {
    PutRequest: {
      Item: marshall(movieReviews),
    },
  };
};

export const generateBatch = (data: MovieReviews[]) => {
  return data.map((e) => {
    return generateMovieItem(e);
  });
};

export function isNumber(str: string): boolean {
  return /^\d+$/.test(str);
}

