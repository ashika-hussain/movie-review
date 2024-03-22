## Serverless REST Assignment.

__Name:__ ASHIKA HUSSAIN

__Video demonstration:__ https://youtu.be/toe4PK-_o6c

This repository contains an implementation of a serverless REST API for the AWS platform. The CDK framework is used to provision its infrastructure. The API's domain context is movie reviews.

### API endpoints.

+ POST /movies/reviews - add a movie review.
+ GET /movies/{movieId}/reviews - Get all the reviews for the specified movie.
+ GET /movies/{movieId}/reviews?minRating=n - Get the reviews for the specified movie with a rating greater than the minRating.
+ GET /movies/{movieId}/reviews/{reviewerName} - Get the review written by the named reviewer for the specified movie.
+ PUT /movies/{movieId}/reviews/{reviewerName} - Update the text of a review.
+ GET /movies/{movieId}/reviews/{year} - Get the reviews written in a specific year for a specific movie.
+ GET /reviews/{reviewerName} - Get all the reviews written by a specific reviewer.
+ GET /reviews/{reviewerName}/{movieId}/translation?language=code - Get a translated version of a movie review using the movie ID and reviewer name as the identifier.
 

![](./images/api1.png)

![](./images/api1.png)

![](./images/api3.png)

### Authentication (if relevant).

![](./images/cognito.png)

### Independent learning (If relevant).

 I had to learn about lambda layering, which involves using lambda functions within neural network layers. This required independent research and understanding. You can see evidence of this in the common file and "movie-review-stack" project files.
 Also, how to use AWS Translate for translation tasks, as evidenced by the "translate.ts" file and the "movie-review-stack" project. This involved independent research and learning to implement translation functionality using AWS Translate services.
