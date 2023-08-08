import {
  PublishCommand,
  PublishCommandInput,
  SNSClient,
  SubscribeCommand,
  SubscribeCommandInput,
} from "@aws-sdk/client-sns";
import * as AWSXRay from "aws-xray-sdk";

// Just initialize the client here
const tracedSNSClient = AWSXRay.captureAWSv3Client(
  new SNSClient({ region: "us-east-1" })
);

export const createSubscription = async (params: SubscribeCommandInput) => {
  const result = await tracedSNSClient.send(new SubscribeCommand(params));
  return result;
};

export const publishMessage = async (params: PublishCommandInput) => {
  const result = await tracedSNSClient.send(new PublishCommand(params));
  return result;
};
