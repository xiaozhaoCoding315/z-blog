import nodemailer from "nodemailer";
import { siteConfig } from "@/config/site";

/**
 * 登录验证码的发信口。
 *
 * 只走 QQ 邮箱的 SMTP（465 / SSL，站长已验证服务器到它可通）。
 * 没配 SMTP_USER / SMTP_PASS 时 `enabled` 为假：登录整体关闭，
 * 页面显示「暂未开放」，浏览不受影响（设计文档 §7.3）。
 */
export function mailConfig() {
  const user = process.env.SMTP_USER ?? "";
  const pass = process.env.SMTP_PASS ?? "";
  const host = process.env.SMTP_HOST ?? "smtp.qq.com";
  const port = Number(process.env.SMTP_PORT ?? 465);
  return { user, pass, host, port, enabled: Boolean(user && pass) };
}

export async function sendLoginCode(
  to: string,
  code: string
): Promise<boolean> {
  const cfg = mailConfig();
  if (!cfg.enabled) return false;

  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 12_000,
  });

  try {
    await transport.sendMail({
      from: `"${siteConfig.name}" <${cfg.user}>`,
      to,
      subject: `登录验证码 ${code}`,
      text: [
        `你的验证码是 ${code}，10 分钟内有效。`,
        "",
        "如果不是你本人操作，忽略这封邮件即可，什么都不会发生。",
        "收不到的话先翻一下垃圾箱——自动发的信常被扔进去。",
      ].join("\n"),
    });
    return true;
  } catch (err) {
    console.error("[mail] 验证码发送失败：", err);
    return false;
  } finally {
    transport.close();
  }
}
