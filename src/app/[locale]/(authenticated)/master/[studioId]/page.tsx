"use client";

import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { deleteStudio, getStudioById, type StudioUI } from "@/api/studios";
import { getUserProfile, type UserProfile } from "@/api/user-profile";
import { DeleteConfirmModal } from "@/components/features/master/DeleteConfirmModal";
import { StudioModal } from "@/components/features/master/StudioModal";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function StudioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("MasterPage");
  const locale = useLocale();
  const { toast } = useToast();

  const studioId = params.studioId as string;
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [studio, setStudio] = useState<StudioUI | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const profileResult = await getUserProfile(locale);
      if (profileResult.status === "success" && profileResult.data) {
        setUserProfile(profileResult.data);
      }

      const studioResult = await getStudioById(studioId, locale);
      if (studioResult.status === "success" && studioResult.data) {
        setStudio(studioResult.data);
      }
    } catch (error) {
      console.error("Load data failed:", error);
      toast({ title: t("error"), description: t("loadError"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studioId, locale]);

  const handleEditStudio = async (_data: { name: string; description: string; type: string }) => {
    toast({ title: t("modal.editSuccess") });
    setIsEditModalOpen(false);
    loadData();
  };

  const handleDeleteStudio = async () => {
    if (!studio) return;

    try {
      const result = await deleteStudio(studio.id, locale);

      if (result.status === "success") {
        toast({ title: t("deleteModal.success") });
        router.push(`/${locale}/master`);
      } else {
        toast({ title: t("error"), description: t("deleteModal.error"), variant: "destructive" });
      }
    } catch (error) {
      console.error("Delete studio failed:", error);
      toast({ title: t("error"), description: t("deleteModal.error"), variant: "destructive" });
    }
  };

  const getStudioIcon = (type: string) => (type === "personal" ? "🔷" : "🔶");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F8F8]">
        <div className="flex min-h-screen">
          <DashboardSidebar />
          <main className="flex-1 px-6 py-6 lg:px-8">
            <Header userProfile={userProfile} />
            <div className="mt-6 flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#FF5F3D]" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="min-h-screen bg-[#F8F8F8]">
        <div className="flex min-h-screen">
          <DashboardSidebar />
          <main className="flex-1 px-6 py-6 lg:px-8">
            <Header userProfile={userProfile} />
            <div className="mt-6">
              <p className="text-center text-[#6F6B99]">{t("error")}</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-[#261E33]">
      <div className="flex min-h-screen">
        <DashboardSidebar />
        <main className="flex-1 px-6 py-6 lg:px-8">
          <Header userProfile={userProfile} />
          <div className="mt-6">
            {/* Back button */}
            <Button
              variant="ghost"
              onClick={() => router.push(`/${locale}/master`)}
              className="mb-4 text-[#6F6B99] hover:text-[#261E33]">
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t("backToList")}
            </Button>

            {/* Studio Header */}
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 text-3xl">
                    {getStudioIcon(studio.type)}
                  </div>
                  <div>
                    <div className="mb-2 flex items-center gap-3">
                      <h1 className="font-bold text-3xl text-[#261E33]">{studio.name}</h1>
                      <span className="rounded-full bg-[#FF5F3D] px-3 py-1 text-sm text-white">
                        {studio.type === "personal" ? t("personal") : t("group")}
                      </span>
                    </div>
                    <p className="text-[#6F6B99]">{studio.description}</p>
                  </div>
                </div>

                {/* Three dots menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="rounded-lg p-2 text-[#6F6B99] transition-colors hover:bg-gray-100 hover:text-[#261E33]">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                  </button>

                  {isMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                      <div className="absolute top-full right-0 z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsEditModalOpen(true);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-[#261E33] transition-colors hover:bg-gray-50">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          {t("detailModal.edit")}
                        </button>
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsDeleteModalOpen(true);
                          }}
                          className="flex w-full items-center gap-3 border-gray-100 border-t px-4 py-3 text-left text-red-600 transition-colors hover:bg-red-50">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          {t("detailModal.delete")}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-[#6F6B99]">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span className="font-medium">{t("detailModal.members")}</span>
                </div>
                <p className="font-bold text-3xl text-[#261E33]">{studio.memberCount}</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-[#6F6B99]">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="font-medium">{t("detailModal.videos")}</span>
                </div>
                <p className="font-bold text-3xl text-[#261E33]">{studio.videoCount}</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-[#6F6B99]">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="font-medium">{t("detailModal.created")}</span>
                </div>
                <p className="text-[#261E33]">{new Date(studio.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Groups section - placeholder */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-bold text-[#261E33] text-xl">{t("groupsTitle")}</h2>
              <p className="py-8 text-center text-[#6F6B99]">{t("noGroups")}</p>
            </div>
          </div>
        </main>
      </div>

      <StudioModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditStudio}
        studio={studio}
        mode="edit"
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteStudio}
        studioName={studio?.name || ""}
      />
    </div>
  );
}
