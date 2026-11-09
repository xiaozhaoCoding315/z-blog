import { sessionSecret } from "@/lib/auth";
import { mailConfig } from "@/lib/mailer";

/**
 * 登录是否可用：签发会话要密钥，发信要 SMTP，缺一不可。
 * 页面据此决定显示表单还是「暂未开放」，不靠客户端猜。
 */
export function loginReady(): boolean {
  return Boolean(sessionSecret()) && mailConfig().enabled;
}
