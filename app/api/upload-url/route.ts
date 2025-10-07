import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import crypto from "crypto";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const generateFileName = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");

export async function POST(request: Request) {
  try {
    // 检查环境变量
    if (!process.env.CLOUDFLARE_ACCOUNT_ID || 
        !process.env.R2_ACCESS_KEY_ID || 
        !process.env.R2_SECRET_ACCESS_KEY || 
        !process.env.R2_BUCKET_NAME || 
        !process.env.NEXT_PUBLIC_R2_PUBLIC_URL) {
      console.error("缺少必要的 R2 环境变量");
      return NextResponse.json(
        { error: "服务器配置错误 - 缺少 R2 存储配置" }, 
        { status: 500 }
      );
    }

    const { fileType } = await request.json().catch(err => {
      console.error("解析请求 JSON 失败:", err);
      return {};
    });
    
    if (!fileType) {
      console.error("缺少文件类型");
      return NextResponse.json({ error: "文件类型是必须的" }, { status: 400 });
    }

    console.log(`生成上传URL，文件类型: ${fileType}`);
    
    const fileName = generateFileName();
    const signedUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: fileName,
        ContentType: fileType,
      }),
      { expiresIn: 300 } // URL 有效期延长到 5 分钟
    );

    const imageUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${fileName}`;
    console.log(`生成的图片URL: ${imageUrl}`);

    return NextResponse.json({ signedUrl, imageUrl });
  } catch (error: any) {
    console.error("创建预签名 URL 失败:", error);
    return NextResponse.json({ 
      error: `创建预签名 URL 失败: ${error.message || "未知错误"}` 
    }, { status: 500 });
  }
}
