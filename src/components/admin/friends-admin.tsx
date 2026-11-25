import {
  addFriend,
  deleteFriend,
  updateFriend,
} from "@/app/(site)/(apps)/admin/actions";
import { listFriendsForAdmin } from "@/lib/friends-server";
import type { FriendLink } from "@/lib/friends-core";

const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground";
const fieldClass =
  "mt-1.5 h-9 w-full min-w-0 rounded-none border border-rule bg-transparent px-2.5 font-mono text-[13px] outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring";
const textareaClass =
  "mt-1.5 w-full min-w-0 rounded-none border border-rule bg-transparent px-2.5 py-2 font-mono text-[13px] outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring";
const submitClass =
  "rounded-none border border-data px-3 py-1.5 font-mono text-[11px] text-data transition-colors hover:text-foreground";

function FriendFields({
  idPrefix,
  friend,
}: {
  idPrefix: string;
  friend?: FriendLink;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor={`${idPrefix}-name`} className={labelClass}>
          站点名
        </label>
        <input
          id={`${idPrefix}-name`}
          name="name"
          type="text"
          required
          maxLength={40}
          defaultValue={friend?.name}
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-url`} className={labelClass}>
          链接
        </label>
        <input
          id={`${idPrefix}-url`}
          name="url"
          type="url"
          required
          maxLength={500}
          defaultValue={friend?.url}
          placeholder="https://…"
          className={fieldClass}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-description`} className={labelClass}>
          一句话介绍
        </label>
        <textarea
          id={`${idPrefix}-description`}
          name="description"
          rows={2}
          maxLength={160}
          defaultValue={friend?.description}
          className={textareaClass}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-avatar`} className={labelClass}>
          头像（可选）
        </label>
        <input
          id={`${idPrefix}-avatar`}
          name="avatar"
          type="text"
          maxLength={500}
          defaultValue={friend?.avatar ?? ""}
          placeholder="https://… 或 /images/friends/…"
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-tags`} className={labelClass}>
          标签（可选）
        </label>
        <input
          id={`${idPrefix}-tags`}
          name="tags"
          type="text"
          maxLength={60}
          defaultValue={friend?.tags.join(", ")}
          placeholder="设计, 独立开发"
          className={fieldClass}
        />
      </div>
    </div>
  );
}

/**
 * 审核后台的友链管理：添加、编辑、删除都在这里。
 * 数据直连数据库，不走公开页缓存；写入后由 Action 触发 updateTag("friends")。
 */
export async function FriendsAdmin() {
  const { available, friends } = await listFriendsForAdmin();

  return (
    <section className="mt-10" data-reveal>
      <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        友链
      </h2>

      {!available ? (
        <div className="mt-3 border-y border-rule py-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-wait">
            Not Available
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            友链暂时读不到。数据库现在连不上，过一会儿再刷新。
          </p>
        </div>
      ) : (
        <>
          <form action={addFriend} className="mt-3 border-y border-rule py-4">
            <p className={labelClass}>添加一条</p>
            <div className="mt-3">
              <FriendFields idPrefix="friend-new" />
            </div>
            <button type="submit" className={`mt-3 ${submitClass}`}>
              添加友链
            </button>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">
              保存后首页和友链页立即更新。
            </p>
          </form>

          {friends.length === 0 ? (
            <p className="mt-3 border-y border-rule py-6 text-[14px] leading-relaxed text-muted-foreground">
              还没有友链。
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-rule border-y border-rule">
              {friends.map((friend) => (
                <li key={friend.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <a
                        href={friend.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="link-underline break-words text-[15px]"
                      >
                        {friend.name} ↗
                      </a>
                      <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                        {friend.url}
                      </p>
                      {friend.description && (
                        <p className="mt-2 break-words text-[13px] leading-relaxed text-muted-foreground">
                          {friend.description}
                        </p>
                      )}
                      {friend.tags.length > 0 && (
                        <p className="mt-2 font-mono text-[10px] text-data">
                          {friend.tags.join(" · ")}
                        </p>
                      )}
                    </div>
                    <form action={deleteFriend}>
                      <input type="hidden" name="id" value={friend.id} />
                      <button
                        type="submit"
                        className="rounded-none border border-rule px-3 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-alert hover:text-alert"
                      >
                        删除
                      </button>
                    </form>
                  </div>

                  <details className="mt-2">
                    <summary className="cursor-pointer font-mono text-[11px] text-data">
                      编辑
                    </summary>
                    <form action={updateFriend} className="mt-3">
                      <input type="hidden" name="id" value={friend.id} />
                      <FriendFields
                        idPrefix={`friend-${friend.id}`}
                        friend={friend}
                      />
                      <button type="submit" className={`mt-3 ${submitClass}`}>
                        保存修改
                      </button>
                    </form>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}