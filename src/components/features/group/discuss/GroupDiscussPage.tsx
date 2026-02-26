"use client";

import * as signalR from "@microsoft/signalr";
import {
    ChevronDown,
    ChevronUp,
    CornerDownRight,
    Heart,
    MessageCircle,
    MoreHorizontal,
    SendHorizontal,
    Trash2
} from "lucide-react";
import { usePathname } from "next/navigation";
import * as React from "react";
import { twMerge } from "tailwind-merge";
import { apiFetch } from "@/api/api-client";
import { getAccessToken, getUserData } from "@/api/auth";
import type { components } from "@/api/types";
import { Container } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

type UserLite = {
    id: string;
    name: string;
    initials: string;
};

type GroupMessageDto = components["schemas"]["GroupMessageDto"];
type GroupMessageListResponse = components["schemas"]["GroupMessageListResponse"];
type UserDto = components["schemas"]["UserDto"];

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

type HubUserDto = UserDto;

type MessageDeletedPayload = {
    messageId: string;
    groupId: string;
    deletedBy: string;
    replyCount: number;
    timestamp: string;
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

function normalizeBaseUrl(raw: string) {
    return raw.replace(/\/+$/, "").replace(/\/api$/i, "");
}

function buildHubUrl() {
    const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";
    const base = normalizeBaseUrl(rawBase);
    return base ? `${base}/hubs/group-discuss` : "";
}

function dtoToUserLite(userId?: string, user?: HubUserDto | null): UserLite {
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "Ẩn danh";
    return {
        id: user?.id || userId || "unknown-user",
        name,
        initials: initialsOf(name)
    };
}

function dtoToReplyItem(dto: GroupMessageDto): ReplyItem | null {
    if (!dto.messageId) {
        return null;
    }

    if (!dto.content) {
        return null;
    }

    if (!dto.createdAt) {
        return null;
    }

    return {
        id: dto.messageId,
        author: dtoToUserLite(dto.userId, dto.user),
        content: dto.content,
        createdAtText: timeAgoText(new Date(dto.createdAt))
    };
}

function dtoToPostItem(dto: GroupMessageDto): PostItem | null {
    if (!dto.messageId) {
        return null;
    }

    if (!dto.content) {
        return null;
    }

    if (!dto.createdAt) {
        return null;
    }

    return {
        id: dto.messageId,
        author: dtoToUserLite(dto.userId, dto.user),
        content: dto.content,
        createdAtText: timeAgoText(new Date(dto.createdAt)),
        likeCount: 0,
        likedByMe: false,
        replies: (dto.replies || []).map(dtoToReplyItem).filter((reply): reply is ReplyItem => reply !== null)
    };
}

function upsertPost(prev: PostItem[], next: PostItem) {
    const existed = prev.some((p) => p.id === next.id);
    if (!existed) {
        return [next, ...prev];
    }
    return prev.map((p) => (p.id === next.id ? { ...p, ...next } : p));
}

function mergeReply(post: PostItem, nextReply: ReplyItem) {
    const replyExists = post.replies.some((r) => r.id === nextReply.id);
    const nextReplies = replyExists
        ? post.replies.map((r) => (r.id === nextReply.id ? nextReply : r))
        : [...post.replies, nextReply];

    return {
        ...post,
        replies: nextReplies
    };
}

function buildPostsFromMessages(messages?: GroupMessageDto[] | null) {
    const source = messages || [];
    const postMap = new Map<string, PostItem>();

    for (const message of source) {
        if (message.parentMessageId) {
            continue;
        }

        const post = dtoToPostItem(message);
        if (!post) {
            continue;
        }

        postMap.set(post.id, post);
    }

    for (const message of source) {
        if (!message.parentMessageId) {
            continue;
        }

        const parent = postMap.get(message.parentMessageId);
        if (!parent) {
            continue;
        }

        const reply = dtoToReplyItem(message);
        if (!reply) {
            continue;
        }

        postMap.set(parent.id, mergeReply(parent, reply));
    }

    return [...postMap.values()];
}

function Avatar({ initials }: { initials: string }) {
    return (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] font-semibold text-[#261E33] text-xs ring-1 ring-black/5">
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
                "inline-flex items-center gap-2 rounded-lg px-2 py-1 font-medium text-[#6F6B99] text-xs transition hover:bg-[#FAFAFA] hover:text-[#261E33]",
                active && "text-[#FF3B30]"
            )}
            aria-label={label}>
            <Icon className={twMerge("h-4 w-4", active && "fill-[#FF3B30]")} />
            {typeof count === "number" ? <span>{count}</span> : null}
        </button>
    );
}

