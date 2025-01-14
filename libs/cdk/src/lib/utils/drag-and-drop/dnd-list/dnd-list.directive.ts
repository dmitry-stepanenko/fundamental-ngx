import {
    AfterContentInit,
    ContentChildren,
    Directive,
    ElementRef,
    EventEmitter,
    forwardRef,
    HostBinding,
    Input,
    OnDestroy,
    Output,
    QueryList
} from '@angular/core';
import { merge, Subject } from 'rxjs';
import { startWith, takeUntil } from 'rxjs/operators';
import { ElementChord, FdDropEvent, LinkPosition, ElementPosition, DndItem, FdDndDropType } from '../dnd.interfaces';
import { DND_ITEM, DND_LIST } from '../tokens';

@Directive({
    selector: '[fdkDndList], [fd-dnd-list]',
    providers: [{ provide: DND_LIST, useExisting: forwardRef(() => DndListDirective) }]
})
export class DndListDirective<T> implements AfterContentInit, OnDestroy {
    /**
     * Defines if the element is allowed to be dragged in 2 dimensions,
     * When true - replace indicator will be displayed vertically
     */
    @Input()
    gridMode = false;

    /**
     * Defines drop strategy:
     * * `shift` mode will create line after closest drop element.
     * * `group` mode will create replace indicator on whole closest drop element.
     * * `auto` mode will create line after closest drop element,
     * if dragged element coordinates are shifted for 30% from center of the closest drop element.
     * Otherwise, it will create replace indicator on whole closest drop element.
     *
     * `shift` mode is the default.
     */
    @Input()
    dropMode: FdDndDropType = 'shift';

    /**
     * Threshold of dragged item over another item to define which type of `dropMode` should be used.
     */
    @Input()
    threshold = 0.3;

    /**
     * @deprecated
     * Use `dropMode` property for better configuration.
     *
     * @description
     * When enabled, replace indicator will appear on whole element, instead of horizontal/vertical line before/after element.
     */
    @Input()
    set replaceMode(value: boolean) {
        this._replaceMode = value;
        this.dropMode = value ? 'group' : 'shift';
        this._detectedDropMode = this.dropMode;
    }

    get replaceMode(): boolean {
        return this._replaceMode;
    }

    /** @hidden */
    private _replaceMode = false;

    /** Array of items, that will be sorted */
    @Input()
    items: Array<T>;

    /** Defines if drag and drop feature should be enabled for list items */
    @Input()
    set draggable(draggable: boolean) {
        this._draggable = draggable;
        this._changeDraggableState(draggable);
    }

    /** Event that is thrown, when items are reordered */
    @Output()
    readonly itemsChange = new EventEmitter<Array<T>>();

    /** Event that is thrown, when the item is dropped */
    @Output()
    readonly itemDropped = new EventEmitter<FdDropEvent<T>>();

    /** @hidden */
    @ContentChildren(DND_ITEM)
    dndItems: QueryList<DndItem>;

    /** @hidden */
    private _elementsCoordinates: ElementChord[];

    /** @hidden */
    private _closestItemIndex: number | null = null;

    /** @hidden */
    private _closestItemPosition: 'before' | 'after' | null = null;

    /** An RxJS Subject that will kill the current data stream (for unsubscribing)  */
    private readonly _refresh$ = new Subject<void>();

    /** @hidden */
    private readonly _onDestroy$ = new Subject<void>();

    /** @hidden  */
    private _dndItemReference: DndItem[];

    /** @hidden */
    private _draggable = true;

    /** @hidden */
    @HostBinding('class')
    private readonly _initialClass = 'fd-dnd-list';

    /** @hidden */
    private _detectedDropMode: 'shift' | 'group';

    /** @hidden */
    private _linesRemoved = true;

    /** @hidden */
    private _indicatorsRemoved = true;

    /** @hidden */
    ngAfterContentInit(): void {
        this._changeDraggableState(this._draggable);
        this.dndItems.changes.pipe(takeUntil(this._onDestroy$), startWith(0)).subscribe(() => this._refreshQueryList());
    }

    /** @hidden */
    ngOnDestroy(): void {
        this._onDestroy$.next();
        this._onDestroy$.complete();
    }

