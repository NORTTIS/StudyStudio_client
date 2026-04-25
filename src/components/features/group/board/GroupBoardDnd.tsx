"use client";

import {
    DndContext,
    DragOverlay,
    type CollisionDetection,
    type DragCancelEvent,
    type DragEndEvent,
    type DragMoveEvent,
    type DragOverEvent,
    type DragStartEvent
} from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import * as React from "react";

type GroupBoardDndProps = {
    mounted: boolean;
    sensors: React.ComponentProps<typeof DndContext>["sensors"];
    collisionDetection: CollisionDetection;
    columnIds: string[];
    boardScrollRef: React.RefObject<HTMLDivElement | null>;
    boardScrollClassName: string;
    onBoardScroll: React.UIEventHandler<HTMLDivElement>;
    onBoardPointerDown: React.PointerEventHandler<HTMLDivElement>;
    onBoardPointerMove: React.PointerEventHandler<HTMLDivElement>;
    onBoardPointerUp: React.PointerEventHandler<HTMLDivElement>;
    onBoardPointerCancel: React.PointerEventHandler<HTMLDivElement>;
    onDragStart: (event: DragStartEvent) => void;
    onDragMove: (event: DragMoveEvent) => void;
    onDragOver: (event: DragOverEvent) => void;
    onDragCancel: (event: DragCancelEvent) => void;
    onDragEnd: (event: DragEndEvent) => void;
    staticContent: React.ReactNode;
    sortableContent: React.ReactNode;
    overlayContent: React.ReactNode;
};

export default function GroupBoardDnd({
    mounted,
    sensors,
    collisionDetection,
    columnIds,
    boardScrollRef,
    boardScrollClassName,
    onBoardScroll,
    onBoardPointerDown,
    onBoardPointerMove,
    onBoardPointerUp,
    onBoardPointerCancel,
    onDragStart,
    onDragMove,
    onDragOver,
    onDragCancel,
    onDragEnd,
    staticContent,
    sortableContent,
    overlayContent
}: GroupBoardDndProps) {
    const boardScrollProps = {
        ref: boardScrollRef,
        onScroll: onBoardScroll,
        onPointerDown: onBoardPointerDown,
        onPointerMove: onBoardPointerMove,
        onPointerUp: onBoardPointerUp,
        onPointerCancel: onBoardPointerCancel,
        className: boardScrollClassName
    };

    if (!mounted) {
        return <div {...boardScrollProps}>{staticContent}</div>;
    }

    return (
        <DndContext
            sensors={sensors}
            autoScroll={false}
            collisionDetection={collisionDetection}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragOver={onDragOver}
            onDragCancel={onDragCancel}
            onDragEnd={onDragEnd}>
            <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                <div {...boardScrollProps}>{sortableContent}</div>
            </SortableContext>

            <DragOverlay>{overlayContent}</DragOverlay>
        </DndContext>
    );
}
