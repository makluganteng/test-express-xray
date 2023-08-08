import { Router, Request, Response } from "express";
import * as AWSXRay from "aws-xray-sdk";
import multer from "multer";
import { logger } from "../../services/logger";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PublishCommandInput } from "@aws-sdk/client-sns";
import { publishMessage } from "../../services/sns";

AWSXRay.captureHTTPsGlobal(require("http"));
AWSXRay.captureHTTPsGlobal(require("https"));
AWSXRay.capturePromise();

export const createGiftRouter = () => {
  const router = Router();
  router.use(AWSXRay.express.openSegment("GiftCardAPI-Xray"));

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 1024 * 1024 * 10, // 10 MB (adjust the size limit as needed)
    },
  });

  router.post(
    "/createGift",
    // createSubsegment("upload"),
    upload.array("image", 2),
    async (req: Request, res: Response) => {
      let segment = AWSXRay.getSegment();

      if (!segment) {
        logger.error("No parent segment found for /createGift");
        return res
          .status(500)
          .send({ status: "error", message: "Internal server error" });
      }

      const uploadVoucherSubsegment =
        segment.addNewSubsegment("Upload Voucher");
      try {
        logger.info("is the parent traced ? : ==========", segment?.notTraced);

        // try {
        logger.info("Uploaded image:", req.body);
        logger.info("============================");
        const file = req.files as Express.Multer.File[];

        if (!file) {
          return res.status(400).send({
            headers: {
              "Access-Control-Allow-Origin": "*",
            },
            status: "error",
            message: "No file uploaded",
          });
        }

        const { category, voucherName, voucherPrice } = req.body;

        if (segment) {
          segment.addAnnotation("voucherName", voucherName);
          segment.addMetadata("voucherPrice", voucherPrice);
          segment.addMetadata("fileCount", file.length);
        }

        const s3Segment =
          uploadVoucherSubsegment.addNewSubsegment("Upload to S3");
        // Insert the file data into S3 (you should implement the insertS3 function)
        const s3 = AWSXRay.captureAWSv3Client(
          new S3Client({ region: "us-east-1" }),
          segment
        );
        const data = file;
        logger.info("Uploading image to S3...");
        try {
          let resultArr = [];
          for (const imageFile of file) {
            const uploadParams = {
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: `images/${imageFile.originalname}`,
              Body: imageFile.buffer,
              ContentType: imageFile.mimetype,
              ACL: "public-read",
            };
            try {
              await s3.send(new PutObjectCommand(uploadParams));
              logger.info("Image uploaded successfully. S3 Object URL:");
            } catch (e) {
              logger.error("Error uploading image to S3:", e);
              throw new Error("Error uploading image to S3");
            } finally {
              // Close the subsegment once the S3 operation is complete
            }
          }
        } catch (e) {
          logger.error("Error uploading image to S3:", e);
          throw new Error("Error uploading image to S3");
        } finally {
          s3Segment.close();
        }

        const input: PublishCommandInput = {
          Message: `A new voucher has been added to this ${category} category, check it now before it is sold out :3`,
          TopicArn: process.env.AWS_SNS_ARN,
        };

        const snsSegment =
          uploadVoucherSubsegment.addNewSubsegment("SNS Broadcast");

        const brodcastSuccess = await publishMessage(input);

        snsSegment.close();

        logger.info("Broadcast Success:", brodcastSuccess);

        if (uploadVoucherSubsegment.notTraced === true) {
          return res.status(500).send({
            headers: {
              "Access-Control-Allow-Origin": "*",
            },
            status: "error",
            message: "Not Traced",
          });
        }

        return res.status(200).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "success",
          broadcasted: segment,
        });
      } catch (e) {
        logger.error("Error uploading image:", e);
        return res.status(500).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Internal server error",
        });
      } finally {
        uploadVoucherSubsegment.close();
        segment.close();
      }
    }
    // closeSubsegment
  );

  router.use(AWSXRay.express.closeSegment());
  return router;
};