    /** Method called, when the item is being moved by 1 px */
    onMove(mousePosition: ElementPosition, draggedItemIndex: number): void {
        /** Temporary object, to store lowest distance values */
        let closestItemIndex: number | null = null;

        const closestItem = this._elementsCoordinates.find((element, index) => {
            /** Check if element can be replaced */
            if (!element.stickToPosition && closestItemIndex !== index) {
                const isMouseOnElement = _isMouseOnElement(element, mousePosition);
                if (isMouseOnElement) {
                    closestItemIndex = index;

                    return true;
                }
            }
            return false;
        });

        if (!closestItem) {
            closestItemIndex = null;
        }

        /** If the closest element is different from the old one, new one is picked. It prevents from performance issues */
        if (
            (closestItemIndex || closestItemIndex === 0) &&
            (closestItemIndex !== this._closestItemIndex || this.dropMode === 'auto')
        ) {
            this._removeAllLines();
            this._removeAllReplaceIndicators();
            this._closestItemIndex = closestItemIndex;
            this._closestItemPosition = this._elementsCoordinates[closestItemIndex].position;
            // If closest item index is same as dragged item, just remove indicators
            if (closestItemIndex === draggedItemIndex) {
                this._removeAllLines();
                this._removeAllReplaceIndicators();
                return;
            }
            /** Generating line, that shows where the element will be placed, on drop */
            if (this.dropMode === 'group') {
                this._createReplaceIndicator(this._closestItemIndex);
            } else if (this.dropMode === 'shift') {
                this._createLine(this._closestItemIndex, this._closestItemPosition);
            } else {
                this._selectDropModeIndicator(draggedItemIndex, closestItem, closestItemIndex);
            }
        }
    }

    /** Method called, when element is started to be dragged */
    dragStart(index: number): void {
        const draggedItemElement = this._dndItemReference[index].elementRef;
        /** Counting all the element's chords */
        this._elementsCoordinates = this._dndItemReference.map((item: DndItem) =>
            item.getElementCoordinates(this._isBefore(draggedItemElement, item.elementRef), this.gridMode)
        );
    }

    /** Method called, when element is released */
    dragEnd(draggedItemIndex: number): void {
        const items = this.items.slice();
        const replacedItemIndex = this._closestItemIndex;
        const draggedItem = items[draggedItemIndex];

        if (replacedItemIndex || replacedItemIndex === 0) {
            if (draggedItemIndex !== replacedItemIndex) {
                if (draggedItemIndex < replacedItemIndex) {
                    for (let i = draggedItemIndex; i < replacedItemIndex; i++) {
                        items[i] = items[i + 1];
                    }
                } else {
                    for (let i = draggedItemIndex; i > replacedItemIndex; i--) {
                        items[i] = items[i - 1];
                    }
                }

                /** Replacing items */
                items[replacedItemIndex] = draggedItem;

                this.itemsChange.emit(items);
            }

            this.itemDropped.emit({
                replacedItemIndex,
                draggedItemIndex,
                items,
                insertAt: this._closestItemPosition,
                mode: this.dropMode !== 'auto' ? this.dropMode : this._detectedDropMode
            });

            this._removeAllLines();
            this._removeAllReplaceIndicators();

            /** Reset */
            this._elementsCoordinates = [];
            this._closestItemIndex = null;
            this._closestItemPosition = null;
        }
    }

    /** @hidden */
    private _selectDropModeIndicator(
        draggedItemIndex: number,
        closestItem: ElementChord | undefined,
        closestItemIndex: number
    ): void {
        if (!closestItem || !this._dndItemReference[draggedItemIndex]) {
            return;
        }

        let newDetectedDropMode: 'shift' | 'group';
        const draggedElmCoords =
            this._dndItemReference[draggedItemIndex].elementRef.nativeElement.getBoundingClientRect();

        const closestItemBoundaries = getElementBoundaries(closestItem, this.threshold);
        const draggedItemStartCoords = getElementStartCoords(draggedElmCoords, closestItem.position);

        if (
            _between(draggedItemStartCoords.x, closestItemBoundaries.x.start, closestItemBoundaries.x.end) &&
            _between(draggedItemStartCoords.y, closestItemBoundaries.y.start, closestItemBoundaries.y.end)
        ) {
            newDetectedDropMode = 'group';
        } else {
            newDetectedDropMode = 'shift';
        }

        if (newDetectedDropMode === this._detectedDropMode && (!this._linesRemoved || !this._indicatorsRemoved)) {
            return;
        }

        this._detectedDropMode = newDetectedDropMode;

        if (this._detectedDropMode === 'shift') {
            this._createLine(closestItemIndex, this._elementsCoordinates[closestItemIndex].position);
        } else {
            this._createReplaceIndicator(closestItemIndex);
        }
    }