function ReplyComposer({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (text: string) => void }) {
    const [text, setText] = React.useState("");

    return (
        <div className="mt-3 rounded-xl border border-[#EDEDED] bg-[#FCFCFD] p-3">
            <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Viết phản hồi..."
                className="min-h-20 resize-none border-[#EDEDED] bg-white"
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
                    className="rounded-xl bg-[#FF5722] text-white hover:bg-[#e24d1e]">
                    <SendHorizontal className="mr-2 h-4 w-4" />
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
                    <p className="font-semibold text-[#261E33] text-sm">{r.author.name}</p>
                    <span className="text-[#9CA3AF] text-xs">• {r.createdAtText}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[#261E33] text-sm">{r.content}</p>
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
                                <p className="truncate font-semibold text-[#261E33] text-sm">{post.author.name}</p>
                                <span className="text-[#9CA3AF] text-xs">• {post.createdAtText}</span>
                            </div>

                            <p className="mt-2 whitespace-pre-wrap text-[#261E33] text-[15px] leading-relaxed">
                                {post.content}
                            </p>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="rounded-lg p-2 text-[#6F6B99] transition hover:bg-[#FAFAFA] hover:text-[#261E33]"
                                    aria-label="Thêm">
                                    <MoreHorizontal className="h-5 w-5" />
                                </button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => onDelete(post.id)}>
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
                                className="ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-[#6F6B99] text-xs transition hover:bg-[#FAFAFA] hover:text-[#261E33]">
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
                        <div className="mt-4 space-y-4 border-[#F1F1F1] border-l-2 pl-4">
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
    const hubUrl = React.useMemo(() => buildHubUrl(), []);
    const connectionRef = React.useRef<signalR.HubConnection | null>(null);
    const [isConnected, setIsConnected] = React.useState(false);

    const me: UserLite = React.useMemo(() => {
        const user = getUserData();
        const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "Bạn";
        return {
            id: user?.id || "me",
            name: fullName,
            initials: initialsOf(fullName)
        };
    }, []);

    const [composerText, setComposerText] = React.useState("");
    const isComposerDisabled = !isConnected || composerText.trim().length === 0;

    const [posts, setPosts] = React.useState<PostItem[]>([]);

    React.useEffect(() => {
        let isDisposed = false;

        if (!groupId) {
            return;
        }

        if (!hubUrl) {
            toast({
                variant: "destructive",
                description: "Không tìm thấy biến môi trường NEXT_PUBLIC_API_BASE_URL hoặc NEXT_PUBLIC_API_URL"
            });
            return;
        }

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                accessTokenFactory: () => getAccessToken() || ""
            })
            .withAutomaticReconnect([0, 2000, 10000, 30000])
            .build();

        connectionRef.current = connection;

        const loadHistory = async () => {
            const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";
            if (!rawBase) {
                return;
            }

            const response = await apiFetch<GroupMessageListResponse>(`${rawBase}/group-messages/${groupId}`, {
                method: "GET"
            });

            if (response.status !== "success" || !response.data) {
                return;
            }

            setPosts(buildPostsFromMessages(response.data.messages));
        };

        connection.on("ReceiveMessage", (message: GroupMessageDto) => {
            if (message.parentMessageId) {
                return;
            }

            const nextPost = dtoToPostItem(message);
            if (!nextPost) {
                return;
            }

            setPosts((prev) => upsertPost(prev, nextPost));
        });

        connection.on("MessageReplied", (reply: GroupMessageDto) => {
            if (!reply.parentMessageId) {
                return;
            }

            let parentExists = false;

            setPosts((prev) => {
                const nextReply = dtoToReplyItem(reply);
                if (!nextReply) {
                    return prev;
                }

                const nextPosts = prev.map((p) => {
                    if (p.id !== reply.parentMessageId) {
                        return p;
                    }

                    parentExists = true;
                    return mergeReply(p, nextReply);
                });

                return nextPosts;
            });

            if (!parentExists) {
                void loadHistory();
            }
        });

        connection.on("MessageDeleted", (data: MessageDeletedPayload) => {
            setPosts((prev) =>
                prev
                    .filter((p) => p.id !== data.messageId)
                    .map((p) => ({
                        ...p,
                        replies: p.replies.filter((r) => r.id !== data.messageId)
                    }))
            );
        });

        connection.on("Error", (errorMessage: string) => {
            if (isDisposed) {
                return;
            }

            toast({
                variant: "destructive",
                description: errorMessage
            });
        });

        connection.onreconnecting(() => {
            setIsConnected(false);
        });

        connection.onreconnected(async () => {
            if (isDisposed) {
                return;
            }

            setIsConnected(true);
            try {
                await connection.invoke("JoinGroup", groupId);
                await loadHistory();
            } catch {
                if (isDisposed) {
                    return;
                }

                toast({
                    variant: "destructive",
                    description: "Không thể tham gia lại phòng thảo luận"
                });
            }
        });

        connection.onclose(() => {
            setIsConnected(false);
        });

        const start = async () => {
            try {
                await connection.start();
                await connection.invoke("JoinGroup", groupId);
                if (isDisposed) {
                    return;
                }

                setIsConnected(true);
                await loadHistory();
            } catch {
                if (isDisposed) {
                    return;
                }

                setIsConnected(false);
                toast({
                    variant: "destructive",
                    description: "Vui lòng thử tải lại trang hoặc đăng nhập lại"
                });
            }
        };

        void start();

        return () => {
            isDisposed = true;

            const cleanup = async () => {
                try {
                    if (connection.state === signalR.HubConnectionState.Connected) {
                        await connection.invoke("LeaveGroup", groupId);
                    }
                } catch (error) {
                    void error;
                } finally {
                    await connection.stop();
                    if (connectionRef.current === connection) {
                        connectionRef.current = null;
                    }
                    setIsConnected(false);
                }
            };

            void cleanup();
        };
    }, [groupId, hubUrl]);

    const onPost = async () => {
        const v = composerText.trim();
        const connection = connectionRef.current;
        if (!v) {
            return;
        }

        if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
            return;
        }

        try {
            await connection.invoke("SendMessage", {
                groupId,
                content: v
            });
            setComposerText("");
        } catch {
            toast({
                variant: "destructive",
                description: "Vui lòng thử lại sau"
            });
        }
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

    const onDelete = async (id: string) => {
        const ok = window.confirm("Bạn có muốn xóa bài viết này không?");
        if (!ok) return;

        const connection = connectionRef.current;
        if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
            toast({
                variant: "destructive",
                description: "Không thể xóa bài viết khi chưa kết nối"
            });
            return;
        }

        try {
            await connection.invoke("DeleteMessage", {
                messageId: id
            });
        } catch {
            toast({
                variant: "destructive",
                description: "Vui lòng thử lại sau"
            });
        }
    };

    const onAddReply = async (postId: string, text: string) => {
        const connection = connectionRef.current;
        if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
            toast({
                variant: "destructive",
                description: "Không thể gửi phản hồi khi chưa kết nối"
            });
            return;
        }

        try {
            const payload = {
                groupId,
                parentMessageId: postId,
                content: text
            };

            try {
                await connection.invoke("ReplyToMessage", payload);
            } catch {
                await connection.invoke("SendMessage", payload);
            }
        } catch {
            toast({
                variant: "destructive",
                description: "Vui lòng thử lại sau"
            });
        }
    };

    return (
        <div className="w-full">
            <Container className="px-6">
                <div className="mb-5">
                    <p className="font-semibold text-[#261E33] text-sm">Thảo luận nhóm</p>
                    <p className="mt-1 text-[#6F6B99] text-sm">Chia sẻ cập nhật, ý tưởng và trao đổi</p>
                </div>

                <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 shadow-sm">
                    <div className="flex gap-3">
                        <Avatar initials={me.initials} />
                        <div className="min-w-0 flex-1">
                            <Textarea
                                value={composerText}
                                onChange={(e) => setComposerText(e.target.value)}
                                placeholder="Viết gì đó để chia sẻ với mọi người..."
                                className="min-h-27.5 resize-none border-[#EDEDED] bg-white"
                            />
                            <div className="mt-3 flex items-center justify-end">
                                <Button
                                    onClick={onPost}
                                    disabled={isComposerDisabled}
                                    className="rounded-xl bg-[#FF5722] px-6 text-white hover:bg-[#e24d1e]">
                                    <SendHorizontal className="mr-2 h-4 w-4" />
                                    Đăng
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 space-y-4">
                    {posts.length > 0 ? (
                        posts.map((p) => (
                            <PostCard
                                key={p.id}
                                post={p}
                                onToggleLike={onToggleLike}
                                onDelete={onDelete}
                                onAddReply={onAddReply}
                            />
                        ))
                    ) : (
                        <div className="rounded-2xl border border-[#EDEDED] bg-white p-10 text-center text-[#6F6B99] text-sm">
                            Chưa có thảo luận nào trong nhóm.
                        </div>
                    )}
                </div>

                <div className="h-10" />
            </Container>
        </div>
    );
}
