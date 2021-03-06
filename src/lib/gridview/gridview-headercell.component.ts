﻿import { Component, Input, Output, EventEmitter, ElementRef, NgZone, AfterViewInit } from '@angular/core';
import { GridView } from './gridview';
import { DataColumn, ColumnBase } from './gridview-columns';
import { IGridViewComponent } from './gridview-interfaces';
import { FieldType } from './gridview-enums';
import { SortDirection } from '../shared';
import { PipesModule } from '../pipes';
import { ParserService } from '../services/parser.service';

@Component({
	selector: 'gridview-headercell',
	styleUrls: ['../assets/css/styles.css', '../assets/css/icons.css', '../assets/css/buttons.css', 'gridview-headercell.css'],
	template: `
<div class="header-cell" (click)='setSort(column, $event)' [id]='column.getIdentifier()' draggable="true" (dragover)="dragOver($event)" (dragstart)="dragStart($event)" (drop)="drop($event)">
	<div [ngClass]="column.fieldName && column.sortable ? 'sortable-header' : 'non-sortable-header'">
		<div [innerHTML]="column.getCaption()"></div>
	</div>
	<div *ngIf='!parentGridView.printing && column.fieldName && column.sortable' [style.width]="'15px'">
		<div [ngClass]="'sort-arrow top-empty' + (column.sortDirection == sortDirection.None ? ' icon-xx-small icon-arrow-up-white' : '')"></div>
		<div [ngClass]="'sort-arrow bottom-empty' + (column.sortDirection == sortDirection.None ? ' icon-xx-small icon-arrow-down-white' : '')"></div>
		<div [ngClass]="'sort-arrow' + (column.sortDirection == sortDirection.Desc ? ' icon-xx-small icon-arrow-up-white' : '')"></div>
		<div [ngClass]="'sort-arrow' + (column.sortDirection == sortDirection.Asc ? ' icon-xx-small icon-arrow-down-white' : '')"></div>
	</div>
	<div class='resize-div' *ngIf='!parentGridView.printing && column.allowSizing && !last' (mousedown)='startResize($event)'>|</div>
</div>
`
})
export class GridViewHeaderCellComponent implements AfterViewInit {
	@Input() column: DataColumn;
	@Input() parentGridView: GridView;
	@Input() parentGridViewComponent: IGridViewComponent;
	@Input() columnIndex: number;
	@Input() first: boolean;
	@Input() last: boolean;
	@Input() printing: boolean;
	@Output() sortChanged = new EventEmitter<DataColumn>();
	@Output() widthChanged = new EventEmitter<DataColumn>();


	constructor(public elementRef: ElementRef, private zone: NgZone) { }

	ngAfterViewInit() {
		this._parentTH = this.elementRef.nativeElement.parentElement;
	}

	sortDirection = SortDirection;

	setSort(column: DataColumn, event: any) {
		if (!column.sortable) return;

		let maxIndex = -1;
		for (let col of this.parentGridView.getDataColumns()) {
			if (col == column) continue;
			if (col.sortable) {
				if (!event.ctrlKey) {
					col.sortDirection = SortDirection.None;
					col.sortIndex = 0;
				}
				else if (col.sortIndex > maxIndex)
					maxIndex = col.sortIndex;
			}
		}
		if (event.ctrlKey)
			column.sortIndex = maxIndex + 1;

		if (column.sortDirection === undefined) {
			column.sortDirection = SortDirection.Asc;
		}
		else {
			switch (column.sortDirection) {
				case SortDirection.None:
				case SortDirection.Desc:
					column.sortDirection = SortDirection.Asc;
					break;
				case 1:
					column.sortDirection = SortDirection.Desc;
					break;
			}
		}

		if (this.sortChanged)
			this.sortChanged.emit(column);
	}

	private _origMove: any;
	private _origUp: any;
	private _origX: number;
	private _lockedColumns: Array<LockedColumn> = [];
	private _parentTH: any;
	private _origWidth: number;

	// we could set the column widths directly but that will cause grid to redraw which would
	// be expensive, so we'll wait until after
	startResize(evt: any) {
		if (this.elementRef.nativeElement.parentElement.nextElementSibling == null)
			return;

		if (this.parentGridView.printing) return;

		this.elementRef.nativeElement.draggable = false;
		this._origX = evt.clientX;
		this._origMove = window.onmousemove;
		this._origUp = window.onmouseup;
		this._lockedColumns = [];
		this._origWidth = this._parentTH.offsetWidth;
		var next = this._parentTH.nextElementSibling;
		while (next != null) {
			if (next.nextElementSibling == null) {
				// this is our floater
				if (next.style.width != "") {
					// this is a scenario (should be the only scenario) where a column's order was previously changed
					// then it was dragged to become the last, if this is the case we need to lock other columns and clear
					// this one out so it can float
					let tempPrev = next.previousElementSibling;
					while (tempPrev != null) {
						tempPrev.style.width = tempPrev.offsetWidth + 'px';
						tempPrev = tempPrev.previousElementSibling;
					}
				}
				next.style.width = "";
				break;
			}
			else {
				this._lockedColumns.push(new LockedColumn(next.id, next.offsetWidth));
				next = next.nextElementSibling;
			}
		}

		let prev = this._parentTH.previousElementSibling;
		while (prev != null) {
			this._lockedColumns.push(new LockedColumn(prev.id, prev.offsetWidth));
			prev = prev.previousElementSibling;
		}

		window.onmousemove = () => this.resize(event);
		window.onmouseup = () => this.endResize();
	}

