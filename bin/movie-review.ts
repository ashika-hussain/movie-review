#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MovieReviewStack } from '../lib/movie-review-stack';
import { AuthAppStack } from '../lib/auth-app-stack';

const app = new cdk.App();

new AuthAppStack(app,'AuthAppStack')