    /** @hidden */
    private _removeAllLines(): void {
        this._linesRemoved = true;
        this.dndItems.forEach((item) => item.removeLine());
    }

    /** @hidden */
    private _removeAllReplaceIndicators(): void {
        this._indicatorsRemoved = true;
        this.dndItems.forEach((item) => item.removeReplaceIndicator());
    }

    /** @hidden */
    private _createLine(closestItemIndex: number, linkPosition: LinkPosition): void {
        this._removeAllLines();
        this._removeAllReplaceIndicators();
        this._linesRemoved = false;
        this._dndItemReference[closestItemIndex].createLine(linkPosition, this.gridMode);
    }

    /** @hidden */
    private _createReplaceIndicator(closestItemIndex: number): void {
        this._removeAllLines();
        this._removeAllReplaceIndicators();
        this._indicatorsRemoved = false;
        this._dndItemReference[closestItemIndex].createReplaceIndicator();
    }

    /** @hidden */
    private _refreshQueryList(): void {
        const refresh$ = merge(this._refresh$, this._onDestroy$);
        this._refresh$.next();

        this._dndItemReference = this.dndItems.toArray();

        this._changeDraggableState(this._draggable);

        this.dndItems.forEach((item, index) => {
            item.moved.pipe(takeUntil(refresh$)).subscribe((position: ElementPosition) => this.onMove(position, index));
            item.started.pipe(takeUntil(refresh$)).subscribe(() => this.dragStart(index));
            item.released.pipe(takeUntil(refresh$)).subscribe(() => this.dragEnd(index));
        });
    }

    /**
     *  @hidden
     * Return information if element is placed before the dragged element
     */
    private _isBefore(draggedElement: ElementRef, targetElement: ElementRef): boolean {
        /** Sometimes the element are not straight in one column, that's why offset is needed */
        const VERTICAL_OFFSET = 20;

        /** Distances from the top of screen */
        const draggedElementBound = <DOMRect>draggedElement.nativeElement.getBoundingClientRect();
        const targetElementBound = <DOMRect>targetElement.nativeElement.getBoundingClientRect();

        if (draggedElementBound.top - targetElementBound.top > VERTICAL_OFFSET) {
            /** If element is higher than the dragged element, it's for sure before */
            return true;
        } else if (targetElementBound.top - draggedElementBound.top > VERTICAL_OFFSET) {
            /** If element is lower than the dragged element, it's for sure after */
            return false;
        } else {
            /** If elements are in same level, the horizontal position decides if it's before/after */
            return draggedElementBound.left - targetElementBound.left > 0;
        }
    }

    /** @hidden */
    private _changeDraggableState(draggable: boolean): void {
        if (this.dndItems) {
            this.dndItems.forEach((item) => {
                item.listDraggable = draggable;
                item.changeCDKDragState();
            });
        }
    }
}

function _isMouseOnElement(element: ElementChord, mousePosition: ElementPosition): boolean {
    const startX = element.x;
    const endX = element.x + element.width;

    const startY = element.y;
    const endY = element.y + element.height;

    return _between(mousePosition.x, startX, endX) && _between(mousePosition.y, startY, endY);
}

function _between(x: number, min: number, max: number): boolean {
    return x >= min && x <= max;
}

interface ElementBoundaries {
    x: {
        start: number;
        end: number;
    };
    y: {
        start: number;
        end: number;
    };
}

function getElementStartCoords(rect: DOMRect, position: ElementChord['position']): { x: number; y: number } {
    return {
        x: position === 'after' ? rect.x + rect.width : rect.x,
        y: position === 'after' ? rect.y + rect.height : rect.y
    };
}

function getElementBoundaries(coordinates: ElementChord, threshold: number): ElementBoundaries {
    const widthOffset = coordinates.width * (coordinates.position === 'after' ? 1 : -1);
    const heightOffset = coordinates.height * (coordinates.position === 'after' ? 1 : -1);
    const xStart = coordinates.position === 'after' ? coordinates.x : coordinates.x + coordinates.width;
    const xEnd = xStart + widthOffset + (widthOffset / 2) * threshold;
    const yStart = coordinates.position === 'after' ? coordinates.y : coordinates.y + coordinates.height;
    const yEnd = yStart + heightOffset + (heightOffset / 2) * threshold;
    return {
        x: {
            start: xStart > xEnd ? xEnd : xStart,
            end: xStart > xEnd ? xStart : xEnd
        },
        y: {
            start: yStart > yEnd ? yEnd : yStart,
            end: yStart > yEnd ? yStart : yEnd
        }
    };
}