	// TODO: test test test
	protected endResize() {
		if (this.parentGridView.printing) return;

		window.onmousemove = this._origMove;
		window.onmouseup = this._origUp;
		this._origX = 0;
		this._origMove = null;
		this._origUp = null;
		if (this._resized) {
			this._resized = false;
			for (let col of this.parentGridView.columns) {
				if (col.getIdentifier() == this.elementRef.nativeElement.firstElementChild.id)
					col.width = this._parentTH.offsetWidth.toString() + 'px';
				else {
					for (let l of this._lockedColumns) {
						let parentTH = document.getElementById(l.parentId);
						if (parentTH.children.length > 0 && col.getIdentifier() == parentTH.children[0].children[0].id) {
							col.width = l.originalWidth.toString() + 'px';
						}
					}
				}
			}

			if (this.parentGridView.saveGridStateToStorage)
				this.parentGridView.saveGridState();

			this.widthChanged.emit(this.column)
		}
	}

	private _resized = false;
	private resize(event: any) {
		if (this._origX && event.buttons == 1) {
			let delta = event.clientX - this._origX;
			this.setColumnSize(this._parentTH, (this._origWidth + delta).toString() + 'px');
			for (let locked of this._lockedColumns) {
				let parentTH = document.getElementById(locked.parentId);
				this.setColumnSize(parentTH, locked.originalWidth);
			}
			this._resized = true;
		}
		else {
			this.endResize();
		}
	}

	private setColumnSize(parentTH: any, width: any) {
		parentTH.style.width = width;
		let idMatch = parentTH.id.match("header_(.*?)_(.*)");
		if (idMatch && idMatch.length == 3) {
			let tds = document.querySelectorAll("[id^='cell_" + idMatch[1] + "_']");
			if (tds) {
				for (let i = 0; i < tds.length; i++) {
					let td = tds[i];
					if (td.id.endsWith(idMatch[2])) {
						td["style"].width = width;
					}
				}
			}
		}
	}

	// IE has to be 'text' for some reason
	private COLUMN_ID = "text";
	dragOver(event) {
		if (!this.parentGridView.allowColumnOrdering) return;
		event.preventDefault();
	}

	dragStart(event) {
		if (!this.parentGridView.allowColumnOrdering) return;
		event.dataTransfer.setData(this.COLUMN_ID, event.currentTarget.id);
	}

	drop(event) {
		if (!this.parentGridView.allowColumnOrdering) return;
		let id = event.dataTransfer.getData(this.COLUMN_ID);
		this.changeColumnOrder(id, event.currentTarget.id);
	}

	private changeColumnOrder(sourceIdentifier: string, targetIdentifier: string) {
		let sourceCol: ColumnBase;
		let targetCol: ColumnBase;

		for (let col of this.parentGridView.columns) {
			if (col.getIdentifier() == sourceIdentifier) {
				sourceCol = col;
				break;
			}
		}

		for (let col of this.parentGridView.columns) {
			if (col.getIdentifier() == targetIdentifier) {
				targetCol = col;
				break;
			}
		}

		if (!sourceCol) return;
		if (!targetCol) return;

		let targetIndex = targetCol.columnIndex;
		if (sourceCol.columnIndex <= targetCol.columnIndex) {
			for (let col of this.parentGridView.columns) {
				if (col.getIdentifier() == sourceCol.getIdentifier()) continue;
				if (col.columnIndex > sourceCol.columnIndex && col.columnIndex <= targetCol.columnIndex)
					col.columnIndex--;
			}
		}
		else {
			for (let col of this.parentGridView.columns) {
				if (col.getIdentifier() == sourceCol.getIdentifier()) continue;
				if (col.columnIndex < sourceCol.columnIndex && col.columnIndex >= targetCol.columnIndex)
					col.columnIndex++;
			}
		}
		sourceCol.columnIndex = targetIndex;

		// THIS SEEMS HACKISH! IN ORDER FOR THE COMPONENT TO REDRAW, IT NEEDS TO DETECT
		// A CHANGE TO THE COLUMNS VARIABLE ITSELF RATHER THAN WHAT'S IN THE COLLECTION
		let sortedColumns: Array<ColumnBase> = [];
		for (let c of this.parentGridView.columns) {
			sortedColumns.push(c);
		}

		this.parentGridView.columns = sortedColumns;
		if (this.parentGridView.saveGridStateToStorage)
			this.parentGridView.saveGridState();
	}
}

class LockedColumn {
	constructor(public parentId: string, public originalWidth: any) { }
}