/**
 * 图片上限。单独一个文件、零 import，因为 `"use client"` 组件要读它——
 * 带 `node:` 内置模块的 upload-core.ts 一旦被客户端引用就会打包失败。
 */

/** 单张上限 2MB（压缩之后仍然超标就拒绝，不偷偷降质量） */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
/** 头像在浏览器端裁成 512×512 WebP，服务端再设一道 512KB 硬闸 */
export const MAX_AVATAR_BYTES = 512 * 1024;
/** 一条动态最多 9 张 */
export const MAX_IMAGES_PER_MOMENT = 9;
