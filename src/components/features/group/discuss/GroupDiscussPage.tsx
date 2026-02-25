"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { twMerge } from "tailwind-merge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    Heart,
    MessageCircle,
    MoreHorizontal,
    SendHorizonal,
    Trash2,
    CornerDownRight,
    ChevronDown,
    ChevronUp
} from "lucide-react";

type UserLite = {
    id: string;
    name: string;
    initials: string;
};

type ReplyItem = {
    id: string;
    author: UserLite;
    content: string;
    createdAtText: string;
};

type PostItem = {
    id: string;
    author: UserLite;
    content: string;
    createdAtText: string;
    likeCount: number;
    likedByMe: boolean;
    replies: ReplyItem[];
};

const stripLocale = (p: string) => p.replace(/^\/[a-z]{2}(?=\/)/i, "");
const extractGroupIdFromPath = (pathname: string) => {
    const p = stripLocale(pathname || "");
    const m = p.match(/^\/group\/([^/]+)/i);
    return m?.[1] || "";
};

function initialsOf(name: string) {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "U";
    const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (a + b).toUpperCase();
}

function timeAgoText(date: Date) {
    const diff = Math.max(0, Date.now() - date.getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Vừa xong";
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    const days = Math.floor(hrs / 24);
    return `${days} ngày trước`;
}

function Avatar({ initials }: { initials: string }) {
    return (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-xs font-semibold text-[#261E33] ring-1 ring-black/5">
            {initials}
        </div>
    );
}

function IconCount({
    active,
    icon: Icon,
    count,
    label,
    onClick
}: {
    active?: boolean;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    label: string;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={twMerge(
                "inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium text-[#6F6B99] transition hover:bg-[#FAFAFA] hover:text-[#261E33]",
                active && "text-[#FF3B30]"
            )}
            aria-label={label}
        >
            <Icon className={twMerge("h-4 w-4", active && "fill-[#FF3B30]")} />
            {typeof count === "number" ? <span>{count}</span> : null}
        </button>
    );
}

function ReplyComposer({
    onCancel,
    onSubmit
}: {
    onCancel: () => void;
    onSubmit: (text: string) => void;
}) {
    const [text, setText] = React.useState("");

    return (
        <div className="mt-3 rounded-xl border border-[#EDEDED] bg-[#FCFCFD] p-3">
            <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Viết phản hồi..."
                className="min-h-[80px] resize-none border-[#EDEDED] bg-white"
            />
            <div className="mt-3 flex items-center justify-end gap-2">
                <Button variant="outline" onClick={onCancel} className="rounded-xl">
                    Hủy
                </Button>
                <Button
                    onClick={() => {
                        const v = text.trim();
                        if (!v) return;
                        onSubmit(v);
                        setText("");
                    }}
                    className="rounded-xl bg-[#FF5722] text-white hover:bg-[#e24d1e]"
                >
                    <SendHorizonal className="mr-2 h-4 w-4" />
                    Trả lời
                </Button>
            </div>
        </div>
    );
}

function ReplyItemView({ r }: { r: ReplyItem }) {
    return (
        <div className="flex gap-3">
            <Avatar initials={r.author.initials} />
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-sm font-semibold text-[#261E33]">{r.author.name}</p>
                    <span className="text-xs text-[#9CA3AF]">• {r.createdAtText}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[#261E33]">{r.content}</p>
            </div>
        </div>
    );
}

function PostCard({
    post,
    onToggleLike,
    onDelete,
    onAddReply
}: {
    post: PostItem;
    onToggleLike: (id: string) => void;
    onDelete: (id: string) => void;
    onAddReply: (postId: string, text: string) => void;
}) {
    const [replyOpen, setReplyOpen] = React.useState(false);
    const [repliesOpen, setRepliesOpen] = React.useState(true);

    return (
        <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
                <Avatar initials={post.author.initials} />

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <p className="truncate text-sm font-semibold text-[#261E33]">
                                    {post.author.name}
                                </p>
                                <span className="text-xs text-[#9CA3AF]">• {post.createdAtText}</span>
                            </div>

                            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-[#261E33]">
                                {post.content}
                            </p>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="rounded-lg p-2 text-[#6F6B99] transition hover:bg-[#FAFAFA] hover:text-[#261E33]"
                                    aria-label="Thêm"
                                >
                                    <MoreHorizontal className="h-5 w-5" />
                                </button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => onDelete(post.id)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Xóa
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setReplyOpen(true)}>
                                    <CornerDownRight className="mr-2 h-4 w-4" />
                                    Trả lời
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <IconCount
                            label="Thích"
                            icon={Heart}
                            active={post.likedByMe}
                            count={post.likeCount}
                            onClick={() => onToggleLike(post.id)}
                        />
                        <IconCount
                            label="Trả lời"
                            icon={MessageCircle}
                            count={post.replies.length}
                            onClick={() => setReplyOpen((v) => !v)}
                        />

                        {post.replies.length > 0 ? (
                            <button
                                type="button"
                                onClick={() => setRepliesOpen((v) => !v)}
                                className="ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#6F6B99] transition hover:bg-[#FAFAFA] hover:text-[#261E33]"
                            >
                                {repliesOpen ? (
                                    <>
                                        <ChevronUp className="h-4 w-4" /> Ẩn phản hồi
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="h-4 w-4" /> Hiện phản hồi
                                    </>
                                )}
                            </button>
                        ) : null}
                    </div>

                    {post.replies.length > 0 && repliesOpen ? (
                        <div className="mt-4 space-y-4 border-l-2 border-[#F1F1F1] pl-4">
                            {post.replies.map((r) => (
                                <ReplyItemView key={r.id} r={r} />
                            ))}
                        </div>
                    ) : null}

                    {replyOpen ? (
                        <ReplyComposer
                            onCancel={() => setReplyOpen(false)}
                            onSubmit={(text) => {
                                onAddReply(post.id, text);
                                setReplyOpen(false);
                                setRepliesOpen(true);
                            }}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
}

export default function GroupDiscussPage() {
    const pathname = usePathname();
    const groupId = extractGroupIdFromPath(pathname || "");

    const me: UserLite = React.useMemo(
        () => ({ id: "me", name: "Đạt", initials: initialsOf("Đạt") }),
        []
    );

    const [composerText, setComposerText] = React.useState("");

    const [posts, setPosts] = React.useState<PostItem[]>([
        {
            id: "p1",
            author: { id: "u1", name: "NH", initials: "NH" },
            createdAtText: "2 giờ trước",
            content: "Mình đã hoàn thành schema database, mọi người review giúp nhé!",
            likeCount: 2,
            likedByMe: false,
            replies: [
                {
                    id: "r1",
                    author: { id: "u2", name: "Đạt", initials: initialsOf("Đạt") },
                    createdAtText: "1 giờ trước",
                    content: "Ok bạn! Tối nay mình review."
                }
            ]
        },
        {
            id: "p2",
            author: { id: "u2", name: "Đạt", initials: initialsOf("Đạt") },
            createdAtText: "2 giờ trước",
            content: "Mình đã hoàn thành schema database, mọi người review giúp nhé!",
            likeCount: 0,
            likedByMe: true,
            replies: []
        }
    ]);

    const onPost = () => {
        const v = composerText.trim();
        if (!v) return;

        const item: PostItem = {
            id: String(Date.now()),
            author: me,
            createdAtText: timeAgoText(new Date()),
            content: v,
            likeCount: 0,
            likedByMe: false,
            replies: []
        };

        setPosts((prev) => [item, ...prev]);
        setComposerText("");
    };

    const onToggleLike = (id: string) => {
        setPosts((prev) =>
            prev.map((p) => {
                if (p.id !== id) return p;
                const liked = !p.likedByMe;
                const nextCount = Math.max(0, p.likeCount + (liked ? 1 : -1));
                return { ...p, likedByMe: liked, likeCount: nextCount };
            })
        );
    };

    const onDelete = (id: string) => {
        const ok = window.confirm("Bạn có muốn xóa bài viết này không?");
        if (!ok) return;
        setPosts((prev) => prev.filter((p) => p.id !== id));
    };

    const onAddReply = (postId: string, text: string) => {
        const reply: ReplyItem = {
            id: String(Date.now()) + "_r",
            author: me,
            createdAtText: timeAgoText(new Date()),
            content: text
        };

        setPosts((prev) =>
            prev.map((p) => (p.id === postId ? { ...p, replies: [...p.replies, reply] } : p))
        );
    };

    return (
        <div className="w-full">
            <div className="mx-auto w-full max-w-6xl px-6 py-8">
                <div className="mb-5">
                    <p className="text-sm font-semibold text-[#261E33]">Thảo luận nhóm</p>
                    <p className="mt-1 text-sm text-[#6F6B99]">Chia sẻ cập nhật, ý tưởng và trao đổi</p>
                </div>

                <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 shadow-sm">
                    <div className="flex gap-3">
                        <Avatar initials={me.initials} />
                        <div className="min-w-0 flex-1">
                            <Textarea
                                value={composerText}
                                onChange={(e) => setComposerText(e.target.value)}
                                placeholder="Viết gì đó để chia sẻ với mọi người..."
                                className="min-h-[110px] resize-none border-[#EDEDED] bg-white"
                            />
                            <div className="mt-3 flex items-center justify-end">
                                <Button
                                    onClick={onPost}
                                    className="rounded-xl bg-[#FF5722] px-6 text-white hover:bg-[#e24d1e]"
                                >
                                    <SendHorizonal className="mr-2 h-4 w-4" />
                                    Đăng
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 space-y-4">
                    {posts.map((p) => (
                        <PostCard
                            key={p.id}
                            post={p}
                            onToggleLike={onToggleLike}
                            onDelete={onDelete}
                            onAddReply={onAddReply}
                        />
                    ))}
                </div>

                <div className="h-10" />
            </div>
        </div>
    );
}