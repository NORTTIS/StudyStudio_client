"use client";

import * as React from "react";
import { hexToGradient } from "@/lib/utils";

type GroupBannerBackgroundProps = {
    bannerUrl: string | null;
    colorHex: string | null;
};

export function GroupBannerBackground({ bannerUrl, colorHex }: GroupBannerBackgroundProps) {
    if (bannerUrl) {
        return (
            <>
                <div
                    className="pointer-events-none absolute inset-0 z-0"
                    style={{
                        backgroundImage: `url(${bannerUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat"
                    }}
                />
                <div className="pointer-events-none absolute inset-0 z-0 bg-black/10" />
            </>
        );
    }

    if (colorHex) {
        return (
            <div
                className="pointer-events-none absolute inset-0 z-0"
                style={{ background: hexToGradient(colorHex) }}
            />
        );
    }

    return (
        <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{ background: hexToGradient("#FF5F3D") }}
        />
    );
}
